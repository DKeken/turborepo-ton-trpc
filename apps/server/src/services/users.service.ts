import { db, eq, users, userSchema, type User } from "@app/database";
import { BaseService } from "./base/base.service";
import type { EventPayload } from "./base/types";
import { TRPCError } from "@trpc/server";
import { redis } from "../lib/redis";
import type { z } from "zod";

export const createUserSchema = userSchema.pick({
	name: true,
	address: true,
});

export const updateUserSchema = createUserSchema.partial();

export type CreateUserDTO = z.infer<typeof createUserSchema>;
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;

export class UsersService extends BaseService<
	User,
	CreateUserDTO,
	UpdateUserDTO
> {
	private static instance: UsersService;
	private userStatusSubscriptions: Map<
		string,
		Set<(isOnline: boolean) => void>
	> = new Map();

	private constructor() {
		super(users, {
			cacheTTL: 1800, // 30 minutes
			cachePrefix: "users",
			transform: (user) => ({
				...user,
				createdAt: new Date(user.createdAt),
				updatedAt: new Date(user.updatedAt),
			}),
			pubSub: {
				channel: "users",
			},
			validation: {
				create: createUserSchema,
				update: updateUserSchema,
			},
		});

		this.setupUserStatusSubscription();
	}

	private async setupUserStatusSubscription(): Promise<void> {
		await this.subscribe<{ userId: string; isOnline: boolean }>(
			"user:status",
			async ({ userId, isOnline }) => {
				const subscribers = this.userStatusSubscriptions.get(userId);
				if (!subscribers) return;

				for (const callback of subscribers) {
					await callback(isOnline);
				}
			},
		);
	}

	public static getInstance(): UsersService {
		if (!UsersService.instance) {
			UsersService.instance = new UsersService();
		}
		return UsersService.instance;
	}

	protected async handlePubSubEvent(
		payload: EventPayload<User>,
	): Promise<void> {
		const { type, data } = payload;

		switch (type) {
			case "created":
				await this.cache.invalidate("all");
				break;
			case "updated":
				await Promise.all([
					this.cache.invalidate("all"),
					this.cache.invalidate("id", data.id),
				]);
				break;
			case "deleted":
				await Promise.all([
					this.cache.invalidate("all"),
					this.cache.invalidate("id", data.id),
				]);
				break;
		}
	}

	async findByAddress(address: string): Promise<User> {
		try {
			const cacheKey = `users:address:${address}`;
			const cached = await this.cache.get<User>(cacheKey);

			if (cached) {
				return this.transformItem(cached);
			}

			const [user] = await db
				.select()
				.from(users)
				.where(eq(users.address, address))
				.limit(1);

			if (!user) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "User not found",
				});
			}

			const transformed = this.transformItem(user);
			await this.cache.set(cacheKey, transformed);
			return transformed;
		} catch (error) {
			console.error("Error in UsersService.findByAddress:", error);
			throw error;
		}
	}

	subscribeToUserStatus(
		userId: string,
		callback: (isOnline: boolean) => void,
	): () => void {
		let subscribers = this.userStatusSubscriptions.get(userId);

		if (!subscribers) {
			subscribers = new Set();
			this.userStatusSubscriptions.set(userId, subscribers);
		}

		subscribers.add(callback);

		return () => {
			if (subscribers?.delete(callback) && subscribers.size === 0) {
				this.userStatusSubscriptions.delete(userId);
			}
		};
	}

	async updateUserStatus(userId: string, isOnline: boolean): Promise<void> {
		await redis.publish("user:status", JSON.stringify({ userId, isOnline }));
	}
}
