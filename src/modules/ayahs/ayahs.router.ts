import { AyahStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

const ayahSchema = z.object({
  surahId: z.number().int().min(1).max(114),
  ayahNumber: z.number().int().min(1),
  status: z.nativeEnum(AyahStatus),
  confidenceScore: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(500).optional(),
});

export const ayahsRouter = Router();

ayahsRouter.put("/progress", requireAuth, async (req, res) => {
  const payload = ayahSchema.parse(req.body);

  const existing = await prisma.ayahProgress.findUnique({
    where: {
      userId_surahId_ayahNumber: {
        userId: req.user!.id,
        surahId: payload.surahId,
        ayahNumber: payload.ayahNumber,
      },
    },
  });

  const record = await prisma.ayahProgress.upsert({
    where: {
      userId_surahId_ayahNumber: {
        userId: req.user!.id,
        surahId: payload.surahId,
        ayahNumber: payload.ayahNumber,
      },
    },
    create: {
      ...payload,
      userId: req.user!.id,
      dateMemorized: payload.status === AyahStatus.MEMORIZED ? new Date() : undefined,
      lastRevisedAt:
        payload.status === AyahStatus.REVISED || payload.status === AyahStatus.WEAK ? new Date() : undefined,
      revisionCount: payload.status === AyahStatus.REVISED || payload.status === AyahStatus.WEAK ? 1 : 0,
    },
    update: {
      status: payload.status,
      confidenceScore: payload.confidenceScore,
      notes: payload.notes,
      dateMemorized: payload.status === AyahStatus.MEMORIZED ? new Date() : payload.status === AyahStatus.NOT_STARTED ? null : undefined,
      lastRevisedAt:
        payload.status === AyahStatus.REVISED || payload.status === AyahStatus.WEAK ? new Date() : undefined,
      revisionCount:
        payload.status === AyahStatus.REVISED || payload.status === AyahStatus.WEAK ? { increment: 1 } : undefined,
    },
  });

  let memDiff = 0;
  if (payload.status === AyahStatus.MEMORIZED && existing?.status !== AyahStatus.MEMORIZED) {
    memDiff = 1;
  } else if (payload.status !== AyahStatus.MEMORIZED && existing?.status === AyahStatus.MEMORIZED) {
    memDiff = -1;
  }

  // Daily memorization totals are tracked via session logging.
  // Ayah status updates still drive lifetime memorized/in-progress stats below.

  const [memorizedCount, inProgressCount] = await Promise.all([
    prisma.ayahProgress.count({ where: { userId: req.user!.id, status: AyahStatus.MEMORIZED } }),
    prisma.ayahProgress.count({ where: { userId: req.user!.id, status: AyahStatus.IN_PROGRESS } }),
  ]);

  await prisma.userStat.upsert({
    where: { userId: req.user!.id },
    create: {
      userId: req.user!.id,
      totalAyahsMemorized: memorizedCount,
      ayahsInProgress: inProgressCount,
    },
    update: {
      totalAyahsMemorized: memorizedCount,
      ayahsInProgress: inProgressCount,
    },
  });

  const { evaluateAndCompleteGoals } = await import("../goals/goals.service.js");
  await evaluateAndCompleteGoals(req.user!.id);

  res.json(record);
});
