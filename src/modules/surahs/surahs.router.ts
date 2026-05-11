import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { getSurahById, listSurahs } from "./surahs.service.js";

export const surahsRouter = Router();
const surahIdParamSchema = z.coerce.number().int().min(1).max(114);

surahsRouter.get("/", requireAuth, async (req, res) => {
  const surahs = await listSurahs(req.user?.id);
  res.json(surahs);
});

surahsRouter.get("/:id", requireAuth, async (req, res) => {
  const id = surahIdParamSchema.parse(req.params.id);
  const surah = await getSurahById(id, req.user?.id);
  res.json(surah);
});
