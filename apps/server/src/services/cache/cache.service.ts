import { redis } from "../../lib/redis";
import { injectable, inject } from "inversify";
import { TYPES } from "../../__di/types";
import Logger from "@app/logger";

/**
 * Service for handling cache operations
 */
@injectable()
export class CacheService {
  private readonly logger: Logger;

  constructor(@inject(TYPES.LOGGER) logger?: Logger) {
    this.logger = logger || Logger.createLogger({ prefix: "CacheService" });
  }

  /**
   * Get a cached item
   * @param prefix - Cache key prefix
   * @param key - Cache key
   * @returns The cached item or null if not found
   */
  async get<T>(prefix: string, key: string): Promise<T | null> {
    try {
      const cacheKey = `${prefix}:${key}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached) as T;
      }

      return null;
    } catch (error) {
      this.logger.error("Cache get error", error);
      return null;
    }
  }

  /**
   * Set a cached item
   * @param prefix - Cache key prefix
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds
   */
  async set<T>(
    prefix: string,
    key: string,
    value: T,
    ttl = 1800
  ): Promise<void> {
    try {
      const cacheKey = `${prefix}:${key}`;
      await redis.set(cacheKey, JSON.stringify(value), "EX", ttl);
    } catch (error) {
      this.logger.error("Cache set error", error);
    }
  }

  /**
   * Invalidate cache by prefix
   * @param prefix - Cache key prefix
   */
  async invalidateByPrefix(prefix: string): Promise<void> {
    try {
      const keys = await redis.keys(`${prefix}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      this.logger.error("Cache invalidation error", error);
    }
  }

  /**
   * Invalidate specific cache key
   * @param prefix - Cache key prefix
   * @param key - Cache key
   */
  async invalidateKey(prefix: string, key: string): Promise<void> {
    try {
      await redis.del(`${prefix}:${key}`);
    } catch (error) {
      this.logger.error("Cache key invalidation error", error);
    }
  }
}
