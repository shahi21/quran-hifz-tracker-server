import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { verifyAccessToken } from "../lib/tokens.js";

export type AuthUser = {
  id: string;
  role: "USER" | "ADMIN";
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Missing access token." });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
    };
    return next();
  } catch {
    return res.status(StatusCodes.UNAUTHORIZED).json({ message: "Invalid or expired access token." });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Admin access required." });
  }

  return next();
}

