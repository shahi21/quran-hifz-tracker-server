import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { normalizeToDay } from "../../utils/dates.js";

const sessionSchema = z.object({
  sessionDate: z.coerce.date(),
  startSurahId: z.number().int().min(1).max(114),
  startAyah: z.number().int().min(1),
  endSurahId: z.number().int().min(1).max(114),
  endAyah: z.number().int().min(1),
  durationMins: z.number().int().positive(),
  qualityRating: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(500).optional(),
  memorizedAyahs: z.number().int().min(0).default(0),
});

export const sessionsRouter = Router();

sessionsRouter.get("/", requireAuth, async (req, res) => {
  const sessions = await prisma.hifzSession.findMany({
    where: { userId: req.user!.id },
    orderBy: { sessionDate: "desc" },
    take: 20,
  });

  res.json(sessions);
});

sessionsRouter.post("/", requireAuth, async (req, res) => {
  const payload = sessionSchema.parse(req.body);
  const activityDate = normalizeToDay(payload.sessionDate);

  const [session] = await prisma.$transaction([
    prisma.hifzSession.create({
      data: {
        userId: req.user!.id,
        sessionDate: payload.sessionDate,
        startSurahId: payload.startSurahId,
        startAyah: payload.startAyah,
        endSurahId: payload.endSurahId,
        endAyah: payload.endAyah,
        durationMins: payload.durationMins,
        qualityRating: payload.qualityRating,
        notes: payload.notes,
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
        memorizedAyahs: payload.memorizedAyahs,
        studyMinutes: payload.durationMins,
        hifzSessionCount: 1,
      },
      update: {
        memorizedAyahs: { increment: payload.memorizedAyahs },
        studyMinutes: { increment: payload.durationMins },
        hifzSessionCount: { increment: 1 },
      },
    }),
    prisma.userStat.upsert({
      where: { userId: req.user!.id },
      create: {
        userId: req.user!.id,
        totalSessionsLogged: 1,
        totalAyahsMemorized: payload.memorizedAyahs,
      },
      update: {
        totalSessionsLogged: { increment: 1 },
        totalAyahsMemorized: { increment: payload.memorizedAyahs },
      },
    }),
  ]);

  const { evaluateAndCompleteGoals } = await import("../goals/goals.service.js");
  await evaluateAndCompleteGoals(req.user!.id);

  res.status(201).json(session);
});
