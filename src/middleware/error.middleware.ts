import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { ZodError } from "zod";

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: "Validation failed.",
      issues: error.flatten(),
    });
  }

  if (error instanceof Error) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: error.message,
    });
  }

  return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
    message: "Something went wrong.",
  });
}

