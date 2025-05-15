import request from "supertest";
import { app } from "../../app";
import whatsappService from "../../services/whatsappService";
import autoReplyService from "../../services/autoReplyService";
import {
  messageProcessingQueue,
  messageReplyQueue,
  webhookProcessingQueue,
} from "../../utils/queues";
import {
  createWebhookPayload,
  createImageWebhookPayload,
} from "./factoryIntegration";
import { testEventsWorkers } from "../../workers";
import { testEventsMessageBuffer } from "../../utils/messageBuffer";
import conversationRepository from "../../repositories/conversationRepository";
import logger from "../../utils/logger";

jest.mock("../../services/aiService", () => ({
  __esModule: true,
  default: {
    checkHealth: jest.fn().mockResolvedValue(true),
    queryAI: jest.fn().mockResolvedValue({
      response: "Esta é uma resposta de teste da IA",
      requires_action: false,
    }),
  },
}));

describe("WhatsApp Integration Flow", () => {
  beforeEach(async () => {
    try {
      await webhookProcessingQueue.obliterate({ force: true });
      await messageProcessingQueue.obliterate({ force: true });
      await messageReplyQueue.obliterate({ force: true });

      jest.clearAllMocks();

      await autoReplyService.enable(["123456789"]);
    } catch (error) {
      console.error("Error in test setup:", error);
    }
  }, 10000);

  afterEach(async () => {
    jest.clearAllMocks();
  });

  it("should process a webhook and send a response message", async () => {
    // Arrange
    jest.spyOn(whatsappService, "sendMessage").mockResolvedValue();
    const userId = "123456789";
    const userMessage = "Olá, preciso de ajuda!";
    const webhookPayload = createWebhookPayload(userId, userMessage);

    // Act
    const response = await request(app)
      .post("/webhook")
      .send(webhookPayload)
      .set("Content-Type", "application/json");

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toBe("OK");

    // Wait for the webhook job to be processed
    await new Promise<void>((resolve) => {
      testEventsWorkers.once("messageSent", () => {
        resolve();
      });

      // Fallback
      setTimeout(() => {
        console.error("Test timed out waiting for messageSent event");
        resolve();
      }, 30000);
    });

    // Assert
    expect(whatsappService.sendMessage).toHaveBeenCalledTimes(1);
    expect(whatsappService.sendMessage).toHaveBeenCalledWith(
      "123456789",
      "Esta é uma resposta de teste da IA"
    );
  }, 30000);

  it("should not process messages for disabled users", async () => {
    // Arrange
    jest.spyOn(whatsappService, "sendMessage").mockResolvedValue();
    const userId = "987654321";
    const userMessage = "Esta mensagem não deve ser processada";
    const webhookPayload = createWebhookPayload(userId, userMessage);

    await autoReplyService.disable([userId]);

    // Act
    const response = await request(app)
      .post("/webhook")
      .send(webhookPayload)
      .set("Content-Type", "application/json");

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toBe("OK");

    // Wait for the webhook job to be processed
    await new Promise<void>((resolve) => {
      testEventsMessageBuffer.once("messageNotSent", () => {
        resolve();
      });

      // Fallback
      setTimeout(() => {
        console.error("Test timed out waiting for messageNotSent event");
        resolve();
      }, 30000);
    });

    // Assert
    expect(whatsappService.sendMessage).not.toHaveBeenCalled();
  }, 30000);

  it("should handle multiple messages from the same user", async () => {
    // Arrange
    jest.spyOn(whatsappService, "sendMessage").mockResolvedValue();
    jest.spyOn(conversationRepository, "addConversation");
    const userId = "123456789";
    const firstMessage = "Olá, preciso de informações";
    const secondMessage = "Sobre os quartos disponíveis";

    // Send first message
    const firstPayload = createWebhookPayload(userId, firstMessage);
    await request(app)
      .post("/webhook")
      .send(firstPayload)
      .set("Content-Type", "application/json");

    // send second message
    const secondPayload = createWebhookPayload(userId, secondMessage);
    const response = await request(app)
      .post("/webhook")
      .send(secondPayload)
      .set("Content-Type", "application/json");

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toBe("OK");

    // Wait for the webhook job to be processed
    await new Promise<void>((resolve) => {
      testEventsWorkers.once("messageSent", () => {
        resolve();
      });

      setTimeout(() => {
        console.error("Test timed out waiting for messageSent event");
        resolve();
      }, 30000);
    });

    // Assert
    expect(whatsappService.sendMessage).toHaveBeenCalledTimes(1);
    expect(whatsappService.sendMessage).toHaveBeenCalledWith(
      "123456789",
      "Esta é uma resposta de teste da IA"
    );
    expect(conversationRepository.addConversation).toHaveBeenCalledWith(
      userId,
      expect.stringContaining(
        "Olá, preciso de informações Sobre os quartos disponíveis"
      ),
      expect.stringContaining("Esta é uma resposta de teste da IA")
    );
  }, 30000);

  it("should handle webhook verification correctly", async () => {
    // Arrange
    const mode = "subscribe";
    const token = "dummy-token-for-testing";
    const challenge = "challenge_code_123";

    // Act
    const response = await request(app).get("/webhook").query({
      "hub.mode": mode,
      "hub.verify_token": token,
      "hub.challenge": challenge,
    });

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toBe(challenge);
  }, 30000);

  it("should reject webhook verification with invalid token", async () => {
    // Arrange
    const mode = "subscribe";
    const token = "invalid_token";
    const challenge = "challenge_code_123";

    // Act
    const response = await request(app).get("/webhook").query({
      "hub.mode": mode,
      "hub.verify_token": token,
      "hub.challenge": challenge,
    });

    // Assert
    expect(response.status).toBe(403);
    expect(response.text).toBe("Verification failed");
  }, 30000);

  it("should handle health check endpoint correctly", async () => {
    // Act
    const response = await request(app)
      .get("/health")
      .set("Content-Type", "application/json");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "ok");
    expect(response.body).toHaveProperty("services");
  }, 30000);

  it("should enable auto-reply for users via API", async () => {
    // Arrange
    const userId = "555123456";
    await autoReplyService.disable([userId]);

    // Act
    const response = await request(app)
      .post("/chatbot/enable")
      .send({ userIds: [userId] })
      .set("Content-Type", "application/json");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "ok");

    const isEnabled = autoReplyService.isEnabled(userId);
    expect(isEnabled).toBe(true);
  }, 30000);

  it("should disable auto-reply for users via API", async () => {
    // Arrange
    const userId = "555123456";

    await autoReplyService.enable([userId]);

    // Act
    const response = await request(app)
      .post("/chatbot/disable")
      .send({ userIds: [userId] })
      .set("Content-Type", "application/json");

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "ok");

    const isEnabled = autoReplyService.isEnabled(userId);
    expect(isEnabled).toBe(false);
  }, 30000);

  it("should handle special command to enable auto-reply", async () => {
    // Arrange
    jest.spyOn(whatsappService, "sendMessage").mockResolvedValue();
    const userId = "987654321";
    const specialCommand = "vi esse anúncio e gostaria de mais informações";
    const webhookPayload = createImageWebhookPayload(userId, specialCommand);
    await autoReplyService.disable([userId]);

    // Act
    const response = await request(app)
      .post("/webhook")
      .send(webhookPayload)
      .set("Content-Type", "application/json");

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toBe("OK");

    // Wait for the webhook job to be processed
    await new Promise<void>((resolve) => {
      testEventsWorkers.once("messageSent", () => {
        resolve();
      });

      // Fallback
      setTimeout(() => {
        console.error("Test timed out waiting for messageSent event");
        resolve();
      }, 30000);
    });

    // Assert
    const isEnabled = autoReplyService.isEnabled(userId);
    expect(isEnabled).toBe(true);
    expect(whatsappService.sendMessage).toHaveBeenCalledTimes(1);
  }, 30000);

  it("should re-enqueue the message on rate limit (429)", async () => {
    // Arrange
    jest.spyOn(whatsappService, "sendMessage").mockRejectedValueOnce({
      response: { status: 429, headers: { "retry-after": "60" } },
    });
    jest.spyOn(messageReplyQueue, "add");

    const userId = "123456789";
    const userMessage = "Mensagem que será re-enfileirada";
    const webhookPayload = createWebhookPayload(userId, userMessage);

    // Act
    const response = await request(app)
      .post("/webhook")
      .send(webhookPayload)
      .set("Content-Type", "application/json");

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toBe("OK");

    // Wait for the webhook job to be processed and error to be handled
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 5000);
    });

    // Assert
    expect(messageReplyQueue.add).toHaveBeenCalledWith(
      "sendReply",
      { userId, response: "Esta é uma resposta de teste da IA" },
      expect.objectContaining({
        attempts: 3,
        backoff: { delay: 1000, type: "exponential" },
      })
    );
  }, 30000);

  it("should log an error for bad request (400)", async () => {
    // Arrange
    jest.spyOn(whatsappService, "sendMessage").mockRejectedValueOnce({
      response: { status: 400, data: { message: "Bad Request" } },
    });
    jest.spyOn(logger, "error");

    const userId = "123456789";
    const userMessage = "Mensagem inválida";
    const webhookPayload = createWebhookPayload(userId, userMessage);

    // Act
    const response = await request(app)
      .post("/webhook")
      .send(webhookPayload)
      .set("Content-Type", "application/json");

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toBe("OK");

    // Wait for the webhook job to be processed and error to be handled
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 5000);
    });

    // Assert
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to send error message to 123456789"),
      expect.objectContaining({
        response: { status: 400, data: { message: "Bad Request" } },
      })
    );
  }, 30000);

  it("should log an error for generic server error (500)", async () => {
    // Arrange
    jest.spyOn(whatsappService, "sendMessage").mockRejectedValue({
      response: { status: 500, data: { message: "Internal Server Error" } },
    });
    jest.spyOn(logger, "error");

    const userId = "123456789";
    const userMessage = "Mensagem que falhará";
    const webhookPayload = createWebhookPayload(userId, userMessage);

    // Act
    const response = await request(app)
      .post("/webhook")
      .send(webhookPayload)
      .set("Content-Type", "application/json");

    // Assert
    expect(response.status).toBe(200);
    expect(response.text).toBe("OK");

    // Wait for the webhook job to be processed and error to be handled
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 5000);
    });

    // Assert
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Failed to send error message to 123456789"),
      expect.objectContaining({
        response: { status: 500, data: { message: "Internal Server Error" } },
      })
    );
  }, 30000);
});
