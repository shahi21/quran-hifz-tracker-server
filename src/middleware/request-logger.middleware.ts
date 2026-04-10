import type { NextFunction, Request, Response } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    if (req.path === "/health") return;
    const ms = Date.now() - start;
    const ip = req.ip ?? "-";
    // Keep logs compact and predictable for free-tier log limits.
    // eslint-disable-next-line no-console
    console.log(`${res.statusCode} ${req.method} ${req.originalUrl} ${ms}ms ip=${ip}`);
  });

  next();
}

