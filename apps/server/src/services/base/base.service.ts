import { count, db, eq, type users } from "@app/database";
import { TRPCError } from "@trpc/server";
import { redis, subscriber } from "../../lib/redis";
import { CacheService } from "./cache.service";
import type {
	BaseEntity,
	EventPayload,
	PubSubOptions,
	ServiceOptions,
	TransformFn,
	ValidationError,
} from "./types";
import { z } from "zod";
import type { paginationSchema } from "./schema";

export abstract class BaseService<
	T extends BaseEntity,
	CreateDTO = Partial<T>,
	UpdateDTO = Partial<CreateDTO>,
> {
	protected readonly cache: CacheService<T>;
	protected readonly transform?: TransformFn<T>;
	protected readonly validation?: ServiceOptions<
		T,
		CreateDTO,
		UpdateDTO
	>["validation"];
	private readonly pubSubOptions?: PubSubOptions;
	protected readonly tableName: string;
	private readonly maxRetries = 3;
	private readonly retryDelay = 1000; // 1 second

	constructor(
		protected readonly table: typeof users,
		options: ServiceOptions<T, CreateDTO, UpdateDTO>,
	) {
		this.tableName = table.name.uniqueName || "unknown";

		this.cache = new CacheService<T>(this.tableName, {
			ttl: options.cacheTTL,
			prefix: options.cachePrefix,
		});
		this.transform = options.transform;
		this.pubSubOptions = options.pubSub;
		this.validation = options.validation;

		if (this.pubSubOptions) {
			this.setupPubSub();
		}
	}

	private setupPubSub(): void {
		if (!this.pubSubOptions) return;

		this.cache.subscribe(this.pubSubOptions, (payload) => {
			this.handlePubSubEvent(payload);
		});
	}

	protected abstract handlePubSubEvent(payload: EventPayload<T>): Promise<void>;

	protected transformItem(item: T): T {
		return this.transform ? this.transform(item) : item;
	}

	protected async validateData<S>(
		schema: z.ZodType<S>,
		data: unknown,
	): Promise<S> {
		try {
			const result = await schema.parseAsync(data);
			return result;
		} catch (error) {
			if (error instanceof z.ZodError) {
				const validationError: ValidationError = {
					code: "VALIDATION_ERROR",
					message: "Validation failed",
					errors: error.errors.map((err) => ({
						code: String(err.code),
						message: err.message,
						path: err.path.map(String),
						details: err.message,
					})),
				};
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: JSON.stringify(validationError),
					cause: error,
				});
			}
			throw error;
		}
	}

	protected async publishEvent(
		type: EventPayload<T>["type"],
		data: T,
	): Promise<void> {
		if (!this.pubSubOptions) return;

		const payload: EventPayload<T> = {
			type,
			data,
			timestamp: Date.now(),
		};

		if (this.pubSubOptions !== undefined && "channel" in this.pubSubOptions) {
			await this.retryOperation(() =>
				// biome-ignore lint/style/noNonNullAssertion: Выше проверено, что это не undefined
				redis.publish(this.pubSubOptions!.channel, JSON.stringify(payload)),
			);
		}
	}

	protected async retryOperation<R>(
		operation: () => Promise<R>,
		retries = this.maxRetries,
	): Promise<R> {
		try {
			return await operation();
		} catch (error) {
			if (retries > 0) {
				await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
				return this.retryOperation(operation, retries - 1);
			}
			throw error;
		}
	}

	async findAll(params?: z.infer<typeof paginationSchema>): Promise<{
		items: T[];
		total: number;
		hasMore: boolean;
		page: number;
		totalPages: number;
	}> {
		try {
			const limit = Math.min(params?.limit || 10, 100); // Защита от слишком больших запросов
			const offset = params?.offset || 0;
			const page = Math.floor(offset / limit) + 1;
			const cacheKey = `${this.tableName}:all:${limit}:${offset}`;

			const cached = await this.cache.get<T[]>(cacheKey);

			if (cached) {
				const transformed = cached.map((item) => this.transformItem(item));
				const total = transformed.length;
				const totalPages = Math.ceil(total / limit);
				return {
					items: transformed,
					total,
					hasMore: offset + limit < total,
					page,
					totalPages,
				};
			}

			const query = db.select().from(this.table).orderBy(this.table.createdAt);
			const countQuery = db.select({ count: count() }).from(this.table);

			const [items, [{ count: totalCount }]] = await Promise.all([
				query.limit(limit).offset(offset),
				countQuery,
			]);

			const total = Number(totalCount);
			const totalPages = Math.ceil(total / limit);
			const transformed = items.map((item) =>
				this.transformItem(item as unknown as T),
			);

			const result = {
				items: transformed,
				total,
				hasMore: offset + limit < total,
				page,
				totalPages,
			};

			await this.cache.set(cacheKey, transformed);
			return result;
		} catch (error) {
			console.error(`Error in ${this.tableName}.findAll:`, error);
			throw error;
		}
	}

	async findById(id: string): Promise<T> {
		try {
			const cacheKey = `${this.tableName}:id:${id}`;
			const cached = await this.cache.get<T>(cacheKey);

			if (cached) {
				return this.transformItem(cached);
			}

			const [item] = await db
				.select()
				.from(this.table)
				.where(eq(this.table.id, id))
				.limit(1);

			if (!item) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: `${this.tableName} with id ${id} not found`,
				});
			}

			const transformed = this.transformItem(item as unknown as T);
			await this.cache.set(cacheKey, transformed);
			return transformed;
		} catch (error) {
			console.error(`Error in ${this.tableName}.findById:`, error);
			throw error;
		}
	}

	async create(data: CreateDTO): Promise<T> {
		try {
			let validatedData = data;
			if (this.validation?.create) {
				validatedData = await this.validateData(this.validation.create, data);
			}

			const [item] = await db
				.insert(this.table)
				.values(validatedData as (typeof users)["$inferInsert"])
				.returning();

			const transformed = this.transformItem(item as unknown as T);
			await Promise.all([
				this.cache.invalidate("all"),
				this.publishEvent("created", transformed),
			]);

			return transformed;
		} catch (error) {
			console.error(`Error in ${this.tableName}.create:`, error);
			throw error;
		}
	}

	async update(id: string, data: UpdateDTO): Promise<T> {
		try {
			let validatedData = data;
			if (this.validation?.update) {
				validatedData = await this.validateData(this.validation.update, data);
			}

			const [item] = await db
				.update(this.table)
				.set({
					...(validatedData as (typeof users)["$inferInsert"]),
					updatedAt: new Date(),
				})
				.where(eq(this.table.id, id))
				.returning();

			if (!item) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: `${this.tableName} with id ${id} not found`,
				});
			}

			const transformed = this.transformItem(item as unknown as T);
			await Promise.all([
				this.cache.invalidate("all"),
				this.cache.invalidate("id", id),
				this.publishEvent("updated", transformed),
			]);

			return transformed;
		} catch (error) {
			console.error(`Error in ${this.tableName}.update:`, error);
			throw error;
		}
	}

	async delete(id: string): Promise<void> {
		try {
			const item = await this.findById(id);
			await db.delete(this.table).where(eq(this.table.id, id));

			await Promise.all([
				this.cache.invalidate("all"),
				this.cache.invalidate("id", id),
				this.publishEvent("deleted", item),
			]);
		} catch (error) {
			console.error(`Error in ${this.tableName}.delete:`, error);
			throw error;
		}
	}

	async onDestroy(): Promise<void> {
		if (this.pubSubOptions) {
			await this.cache.unsubscribe(this.pubSubOptions.channel);
		}
	}

	protected async subscribe<P>(
		channel: string,
		handler: (data: P) => void | Promise<void>,
	): Promise<() => Promise<void>> {
		await subscriber.subscribe(channel, async (err, message) => {
			if (err || !message) {
				console.error(`Subscription error in ${this.tableName}:`, err);
				return;
			}
			try {
				const data = JSON.parse(message.toString()) as P;
				await handler(data);
			} catch (error) {
				console.error(
					`Error handling subscription in ${this.tableName}:`,
					error,
				);
			}
		});

		return async () => {
			await subscriber.unsubscribe(channel);
		};
	}
}
