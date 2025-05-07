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
    res.send("Olá, eu sou o seu assistente virtual!");
  }

  // Handle incoming webhooks from WhatsApp
  public async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body as WhatsAppWebhookPayload;

      // Process the webhook asynchronously
      setImmediate(() => {
        whatsappService.processWebhook(payload);
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
          message: "O corpo da requisição deve conter um array 'userIds'",
        });
        return;
      }

      const userIds: string[] = req.body.userIds;

      if (userIds.length === 0) {
        res.status(400).json({
          status: "error",
          message: "O array 'userIds' não pode estar vazio",
        });
        return;
      }

      await autoReplyService.disable(userIds);

      res.status(200).json({
        status: "ok",
        message: `Auto-reply desativado para ${userIds.length} usuário(s)`,
        userIds: userIds
      });
    } catch (error) {
      logger.error("Erro ao desativar auto-reply:", error);
      res.status(500).json({
        status: "error",
        message: "Erro interno ao desativar auto-reply",
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
          message: "O corpo da requisição deve conter um array 'userIds'",
        });
        return;
      }

      const userIds: string[] = req.body.userIds;

      if (userIds.length === 0) {
        res.status(400).json({
          status: "error",
          message: "O array 'userIds' não pode estar vazio",
        });
        return;
      }

      await autoReplyService.enable(userIds);

      res.status(200).json({
        status: "ok",
        message: `Auto-reply ativado para ${userIds.length} usuário(s)`,
        userIds: userIds
      });
    } catch (error) {
      logger.error("Erro ao ativar auto-reply:", error);
      res.status(500).json({
        status: "error",
        message: "Erro interno ao ativar auto-reply",
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
      logger.error("Erro ao listar usuários habilitados:", error);
      res.status(500).json({
        status: "error",
        message: "Erro interno ao listar usuários habilitados",
      });
    }
  }
}

export default new WhatsAppController();