import { redis, subscriber } from "../../lib/redis";
import type { CacheOptions, EventPayload, PubSubOptions } from "./types";

export class CacheService<T> {
	private readonly prefix: string;
	private readonly ttl: number;
	private readonly subscribers: Map<
		string,
		Set<(payload: EventPayload<T>) => void>
	>;

	constructor(
		private readonly entityName: string,
		options?: CacheOptions,
	) {
		this.prefix = options?.prefix ?? entityName;
		this.ttl = options?.ttl ?? 3600; // 1 hour default
		this.subscribers = new Map();
	}

	private getKey(type: string, id?: string): string {
		return `${this.prefix}:${type}${id ? `:${id}` : ""}`;
	}

	async set(key: string, data: T | T[]): Promise<void> {
		await redis.set(key, JSON.stringify(data), "EX", this.ttl);
	}

	async get<R = T>(key: string): Promise<R | null> {
		const data = await redis.get(key);
		return data ? JSON.parse(data) : null;
	}

	async delete(key: string): Promise<void> {
		await redis.del(key);
	}

	async invalidate(type: string, id?: string): Promise<void> {
		const pattern = this.getKey(type, id);
		const keys = await redis.keys(pattern);
		if (keys.length) {
			await redis.del(...keys);
		}
	}

	async publish(
		options: PubSubOptions,
		payload: EventPayload<T>,
	): Promise<void> {
		const { channel, eventTypes } = options;

		if (!eventTypes?.length || eventTypes.includes(payload.type)) {
			await redis.publish(channel, JSON.stringify(payload));
		}
	}

	async subscribe(
		options: PubSubOptions,
		callback: (payload: EventPayload<T>) => void,
	): Promise<void> {
		const { channel, eventTypes } = options;
		let subscribers = this.subscribers.get(channel);

		if (!subscribers) {
			subscribers = new Set();
			this.subscribers.set(channel, subscribers);
		}

		subscribers.add(callback);

		if (subscribers.size === 1) {
			await subscriber.subscribe(channel);
			subscriber.on("message", (ch, message) => {
				if (ch === channel) {
					try {
						const payload = JSON.parse(message) as EventPayload<T>;
						const currentSubscribers = this.subscribers.get(channel);

						if (!currentSubscribers) return;
						if (!eventTypes?.length || eventTypes.includes(payload.type)) {
							for (const subscriber of currentSubscribers) {
								subscriber(payload);
							}
						}
					} catch (error) {
						console.error(
							`Error processing message in ${this.entityName}:`,
							error,
						);
					}
				}
			});
		}
	}

	async unsubscribe(channel: string): Promise<void> {
		const subscribers = this.subscribers.get(channel);
		if (!subscribers?.size) return;

		this.subscribers.delete(channel);
		await subscriber.unsubscribe(channel);
	}

	async clearSubscribers(): Promise<void> {
		for (const [channel] of this.subscribers) {
			await this.unsubscribe(channel);
		}
		this.subscribers.clear();
	}
}
