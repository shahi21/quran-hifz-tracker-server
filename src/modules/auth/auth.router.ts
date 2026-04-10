import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { login, logout, me, refresh, register } from "./auth.controller.js";

export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, me);

