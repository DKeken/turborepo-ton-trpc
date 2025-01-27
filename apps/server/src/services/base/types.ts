import type { z } from "zod";

export interface BaseEntity {
	id: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface CacheOptions {
	ttl?: number;
	prefix?: string;
}

export interface PubSubOptions {
	channel: string;
	eventTypes?: Array<EventType>;
}

export type TransformFn<T> = (item: T) => T;

export interface ServiceOptions<T, C = unknown, U = unknown> {
	cacheTTL?: number;
	cachePrefix?: string;
	transform?: TransformFn<T>;
	pubSub?: PubSubOptions;
	validation?: {
		create: z.ZodType<C>;
		update: z.ZodType<U>;
	};
}

export type EventType = "created" | "updated" | "deleted";

export interface EventPayload<T> {
	type: EventType;
	data: T;
	timestamp: number;
}

export interface ValidationError {
	code: string;
	message: string;
	errors: Array<{
		code: string;
		message: string;
		path: Array<string>;
	}>;
}
