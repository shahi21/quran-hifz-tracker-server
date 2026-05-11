-- CreateTable
CREATE TABLE "Ayah" (
    "id" SERIAL NOT NULL,
    "surahId" INTEGER NOT NULL,
    "ayahNumber" INTEGER NOT NULL,
    "arabicText" TEXT NOT NULL,
    "translation" TEXT NOT NULL,

    CONSTRAINT "Ayah_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ayah_surahId_ayahNumber_key" ON "Ayah"("surahId", "ayahNumber");

-- AddForeignKey
ALTER TABLE "Ayah" ADD CONSTRAINT "Ayah_surahId_fkey" FOREIGN KEY ("surahId") REFERENCES "Surah"("id") ON DELETE CASCADE ON UPDATE CASCADE;
