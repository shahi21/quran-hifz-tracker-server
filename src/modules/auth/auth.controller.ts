import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { loginSchema, registerSchema } from "./auth.schema.js";
import { getCurrentUser, loginUser, logoutUser, refreshUserSession, registerUser } from "./auth.service.js";

function parseRefreshToken(req: Request) {
  return req.body.refreshToken ?? req.cookies?.refreshToken;
}

export async function register(req: Request, res: Response) {
  const payload = registerSchema.parse(req.body);
  const session = await registerUser(payload);
  return res.status(StatusCodes.CREATED).json(session);
}

export async function login(req: Request, res: Response) {
  const payload = loginSchema.parse(req.body);
  const session = await loginUser(payload);
  return res.status(StatusCodes.OK).json(session);
}

export async function refresh(req: Request, res: Response) {
  const refreshToken = parseRefreshToken(req);

  if (!refreshToken) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: "Refresh token is required." });
  }

  const session = await refreshUserSession(refreshToken);
  return res.status(StatusCodes.OK).json(session);
}

export async function logout(req: Request, res: Response) {
  const refreshToken = parseRefreshToken(req);

  if (!refreshToken) {
    return res.status(StatusCodes.NO_CONTENT).send();
  }

  await logoutUser(refreshToken);
  return res.status(StatusCodes.NO_CONTENT).send();
}

export async function me(req: Request, res: Response) {
  const user = await getCurrentUser(req.user!.id);
  return res.status(StatusCodes.OK).json(user);
}

