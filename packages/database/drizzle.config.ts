import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string({
    required_error: "DATABASE_URL is required in environment variables",
  }),
});

const env = envSchema.parse(process.env);

export default defineConfig({
  out: "./drizzle",
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
