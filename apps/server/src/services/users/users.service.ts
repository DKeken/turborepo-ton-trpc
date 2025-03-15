import { injectable, inject } from "inversify";
import Logger from "@app/logger";
import { CacheService } from "@/services/cache/cache.service";
import { UserStatusService } from "@/services/users/user-status.service";
import { TRPCError } from "@trpc/server";
import { type User } from "@app/database";
import {
  CreateUserDTO,
  UpdateUserDTO,
  createUserSchema,
  updateUserSchema,
} from "./dto/user.dto";
import { TYPES } from "@/__di/types";
import { ApiError, ErrorCode } from "@/errors/api-error";
import { UserRepository } from "@/repositories/user.repository";

/**
 * Service for managing users
 */
@injectable()
export class UsersService {
  private static instance: UsersService;
  private readonly logger: Logger;
  private readonly cachePrefix = "users";
  private readonly cacheTTL = 1800; // 30 minutes

  constructor(
    @inject(TYPES.LOGGER) logger?: Logger,
    @inject(TYPES.CACHE_SERVICE) private readonly cacheService?: CacheService,
    @inject(TYPES.USER_STATUS_SERVICE)
    private readonly userStatusService?: UserStatusService,
    @inject(UserRepository) private readonly userRepository?: UserRepository
  ) {
    this.logger = logger || Logger.createLogger({ prefix: "UsersService" });

    if (!this.cacheService) {
      this.logger.warn("Cache service not available, caching will not work");
    }

    if (!this.userStatusService) {
      this.logger.warn(
        "User status service not available, user status updates will not work"
      );
    }

    if (!this.userRepository) {
      this.logger.warn(
        "User repository not available, database operations will not work"
      );
    }
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): UsersService {
    if (!UsersService.instance) {
      UsersService.instance = new UsersService();
    }
    return UsersService.instance;
  }

  /**
   * Transform user data
   * @param user - The user to transform
   * @returns The transformed user
   */
  private transformUser(user: User): User {
    return {
      ...user,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    };
  }

  /**
   * Find user by address
   * @param address - The user address
   * @returns The user
   */
  async findByAddress(address: string): Promise<User> {
    try {
      // Try to get from cache
      const cacheKey = `address:${address}`;
      const cached = await this.cacheService?.get<User>(
        this.cachePrefix,
        cacheKey
      );

      if (cached) {
        return this.transformUser(cached);
      }

      // Get from database
      const user = await this.userRepository?.findByAddress(address);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Transform and cache
      const transformed = this.transformUser(user);
      await this.cacheService?.set(
        this.cachePrefix,
        cacheKey,
        transformed,
        this.cacheTTL
      );

      return transformed;
    } catch (error) {
      this.logger.error("Error in findByAddress", error);
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param id - The user ID
   * @returns The user
   */
  async findById(id: string): Promise<User> {
    try {
      // Try to get from cache
      const cacheKey = `id:${id}`;
      const cached = await this.cacheService?.get<User>(
        this.cachePrefix,
        cacheKey
      );

      if (cached) {
        return this.transformUser(cached);
      }

      // Get from database
      const user = await this.userRepository?.findById(id);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Transform and cache
      const transformed = this.transformUser(user);
      await this.cacheService?.set(
        this.cachePrefix,
        cacheKey,
        transformed,
        this.cacheTTL
      );

      return transformed;
    } catch (error) {
      this.logger.error("Error in findById", error);
      throw error;
    }
  }

  /**
   * Find all users
   * @returns All users
   */
  async findAll(): Promise<User[]> {
    try {
      // Try to get from cache
      const cacheKey = "all";
      const cached = await this.cacheService?.get<User[]>(
        this.cachePrefix,
        cacheKey
      );

      if (cached) {
        return cached.map((user) => this.transformUser(user));
      }

      // Get from database
      const users = (await this.userRepository?.findAll()) || [];

      // Transform and cache
      const transformed = users.map((user) => this.transformUser(user));
      await this.cacheService?.set(
        this.cachePrefix,
        cacheKey,
        transformed,
        this.cacheTTL
      );

      return transformed;
    } catch (error) {
      this.logger.error("Error in findAll", error);
      throw error;
    }
  }

  /**
   * Create a new user
   * @param data - The user data
   * @returns The created user
   */
  async create(data: CreateUserDTO): Promise<User> {
    try {
      // Validate data
      const validatedData = createUserSchema.parse(data);

      // Create in database
      const user = await this.userRepository?.create(validatedData);

      if (!user) {
        throw new ApiError(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Failed to create user"
        );
      }

      // Invalidate cache
      await this.cacheService?.invalidateByPrefix(this.cachePrefix);

      // Transform and return
      return this.transformUser(user);
    } catch (error) {
      this.logger.error("Error in create", error);
      throw error;
    }
  }

  /**
   * Update a user
   * @param id - The user ID
   * @param data - The user data
   * @returns The updated user
   */
  async update(id: string, data: UpdateUserDTO): Promise<User> {
    try {
      // Validate data
      const validatedData = updateUserSchema.parse(data);

      // Update in database
      const user = await this.userRepository?.update(id, validatedData);

      if (!user) {
        throw new ApiError(ErrorCode.NOT_FOUND, "User not found");
      }

      // Invalidate cache
      await Promise.all([
        this.cacheService?.invalidateByPrefix(this.cachePrefix),
        this.cacheService?.invalidateKey(this.cachePrefix, `id:${id}`),
      ]);

      // Transform and return
      return this.transformUser(user);
    } catch (error) {
      this.logger.error("Error in update", error);
      throw error;
    }
  }

  /**
   * Delete a user
   * @param id - The user ID
   * @returns The deleted user
   */
  async delete(id: string): Promise<User> {
    try {
      // Delete from database
      const user = await this.userRepository?.delete(id);

      if (!user) {
        throw new ApiError(ErrorCode.NOT_FOUND, "User not found");
      }

      // Invalidate cache
      await Promise.all([
        this.cacheService?.invalidateByPrefix(this.cachePrefix),
        this.cacheService?.invalidateKey(this.cachePrefix, `id:${id}`),
      ]);

      // Transform and return
      return this.transformUser(user);
    } catch (error) {
      this.logger.error("Error in delete", error);
      throw error;
    }
  }

  /**
   * Subscribe to user status changes
   * @param userId - The user ID
   * @param callback - The callback to invoke when status changes
   * @returns A function to unsubscribe
   */
  subscribeToUserStatus(
    userId: string,
    callback: (isOnline: boolean) => void
  ): () => void {
    if (!this.userStatusService) {
      this.logger.warn(
        "User status service not available, subscription will not work"
      );
      return () => {};
    }

    return this.userStatusService.subscribeToUserStatus(userId, callback);
  }

  /**
   * Update user status
   * @param userId - The user ID
   * @param isOnline - Whether the user is online
   */
  async updateUserStatus(userId: string, isOnline: boolean): Promise<void> {
    if (!this.userStatusService) {
      this.logger.warn(
        "User status service not available, status update will not work"
      );
      return;
    }

    await this.userStatusService.updateUserStatus(userId, isOnline);
  }
}
