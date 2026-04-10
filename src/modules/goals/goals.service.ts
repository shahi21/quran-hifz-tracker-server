import { GoalType } from "@prisma/client";
import dayjs from "dayjs";
import { prisma } from "../../lib/prisma.js";
import { normalizeToDay, startOfWeekMonday } from "../../utils/dates.js";

function getGoalWindow(goalType: GoalType, now: Date) {
  if (goalType === GoalType.DAILY_MEMORIZATION || goalType === GoalType.DAILY_STUDY_TIME) {
    const start = normalizeToDay(now);
    const end = dayjs(start).endOf("day").toDate();
    return { start, end };
  }

  const start = startOfWeekMonday(now);
  const end = dayjs(start).add(6, "day").endOf("day").toDate();
  return { start, end };
}

export async function evaluateAndCompleteGoals(userId: string, now: Date = new Date()) {
  const goals = await prisma.goal.findMany({
    where: { userId, isCompleted: false },
    orderBy: { createdAt: "desc" },
  });

  if (!goals.length) return;

  for (const goal of goals) {
    const { start, end } = getGoalWindow(goal.goalType, now);
    const activity = await prisma.dailyActivity.findMany({
      where: {
        userId,
        activityDate: { gte: start, lte: end },
      },
      select: {
        memorizedAyahs: true,
        studyMinutes: true,
      },
    });

    const memorized = activity.reduce((sum, day) => sum + day.memorizedAyahs, 0);
    const minutes = activity.reduce((sum, day) => sum + day.studyMinutes, 0);

    const currentProgress =
      goal.goalType === GoalType.DAILY_STUDY_TIME || goal.goalType === GoalType.WEEKLY_STUDY_TIME ? minutes : memorized;
    const target = goal.targetMinutes ?? goal.targetAyahs ?? 0;

    await prisma.goal.update({
      where: { id: goal.id },
      data: {
        currentProgress,
        isCompleted: target > 0 ? currentProgress >= target : false,
      },
    });
  }
}

export async function computeGoalsProgress(userId: string, now: Date = new Date()) {
  await evaluateAndCompleteGoals(userId, now);
  return prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
