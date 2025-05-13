import { WhatsAppWebhookPayload } from "../../../interfaces/index";
import { Request, Response } from "express";
import { webhookProcessingQueue } from "../../../utils/queues";
import whatsappController from "../../../controllers/whatsappController";
import whatsappService from "../../../services/whatsappService";
import logger from "../../../utils/logger";
import aiService from "../../../services/aiService";
import redisClient from "../../../utils/redisClient";
import autoReplyService from "services/autoReplyService";

describe("handleWebhook", () => {
  it("should return welcome message with 200 status", () => {
    // Arrange
    const req = {} as Request;
    const res = {
      send: jest.fn(),
    } as unknown as Response;

    // Act
    whatsappController.baseMessage(req, res);

    // Assert
    expect(res.send).toHaveBeenCalledWith("Olá, estou pronto para te ajudar!");
  });

  it("should add payload to queue and return 200 OK", async () => {
    // Arrange
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "1201341484809635",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "15556414208",
                  phone_number_id: "683084891545974",
                },
                contacts: [
                  {
                    profile: { name: "Victor Rodrigues" },
                    wa_id: "5517991884457",
                  },
                ],
                messages: [
                  {
                    from: "5517991884457",
                    id: "wamid.HBgNNTUxNzk5MTg4NDQ1NxUCABIYFDNBQkM5MEI0RDUyMkNEN0Y5NDQwAA==",
                    timestamp: "1747061753",
                    text: { body: "test message" },
                    type: "text",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    } as WhatsAppWebhookPayload;
    const req = {
      body: payload,
    } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    jest.spyOn(webhookProcessingQueue, "add").mockResolvedValue({} as any);

    // Act
    await whatsappController.handleWebhook(req, res);

    // Assert
    expect(webhookProcessingQueue.add).toHaveBeenCalledWith(
      "processWebhook",
      payload,
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
      }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith("OK");
  });

  it("should return challenge when verification succeeds", () => {
    // Arrange
    const req = {
      query: {
        "hub.mode": "subscribe",
        "hub.verify_token": "valid_token",
        "hub.challenge": "challenge_code",
      },
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    jest
      .spyOn(whatsappService, "verifyWebhook")
      .mockReturnValue("challenge_code");

    // Act
    whatsappController.verifyWebhook(req, res);

    // Assert
    expect(whatsappService.verifyWebhook).toHaveBeenCalledWith(
      "subscribe",
      "valid_token",
      "challenge_code"
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith("challenge_code");
  });

  it("should handle errors and return 500 status", async () => {
    // Arrange
    const req = {
      body: {},
    } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    const error = new Error("Test error");
    jest.spyOn(webhookProcessingQueue, "add").mockRejectedValue(error);
    jest.spyOn(logger, "error").mockImplementation();

    // Act
    await whatsappController.handleWebhook(req, res);

    // Assert
    expect(logger.error).toHaveBeenCalledWith(
      "Error in webhook handler:",
      error
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });

  it("should return 400 when mode or token parameters are missing", () => {
    // Arrange
    const req = {
      query: {
        "hub.challenge": "challenge_code",
      },
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    jest.spyOn(logger, "warn").mockImplementation();

    // Act
    whatsappController.verifyWebhook(req, res);

    // Assert
    expect(logger.warn).toHaveBeenCalledWith("Missing verification parameters");
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Missing parameters");
  });

  it("should return 403 when verification fails", () => {
    // Arrange
    const req = {
      query: {
        "hub.mode": "subscribe",
        "hub.verify_token": "invalid_token",
        "hub.challenge": "challenge_code",
      },
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    jest.spyOn(whatsappService, "verifyWebhook").mockReturnValue(null);

    // Act
    whatsappController.verifyWebhook(req, res);

    // Assert
    expect(whatsappService.verifyWebhook).toHaveBeenCalledWith(
      "subscribe",
      "invalid_token",
      "challenge_code"
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith("Verification failed");
  });

  it('should return healthy status when all services are healthy', async () => {
    // Arrange
    const req = {} as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    jest.spyOn(aiService, 'checkHealth').mockResolvedValue(true);
    jest.spyOn(redisClient, 'isHealthy').mockResolvedValue(true);

    // Act
    await whatsappController.healthCheck(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      timestamp: expect.any(String),
      services: {
        api: 'healthy',
        ai: 'healthy',
        redis: 'healthy',
      },
    });
  });

  it('should return unhealthy status when AI service is unhealthy', async () => {
    // Arrange
    const req = {} as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    jest.spyOn(aiService, 'checkHealth').mockResolvedValue(false);
    jest.spyOn(redisClient, 'isHealthy').mockResolvedValue(true);

    // Act
    await whatsappController.healthCheck(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      status: 'ok',
      timestamp: expect.any(String),
      services: {
        api: 'healthy',
        ai: 'unhealthy',
        redis: 'healthy',
      },
    });
  });

  it('should enable auto-reply for valid users IDs', async () => {
    // Arrange
    const req = {
      body: {
        userIds: ["user1", "user2"],
      },
    } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    jest.spyOn(autoReplyService, "enable").mockResolvedValue();

    // Act
    await whatsappController.enableAutoReply(req, res);

    // Assert
    expect(autoReplyService.enable).toHaveBeenCalledWith(["user1", "user2"]); 
  });

  it('should return 400 for missing userIds', async () => {
    // Arrange
    const req = {
      body: {},
    } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    // Act
    await whatsappController.enableAutoReply(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      status: "error",
      message: "The request body must contain a 'userIds' array",
    });
  });
});
