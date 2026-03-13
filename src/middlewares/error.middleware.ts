import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error("Error:", {
    message: err.message,
    stack: err.stack,
    url: _req.url,
    method: _req.method,
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      message: err.message,
      error: err.message,
      code: "APP_ERROR",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
    return;
  }

  res.status(500).json({
    message: "Internal server error",
    error: "Internal server error",
    code: "INTERNAL_ERROR",
    ...(process.env.NODE_ENV === "development" && {
      originalMessage: err.message,
      stack: err.stack,
    }),
  });
};

export const notFoundHandler = (
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  res.status(404).json({
    message: "Route not found",
    error: "Route not found",
    code: "NOT_FOUND",
  });
};
