import { GoalType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { computeGoalsProgress } from "./goals.service.js";

const goalSchema = z.object({
  goalType: z.nativeEnum(GoalType),
  targetAyahs: z.number().int().min(1).optional(),
  targetMinutes: z.number().int().min(1).optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
});

const goalStatusSchema = z.object({
  isCompleted: z.boolean(),
});

export const goalsRouter = Router();

goalsRouter.get("/", requireAuth, async (req, res) => {
  const goals = await computeGoalsProgress(req.user!.id);
  res.json(goals);
});

goalsRouter.post("/", requireAuth, async (req, res) => {
  const payload = goalSchema.parse(req.body);

  const goal = await prisma.goal.create({
    data: {
      userId: req.user!.id,
      ...payload,
    },
  });

  res.status(201).json(goal);
});

goalsRouter.put("/:id/status", requireAuth, async (req, res) => {
  const payload = goalStatusSchema.parse(req.body);
  const goalId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId: req.user!.id },
  });

  if (!goal) {
    return res.status(404).json({ message: "Goal not found." });
  }

  const updated = await prisma.goal.update({
    where: { id: goal.id },
    data: { isCompleted: payload.isCompleted },
  });

  return res.json(updated);
});
