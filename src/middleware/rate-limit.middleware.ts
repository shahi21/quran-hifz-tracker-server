import type { NextFunction, Request, Response } from "express";

type RateLimitOptions = {
  max: number;
  windowMs: number;
};

type Bucket = {
  resetAt: number;
  count: number;
};

export function rateLimit(options: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();

  function getKey(req: Request) {
    // If TRUST_PROXY is set in Express, req.ip will be derived from X-Forwarded-For.
    const ip = req.ip ?? "unknown";
    // Keep it per-route-group to avoid one noisy endpoint starving everything.
    return `${ip}:${req.baseUrl || ""}`;
  }

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
    // Don't rate limit health checks.
    if (req.path === "/health") return next();

    const now = Date.now();
    const key = getKey(req);
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { resetAt: now + options.windowMs, count: 1 });
      res.setHeader("RateLimit-Limit", String(options.max));
      return next();
    }

    bucket.count += 1;
    res.setHeader("RateLimit-Limit", String(options.max));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, options.max - bucket.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > options.max) {
      return res.status(429).json({ message: "Too many requests. Please try again shortly." });
    }

    return next();
  };
}

