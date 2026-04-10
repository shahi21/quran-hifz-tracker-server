import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { getSurahById, listSurahs } from "./surahs.service.js";

export const surahsRouter = Router();

surahsRouter.get("/", requireAuth, async (req, res) => {
  const surahs = await listSurahs(req.user?.id);
  res.json(surahs);
});

surahsRouter.get("/:id", requireAuth, async (req, res) => {
  const surah = await getSurahById(Number(req.params.id), req.user?.id);
  res.json(surah);
});
