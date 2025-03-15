import { db } from "@app/database/db";
import type { User } from "@app/database";
import type { AccountInfo } from "@app/auth-config";

/**
 * Context type definition
 */
export interface Context {
  /**
   * Database instance
   */
  db: typeof db;

  /**
   * Authenticated user or null if not authenticated
   */
  user: User | null;

  /**
   * Wallet information or null if not authenticated
   */
  wallet: AccountInfo | null;
}
