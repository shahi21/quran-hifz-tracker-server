import "dotenv/config";
import { readFileSync } from "fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { surahs } from "./seed/surahs.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run the seed script.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

type AyahSeed = {
  surahId: number;
  ayahNumber: number;
  arabicText: string;
  translation: string;
};

async function main() {
  console.log("Seeding surahs...");
  await prisma.surah.createMany({
    data: surahs,
    skipDuplicates: true,
  });

  console.log("Seeding ayahs...");
  const ayahsJson = readFileSync(new URL("./seed/ayahs.json", import.meta.url), "utf-8");
  const ayahs: AyahSeed[] = JSON.parse(ayahsJson);

  const BATCH_SIZE = 500;
  for (let i = 0; i < ayahs.length; i += BATCH_SIZE) {
    const batch = ayahs.slice(i, i + BATCH_SIZE);
    await prisma.ayah.createMany({ data: batch, skipDuplicates: true });
    console.log(`  Seeded ayahs ${i + 1}–${Math.min(i + BATCH_SIZE, ayahs.length)} of ${ayahs.length}`);
  }

  console.log("Seed complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
