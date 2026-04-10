import cookieParser from "cookie-parser";
import cors from "cors";
import "express-async-errors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { rateLimit } from "./middleware/rate-limit.middleware.js";
import { requestLogger } from "./middleware/request-logger.middleware.js";
import { authRouter } from "./modules/auth/auth.router.js";
import { ayahsRouter } from "./modules/ayahs/ayahs.router.js";
import { goalsRouter } from "./modules/goals/goals.router.js";
import { notificationsRouter } from "./modules/notifications/notifications.router.js";
import { revisionsRouter } from "./modules/revisions/revisions.router.js";
import { sessionsRouter } from "./modules/sessions/sessions.router.js";
import { statsRouter } from "./modules/stats/stats.router.js";
import { surahsRouter } from "./modules/surahs/surahs.router.js";
import { usersRouter } from "./modules/users/users.router.js";
import { adminRouter } from "./modules/admin/admin.router.js";

export const app = express();

app.disable("x-powered-by");
if (env.TRUST_PROXY) {
  app.set("trust proxy", 1);
}

const allowedOrigins = (env.CORS_ORIGINS ? env.CORS_ORIGINS.split(",") : [env.CLIENT_URL])
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Allow non-browser requests (like curl, server-to-server).
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    // We don't rely on cookies for auth today, but leaving this on doesn't hurt and
    // lets you move refresh tokens into httpOnly cookies later without breaking CORS.
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(requestLogger);
app.use(rateLimit({ windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.RATE_LIMIT_MAX }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/surahs", surahsRouter);
app.use("/ayahs", ayahsRouter);
app.use("/sessions", sessionsRouter);
app.use("/revisions", revisionsRouter);
app.use("/goals", goalsRouter);
app.use("/stats", statsRouter);
app.use("/notifications", notificationsRouter);
app.use("/admin", adminRouter);

app.use(errorHandler);
