import { injectable } from "inversify";
import { eq, users, type User } from "@app/database";
import { ApiError, ErrorCode } from "@/errors/api-error";
import { db } from "@app/database/db";

/**
 * Repository for user database operations
 */
@injectable()
export class UserRepository {
  constructor() {}

  /**
   * Find user by address
   * @param address - The user address
   * @returns The user or null if not found
   */
  async findByAddress(address: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.address, address))
        .limit(1);

      return user || null;
    } catch (error) {
      throw ApiError.fromError(error);
    }
  }

  /**
   * Find user by ID
   * @param id - The user ID
   * @returns The user or null if not found
   */
  async findById(id: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      return user || null;
    } catch (error) {
      throw ApiError.fromError(error);
    }
  }

  /**
   * Find all users
   * @returns All users
   */
  async findAll(): Promise<User[]> {
    try {
      return await db.select().from(users);
    } catch (error) {
      throw ApiError.fromError(error);
    }
  }

  /**
   * Create a new user
   * @param data - The user data
   * @returns The created user
   */
  async create(data: { address: string } & Partial<Omit<User, "address">>): Promise<User> {
    try {
      const [user] = await db.insert(users).values(data).returning();

      if (!user) {
        throw new ApiError(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Failed to create user"
        );
      }

      return user;
    } catch (error) {
      throw ApiError.fromError(error);
    }
  }

  /**
   * Update a user
   * @param id - The user ID
   * @param data - The user data
   * @returns The updated user
   */
  async update(id: string, data: Partial<User>): Promise<User> {
    try {
      const [user] = await db
        .update(users)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      if (!user) {
        throw new ApiError(ErrorCode.NOT_FOUND, "User not found");
      }

      return user;
    } catch (error) {
      throw ApiError.fromError(error);
    }
  }

  /**
   * Delete a user
   * @param id - The user ID
   * @returns The deleted user
   */
  async delete(id: string): Promise<User> {
    try {
      const [user] = await db.delete(users).where(eq(users.id, id)).returning();

      if (!user) {
        throw new ApiError(ErrorCode.NOT_FOUND, "User not found");
      }

      return user;
    } catch (error) {
      throw ApiError.fromError(error);
    }
  }
}
