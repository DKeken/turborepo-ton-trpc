import { redis } from "../../lib/redis";
import { injectable, inject } from "inversify";
import { TYPES } from "../../__di/types";
import Logger from "@app/logger";

/**
 * Type for message handler function
 */
export type MessageHandler<T = unknown> = (data: T) => Promise<void> | void;

/**
 * Service for handling pub/sub operations
 */
@injectable()
export class PubSubService {
  private readonly logger: Logger;
  private readonly subscriptions: Map<string, Set<MessageHandler>> = new Map();

  constructor(@inject(TYPES.LOGGER) logger?: Logger) {
    this.logger = logger || Logger.createLogger({ prefix: "PubSubService" });
    this.initialize();
  }

  /**
   * Initialize the PubSub service
   */
  private async initialize(): Promise<void> {
    try {
      const subscriber = globalThis.redisSubscriber;
      if (!subscriber) {
        this.logger.error("Redis subscriber not available");
        return;
      }

      subscriber.on("message", (channel: string, message: string) => {
        this.handleMessage(channel, message);
      });

      this.logger.info("PubSub service initialized");
    } catch (error) {
      this.logger.error("Failed to initialize PubSub service", error);
    }
  }

  /**
   * Handle incoming messages
   * @param channel - The channel the message was received on
   * @param message - The message content
   */
  private handleMessage(channel: string, message: string): void {
    try {
      const handlers = this.subscriptions.get(channel);
      if (!handlers || handlers.size === 0) return;

      const data = JSON.parse(message);

      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          this.logger.error(
            `Error in message handler for channel ${channel}`,
            error
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error handling message on channel ${channel}`, error);
    }
  }

  /**
   * Subscribe to a channel
   * @param channel - The channel to subscribe to
   * @param handler - The message handler
   * @returns A function to unsubscribe
   */
  async subscribe<T = unknown>(
    channel: string,
    handler: MessageHandler<T>
  ): Promise<() => void> {
    try {
      const subscriber = globalThis.redisSubscriber;
      if (!subscriber) {
        this.logger.error("Redis subscriber not available");
        throw new Error("Redis subscriber not available");
      }

      let handlers = this.subscriptions.get(channel);

      if (!handlers) {
        handlers = new Set();
        this.subscriptions.set(channel, handlers);

        // Subscribe to the channel in Redis
        await subscriber.subscribe(channel);
        this.logger.info(`Subscribed to channel: ${channel}`);
      }

      handlers.add(handler as MessageHandler);

      // Return unsubscribe function
      return () => {
        this.unsubscribe(channel, handler as MessageHandler);
      };
    } catch (error) {
      this.logger.error(`Failed to subscribe to channel ${channel}`, error);
      throw error;
    }
  }

  /**
   * Unsubscribe from a channel
   * @param channel - The channel to unsubscribe from
   * @param handler - The message handler to remove
   */
  private async unsubscribe(
    channel: string,
    handler: MessageHandler
  ): Promise<void> {
    try {
      const handlers = this.subscriptions.get(channel);
      if (!handlers) return;

      handlers.delete(handler);

      if (handlers.size === 0) {
        this.subscriptions.delete(channel);

        // Unsubscribe from the channel in Redis
        const subscriber = globalThis.redisSubscriber;
        if (subscriber) {
          await subscriber.unsubscribe(channel);
          this.logger.info(`Unsubscribed from channel: ${channel}`);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from channel ${channel}`, error);
    }
  }

  /**
   * Publish a message to a channel
   * @param channel - The channel to publish to
   * @param data - The data to publish
   */
  async publish<T = unknown>(channel: string, data: T): Promise<void> {
    try {
      await redis.publish(channel, JSON.stringify(data));
    } catch (error) {
      this.logger.error(`Failed to publish to channel ${channel}`, error);
      throw error;
    }
  }
}
