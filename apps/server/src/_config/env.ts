import { z } from "zod";

/**
 * Environment schema validation
 */
const envSchema = z.object({
  /**
   * Server port
   * @default 3333
   */
  PORT: z.preprocess(
    (val) => (val ? parseInt(String(val), 10) : 3333),
    z.number().positive()
  ),

  /**
   * Server host
   * @default "0.0.0.0"
   */
  HOST: z.string().default("0.0.0.0"),

  /**
   * Frontend URL
   * @default "http://localhost:3000"
   */
  FRONTEND_URL: z.string().default("http://localhost:3000"),

  /**
   * Node environment
   * @default "development"
   */
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  /**
   * JWT secret key for token signing and verification
   */
  JWT_SECRET_KEY: z.string(),

  /**
   * Database URL for PostgreSQL connection
   */
  DATABASE_URL: z.string({
    required_error: "DATABASE_URL is required in environment variables",
  }),

  /**
   * Redis URL for connection
   */
  REDIS_URL: z.string({
    required_error: "REDIS_URL is required in environment variables",
  }),

  /**
   * Redis password for authentication
   */
  REDIS_PASSWORD: z.string({
    required_error: "REDIS_PASSWORD is required in environment variables",
  }),
});

/**
 * Environment configuration
 */
export const env = {
  ...envSchema.parse(process.env),
  
  /**
   * Whether the server is running in production
   */
  isProd: process.env.NODE_ENV === "production",

  /**
   * Whether the server is running in development
   */
  isDev: process.env.NODE_ENV !== "production",
};
