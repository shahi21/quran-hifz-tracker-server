import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  // Optional comma-separated list of allowed origins. If set, it takes precedence over CLIENT_URL.
  CORS_ORIGINS: z.string().optional(),
  // If running behind a reverse proxy (most PaaS), set to "true" so req.ip is correct.
  TRUST_PROXY: z.coerce.boolean().default(false),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(120),
  ADMIN_EMAILS: z.string().optional(),
});

export const env = envSchema.parse(process.env);
