import { userSchema, type User } from "@app/database";
import type { z } from "zod";

/**
 * Schema for creating a user
 */
export const createUserSchema = userSchema.pick({
  name: true,
  address: true,
});

/**
 * Schema for updating a user
 */
export const updateUserSchema = createUserSchema.partial();

/**
 * Type for creating a user
 */
export type CreateUserDTO = z.infer<typeof createUserSchema>;

/**
 * Type for updating a user
 */
export type UpdateUserDTO = z.infer<typeof updateUserSchema>;

/**
 * Type for user response
 */
export type UserResponseDTO = User;
