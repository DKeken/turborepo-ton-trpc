import { injectable, inject } from "inversify";
import { TYPES } from "@/__di/types";
import Logger from "@app/logger";
import { PubSubService } from "@/services/pubsub/pubsub.service";

/**
 * Interface for user status data
 */
export interface UserStatusData {
  userId: string;
  isOnline: boolean;
}

/**
 * Service for handling user online status
 */
@injectable()
export class UserStatusService {
  private readonly logger: Logger;
  private readonly userStatusSubscriptions: Map<
    string,
    Set<(isOnline: boolean) => void>
  > = new Map();
  private static instance: UserStatusService;

  constructor(
    @inject(TYPES.LOGGER) logger?: Logger,
    @inject(TYPES.PUBSUB_SERVICE) private readonly pubSubService?: PubSubService
  ) {
    this.logger =
      logger || Logger.createLogger({ prefix: "UserStatusService" });

    if (this.pubSubService) {
      this.setupUserStatusSubscription();
    } else {
      this.logger.warn(
        "PubSub service not available, user status updates will not work"
      );
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): UserStatusService {
    if (!UserStatusService.instance) {
      UserStatusService.instance = new UserStatusService();
    }
    return UserStatusService.instance;
  }

  /**
   * Setup subscription for user status updates
   */
  private async setupUserStatusSubscription(): Promise<void> {
    try {
      await this.pubSubService?.subscribe<UserStatusData>(
        "user:status",
        async ({ userId, isOnline }) => {
          const subscribers = this.userStatusSubscriptions.get(userId);
          if (!subscribers) return;

          for (const callback of subscribers) {
            try {
              await callback(isOnline);
            } catch (error) {
              this.logger.error("Error in user status callback", error);
            }
          }
        }
      );

      this.logger.info("User status subscription setup complete");
    } catch (error) {
      this.logger.error("Failed to setup user status subscription", error);
    }
  }

  /**
   * Subscribe to user status changes
   * @param userId - The user ID to subscribe to
   * @param callback - The callback to invoke when status changes
   * @returns A function to unsubscribe
   */
  subscribeToUserStatus(
    userId: string,
    callback: (isOnline: boolean) => void
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

  /**
   * Update user status
   * @param userId - The user ID to update
   * @param isOnline - Whether the user is online
   */
  async updateUserStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      await this.pubSubService?.publish<UserStatusData>("user:status", {
        userId,
        isOnline,
      });
      this.logger.info(
        `User ${userId} status updated to ${isOnline ? "online" : "offline"}`
      );
    } catch (error) {
      this.logger.error("Failed to update user status", error);
      throw error;
    }
  }
}
