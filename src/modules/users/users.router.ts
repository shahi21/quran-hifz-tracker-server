import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const profileSchema = z.object({
  name: z.string().min(2).optional(),
  timezone: z.string().optional(),
  preferredReminderTime: z.string().optional(),
  preferredTheme: z.enum(["light", "dark"]).optional(),
});

export const usersRouter = Router();

usersRouter.get("/profile", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      timezone: true,
      preferredReminderTime: true,
      preferredTheme: true,
      notificationPreference: true,
    },
  });

  res.json(user);
});

usersRouter.patch("/profile", requireAuth, async (req, res) => {
  const payload = profileSchema.parse(req.body);
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: payload,
  });
  res.json(user);
});

