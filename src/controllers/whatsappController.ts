import { Request, Response } from "express";
import { WhatsAppWebhookPayload } from "../interfaces";
import whatsappService from "../services/whatsappService";
import aiService from "../services/aiService";
import logger from "../utils/logger";
import autoReplyService from "../services/autoReplyService";
import redisClient from "../utils/redisClient";

class WhatsAppController {

  // Basic message for testing
  public baseMessage(req: Request, res: Response): void {
    res.send("Olá, estou pronto para te ajudar!");
  }

  // Handle incoming webhooks from WhatsApp
  public async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body as WhatsAppWebhookPayload;

      // Process the webhook asynchronously
      process.nextTick(async () => {
        try {
          await whatsappService.processWebhook(payload);
        } catch (error) {
          logger.error("Error processing webhook:", error);
        }
      });

      // Respond quickly to webhook
      res.status(200).send("OK");
    } catch (error) {
      logger.error("Error in webhook handler:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Verify the webhook subscription
  public verifyWebhook(req: Request, res: Response): void {
    try {
      const mode = req.query["hub.mode"] as string;
      const token = req.query["hub.verify_token"] as string;
      const challenge = req.query["hub.challenge"] as string;

      if (!mode || !token) {
        logger.warn("Missing verification parameters");
        res.status(400).send("Missing parameters");
        return;
      }

      const response = whatsappService.verifyWebhook(mode, token, challenge);

      if (response) {
        res.status(200).send(response);
      } else {
        res.status(403).send("Verification failed");
      }
    } catch (error) {
      logger.error("Error in verify webhook:", error);
      res.status(500).send("Internal server error");
    }
  }

  // Health check endpoint for the API
  public async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Check the AI service health
      const aiHealthy = await aiService.checkHealth();

      // Check Redis health
      const redisHealthy = await redisClient.isHealthy();

      res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        services: {
          api: "healthy",
          ai: aiHealthy ? "healthy" : "unhealthy",
          redis: redisHealthy ? "healthy" : "unhealthy"
        },
      });
    } catch (error) {
      logger.error("Health check failed:", error);

      res.status(500).json({
        status: "error",
        timestamp: new Date().toISOString(),
        message: "Health check failed",
      });
    }
  }

  // Disables auto-responder for specified users
  public async disableAutoReply(req: Request, res: Response): Promise<void> {
    try {
      if (!req.body.userIds || !Array.isArray(req.body.userIds)) {
        res.status(400).json({
          status: "error",
          message: "The request body must contain a 'userIds' array",
        });
        return;
      }

      const userIds: string[] = req.body.userIds;

      if (userIds.length === 0) {
        res.status(400).json({
          status: "error",
          message: "The 'userIds' array cannot be empty",
        });
        return;
      }

      await autoReplyService.disable(userIds);

      res.status(200).json({
        status: "ok",
        message: `Auto-reply disabled for ${userIds.length} user(s)`,
        userIds: userIds
      });
    } catch (error) {
      logger.error("Error disabling auto-reply:", error);
      res.status(500).json({
        status: "error",
        message: "Internal error when disabling auto-reply",
      });
    }
  }

  // Reactivates autoresponder for specified users
  public async enableAutoReply(req: Request, res: Response): Promise<void> {
    try {
      // Checks if the body contains the userIds property and if it is an array
      if (!req.body.userIds || !Array.isArray(req.body.userIds)) {
        res.status(400).json({
          status: "error",
          message: "The request body must contain a 'userIds' array",
        });
        return;
      }

      const userIds: string[] = req.body.userIds;

      if (userIds.length === 0) {
        res.status(400).json({
          status: "error",
          message: "The 'userIds' array cannot be empty",
        });
        return;
      }

      await autoReplyService.enable(userIds);

      res.status(200).json({
        status: "ok",
        message: `Auto-reply enabled for ${userIds.length} user(s)`,
        userIds: userIds
      });
    } catch (error) {
      logger.error("Error enabling auto-reply:", error);
      res.status(500).json({
        status: "error",
        message: "Internal error when enabling auto-reply",
      });
    }
  }

  // List all users with auto-reply enabled
  public async listEnabledUsers(req: Request, res: Response): Promise<void> {
    try {
      const enabledUsers = await autoReplyService.getAllEnabled();

      res.status(200).json({
        status: "ok",
        count: enabledUsers.length,
        userIds: enabledUsers
      });
    } catch (error) {
      logger.error("Error listing enabled users:", error);
      res.status(500).json({
        status: "error",
        message: "Internal error while listing enabled users",
      });
    }
  }
}

export default new WhatsAppController();