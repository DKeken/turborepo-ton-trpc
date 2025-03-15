import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import type { z } from "zod";
import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  address: text("address").notNull().unique(),
});

export const userSchema = createSelectSchema(users);

export const userRoleEnumSchema = createSelectSchema(userRoleEnum);

export type User = z.infer<typeof userSchema>;
export type UserRole = z.infer<typeof userRoleEnumSchema>;
