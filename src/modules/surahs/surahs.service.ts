import { prisma } from "../../lib/prisma.js";

export async function listSurahs(userId?: string) {
  const surahs = await prisma.surah.findMany({
    orderBy: { id: "asc" },
  });

  if (!userId) return surahs;

  const progress = await prisma.ayahProgress.findMany({
    where: { userId, status: "MEMORIZED" },
    select: { surahId: true },
  });

  const counts: Record<number, number> = {};
  for (const p of progress) {
    counts[p.surahId] = (counts[p.surahId] || 0) + 1;
  }

  return surahs.map(surah => ({
    ...surah,
    memorizedCount: counts[surah.id] || 0
  }));
}

export async function getSurahById(id: number, userId?: string) {
  const surah = await prisma.surah.findUnique({
    where: { id },
    include: {
      ayahs: {
        orderBy: { ayahNumber: "asc" },
        select: { ayahNumber: true, arabicText: true, translation: true },
      },
    },
  });

  if (!surah) {
    throw new Error("Surah not found.");
  }

  const ayahProgress = userId
    ? await prisma.ayahProgress.findMany({
        where: { surahId: id, userId },
        orderBy: { ayahNumber: "asc" },
      })
    : [];

  return { ...surah, ayahProgress };
}

