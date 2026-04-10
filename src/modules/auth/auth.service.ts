import { UserRole } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { compareValue, hashValue, signAccessToken, signRefreshToken, verifyRefreshToken } from "../../lib/tokens.js";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function buildSession(userId: string, email: string, role: UserRole) {
  const accessToken = signAccessToken({ sub: userId, email, role });
  const refreshToken = signRefreshToken({ sub: userId, email, role });
  const tokenHash = await hashValue(refreshToken);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: addDays(new Date(), 7),
    },
  });

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      timezone: true,
      preferredReminderTime: true,
      preferredTheme: true,
    },
  });

  return { user, accessToken, refreshToken };
}

export async function registerUser(input: { name: string; email: string; password: string }) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new Error("An account with this email already exists.");
  }

  const passwordHash = await hashValue(input.password);
  const adminEmails = new Set(
    (env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  const role = adminEmails.has(input.email.trim().toLowerCase()) ? UserRole.ADMIN : UserRole.USER;

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role,
      userStat: { create: {} },
      notificationPreference: { create: {} },
    },
  });

  return buildSession(user.id, user.email, user.role);
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user || !(await compareValue(input.password, user.passwordHash))) {
    throw new Error("Invalid email or password.");
  }

  return buildSession(user.id, user.email, user.role);
}

export async function refreshUserSession(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  const storedTokens = await prisma.refreshToken.findMany({
    where: {
      userId: payload.sub,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  let matchingTokenId: string | null = null;

  for (const storedToken of storedTokens) {
    if (await compareValue(refreshToken, storedToken.tokenHash)) {
      matchingTokenId = storedToken.id;
      break;
    }
  }

  if (!matchingTokenId) {
    throw new Error("Refresh token is invalid.");
  }

  await prisma.refreshToken.update({
    where: { id: matchingTokenId },
    data: { revokedAt: new Date() },
  });

  return buildSession(payload.sub, payload.email, payload.role);
}

export async function logoutUser(refreshToken: string) {
  const payload = verifyRefreshToken(refreshToken);
  const storedTokens = await prisma.refreshToken.findMany({
    where: {
      userId: payload.sub,
      revokedAt: null,
    },
  });

  for (const storedToken of storedTokens) {
    if (await compareValue(refreshToken, storedToken.tokenHash)) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });
      break;
    }
  }
}

export async function getCurrentUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      timezone: true,
      preferredReminderTime: true,
      preferredTheme: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
