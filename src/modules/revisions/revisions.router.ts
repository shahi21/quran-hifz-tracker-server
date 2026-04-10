import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { normalizeToDay } from "../../utils/dates.js";

const revisionSchema = z.object({
  revisionDate: z.coerce.date(),
  surahId: z.number().int().min(1).max(114),
  startAyah: z.number().int().min(1),
  endAyah: z.number().int().min(1),
  durationMins: z.number().int().positive(),
  accuracyRating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(500).optional(),
});

export const revisionsRouter = Router();

revisionsRouter.get("/", requireAuth, async (req, res) => {
  const revisions = await prisma.revisionSession.findMany({
    where: { userId: req.user!.id },
    orderBy: { revisionDate: "desc" },
    take: 20,
  });

  res.json(revisions);
});

revisionsRouter.post("/", requireAuth, async (req, res) => {
  const payload = revisionSchema.parse(req.body);
  const activityDate = normalizeToDay(payload.revisionDate);
  const revisedAyahs = payload.endAyah - payload.startAyah + 1;

  const [revision] = await prisma.$transaction([
    prisma.revisionSession.create({
      data: {
        userId: req.user!.id,
        ...payload,
      },
    }),
    prisma.dailyActivity.upsert({
      where: {
        userId_activityDate: {
          userId: req.user!.id,
          activityDate,
        },
      },
      create: {
        userId: req.user!.id,
        activityDate,
        revisedAyahs,
        studyMinutes: payload.durationMins,
        revisionCount: 1,
      },
      update: {
        revisedAyahs: { increment: revisedAyahs },
        studyMinutes: { increment: payload.durationMins },
        revisionCount: { increment: 1 },
      },
    }),
    prisma.userStat.upsert({
      where: { userId: req.user!.id },
      create: {
        userId: req.user!.id,
        totalRevisionsLogged: 1,
      },
      update: {
        totalRevisionsLogged: { increment: 1 },
      },
    }),
  ]);

  const { evaluateAndCompleteGoals } = await import("../goals/goals.service.js");
  await evaluateAndCompleteGoals(req.user!.id);

  res.status(201).json(revision);
});
