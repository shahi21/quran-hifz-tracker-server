import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const preferencesSchema = z.object({
  reminderTime: z.string().optional(),
  inAppEnabled: z.boolean(),
});

export const notificationsRouter = Router();

notificationsRouter.get("/", requireAuth, async (req, res) => {
  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId: req.user!.id },
  });

  res.json(preferences);
});

notificationsRouter.put("/", requireAuth, async (req, res) => {
  const payload = preferencesSchema.parse(req.body);
  const preferences = await prisma.notificationPreference.upsert({
    where: { userId: req.user!.id },
    create: {
      userId: req.user!.id,
      ...payload,
      emailEnabled: false,
    },
    update: { ...payload, emailEnabled: false },
  });

  res.json(preferences);
});
