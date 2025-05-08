import { Request, Response, NextFunction } from "express";
import { WhatsAppWebhookPayload } from "../interfaces";
import logger from "../utils/logger";

// Validate WhatsApp webhook payload
export const validateWebhookPayload = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const payload = req.body as WhatsAppWebhookPayload;

    // Check for required fields
    if (!payload) {
      throw new Error("Missing request body");
    }

    if (!payload.object) {
      throw new Error("Missing object field in webhook payload");
    }

    if (!Array.isArray(payload.entry)) {
      throw new Error("Missing or invalid entry array in webhook payload");
    }

    // Continue to route handler
    next();
  } catch (error) {
    logger.warn("Invalid webhook payload:", error);
    res.status(400).json({
      error: {
        message:
          error instanceof Error ? error.message : "Invalid webhook payload",
        status: 400,
      },
    });
  }
};

// Validate content type middleware
export const validateContentType = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const contentType = req.headers["content-type"];

  if (req.method !== "GET" && !contentType?.includes("application/json")) {
    logger.warn(`Invalid content type: ${contentType}`);

    res.status(415).json({
      error: {
        message: "Content-Type must be application/json",
        status: 415,
      },
    });
    return;
  }

  next();
};
