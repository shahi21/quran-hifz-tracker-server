import dayjs from "dayjs";
import { Router } from "express";
import type { DailyActivity } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.middleware.js";

function computeLevel(xp: number) {
  // Level curve: level 1 starts at 0xp. Next level at 250 * level^2.
  const safeXp = Math.max(0, Math.floor(xp));
  const level = Math.floor(Math.sqrt(safeXp / 250)) + 1;
  const baseXp = 250 * (level - 1) * (level - 1);
  const nextXp = 250 * level * level;
  const span = Math.max(1, nextXp - baseXp);
  const progress = Math.min(1, Math.max(0, (safeXp - baseXp) / span));
  return { xp: safeXp, level, baseXp, nextXp, progress };
}

type Achievement = {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  unlocked: boolean;
};

type Quest = {
  id: string;
  title: string;
  done: boolean;
};

function calculateStreak(dates: string[]) {
  if (!dates.length) return { current: 0, longest: 0 };

  const normalized = [...new Set(dates)].sort();
  let longest = 1;
  let running = 1;

  for (let index = 1; index < normalized.length; index += 1) {
    const diff = dayjs(normalized[index]).diff(dayjs(normalized[index - 1]), "day");
    if (diff === 1) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 1;
    }
  }

  let current = normalized.length ? 1 : 0;
  for (let index = normalized.length - 1; index > 0; index -= 1) {
    const diff = dayjs(normalized[index]).diff(dayjs(normalized[index - 1]), "day");
    if (diff === 1) {
      current += 1;
    } else {
      break;
    }
  }

  return { current, longest };
}

export const statsRouter = Router();

statsRouter.get("/dashboard", requireAuth, async (req, res) => {
  const [userStat, goals, activity, memTotal, inProgTotal, sessionsTotal, revisionsTotal] = await Promise.all([
    prisma.userStat.findUnique({ where: { userId: req.user!.id } }),
    prisma.goal.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: "desc" }, take: 4 }),
    prisma.dailyActivity.findMany({ where: { userId: req.user!.id }, orderBy: { activityDate: "asc" } }),
    prisma.ayahProgress.count({ where: { userId: req.user!.id, status: "MEMORIZED" } }),
    prisma.ayahProgress.count({ where: { userId: req.user!.id, status: "IN_PROGRESS" } }),
    prisma.hifzSession.count({ where: { userId: req.user!.id } }),
    prisma.revisionSession.count({ where: { userId: req.user!.id } }),
  ]);

  const streak = calculateStreak(activity.map((item) => dayjs(item.activityDate).format("YYYY-MM-DD")));
  const last7 = activity.slice(-7);
  const weekMinutes = last7.reduce((sum, item) => sum + item.studyMinutes, 0);
  const weekAyahs = last7.reduce((sum, item) => sum + item.memorizedAyahs + item.revisedAyahs, 0);

  const todayStart = dayjs().startOf("day").toDate();
  const todayEnd = dayjs().endOf("day").toDate();
  const todayActivity =
    activity.find((item) => item.activityDate >= todayStart && item.activityDate <= todayEnd) ?? null;

  const xp =
    memTotal * 10 +
    revisionsTotal * 12 +
    sessionsTotal * 8 +
    inProgTotal * 2 +
    streak.current * 5 +
    Math.floor(weekMinutes / 10) * 3;

  const level = computeLevel(xp);

  const achievements: Achievement[] = [
    {
      id: "first_session",
      title: "First Log",
      description: "Log your first hifz session.",
      target: 1,
      progress: sessionsTotal,
      unlocked: sessionsTotal >= 1,
    },
    {
      id: "first_revision",
      title: "Protector",
      description: "Log your first revision session.",
      target: 1,
      progress: revisionsTotal,
      unlocked: revisionsTotal >= 1,
    },
    {
      id: "streak_7",
      title: "Seven Days",
      description: "Build a 7-day streak.",
      target: 7,
      progress: streak.current,
      unlocked: streak.current >= 7,
    },
    {
      id: "memorized_100",
      title: "Century",
      description: "Reach 100 memorized ayahs.",
      target: 100,
      progress: memTotal,
      unlocked: memTotal >= 100,
    },
    {
      id: "weekly_60m",
      title: "Hourglass",
      description: "Study 60 minutes this week.",
      target: 60,
      progress: weekMinutes,
      unlocked: weekMinutes >= 60,
    },
    {
      id: "weekly_50_ayahs",
      title: "Momentum",
      description: "Complete 50 ayahs (memorize + revise) this week.",
      target: 50,
      progress: weekAyahs,
      unlocked: weekAyahs >= 50,
    },
  ];

  const quests: Quest[] = [
    {
      id: "today_hifz",
      title: "Log a hifz session today",
      done: (todayActivity?.hifzSessionCount ?? 0) > 0,
    },
    {
      id: "today_revision",
      title: "Log a revision today",
      done: (todayActivity?.revisionCount ?? 0) > 0,
    },
    {
      id: "today_20m",
      title: "Study 20 minutes today",
      done: (todayActivity?.studyMinutes ?? 0) >= 20,
    },
  ];

  res.json({
    overview: {
      totalAyahsMemorized: memTotal,
      ayahsInProgress: inProgTotal,
      totalSessionsLogged: sessionsTotal,
      totalRevisionsLogged: revisionsTotal ?? userStat?.totalRevisionsLogged ?? 0,
      currentStreak: streak.current,
      longestStreak: streak.longest,
    },
    gamification: {
      xp: level.xp,
      level: level.level,
      baseXp: level.baseXp,
      nextXp: level.nextXp,
      progress: level.progress,
      achievements,
      quests,
    },
    weeklyProgress: activity.slice(-7).map((item: DailyActivity) => ({
      date: item.activityDate,
      ayahs: item.memorizedAyahs,
      minutes: item.studyMinutes,
    })),
    monthlyProgress: activity.slice(-30).map((item: DailyActivity) => ({
      date: item.activityDate,
      ayahs: item.memorizedAyahs + item.revisedAyahs,
      minutes: item.studyMinutes,
    })),
    goals,
    recentActivity: activity.slice(-10).reverse(),
  });
});

statsRouter.get("/calendar", requireAuth, async (req, res) => {
  const month = Number(req.query.month ?? dayjs().month() + 1);
  const year = Number(req.query.year ?? dayjs().year());
  const start = dayjs(`${year}-${String(month).padStart(2, "0")}-01`).startOf("month").toDate();
  const end = dayjs(start).endOf("month").toDate();

  const activity = await prisma.dailyActivity.findMany({
    where: {
      userId: req.user!.id,
      activityDate: { gte: start, lte: end },
    },
    orderBy: { activityDate: "asc" },
  });

  const streak = calculateStreak(activity.map((item: DailyActivity) => dayjs(item.activityDate).format("YYYY-MM-DD")));

  res.json({ month, year, streak, activity });
});
