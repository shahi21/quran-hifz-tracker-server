import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAdmin, requireAuth } from "../../middleware/auth.middleware.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireAdmin);

adminRouter.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      userStat: true,
    },
    take: 50,
  });

  res.json(users);
});

