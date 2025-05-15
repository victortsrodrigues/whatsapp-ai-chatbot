import request from "supertest";
import { app } from "../../app";
import whatsappService from "../../services/whatsappService";
import autoReplyService from "../../services/autoReplyService";
import {
  messageProcessingQueue,
  messageReplyQueue,
  webhookProcessingQueue,
} from "../../utils/queues";
import { createWebhookPayload } from "./factoryIntegration";
import { testEventsWorkers } from "../../workers";
import { testEventsMessageBuffer } from "../../utils/messageBuffer";
import conversationRepository from "../../repositories/conversationRepository";

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
    jest.spyOn(conversationRepository, 'addConversation');
    const userId = "123456789";
    const firstMessage = "Olá, preciso de informações";
    const secondMessage = "Sobre os quartos disponíveis";
    
    // Enviar primeira mensagem
    const firstPayload = createWebhookPayload(userId, firstMessage);
    await request(app)
      .post("/webhook")
      .send(firstPayload)
      .set("Content-Type", "application/json");
    
    // Enviar segunda mensagem rapidamente (dentro do tempo de buffer)
    const secondPayload = createWebhookPayload(userId, secondMessage);
    const response = await request(app)
      .post("/webhook")
      .send(secondPayload)
      .set("Content-Type", "application/json");
    
    // Verificar resposta imediata
    expect(response.status).toBe(200);
    expect(response.text).toBe("OK");
    
    // Esperar pelo processamento completo
    await new Promise<void>((resolve) => {
      testEventsWorkers.once("messageSent", () => {
        resolve();
      });
      
      setTimeout(() => {
        console.error("Test timed out waiting for messageSent event");
        resolve();
      }, 30000);
    });
    
    // Assert - deve ter sido chamado apenas uma vez com as mensagens combinadas
    expect(whatsappService.sendMessage).toHaveBeenCalledTimes(1);
    expect(whatsappService.sendMessage).toHaveBeenCalledWith(
      "123456789",
      "Esta é uma resposta de teste da IA"
    );
    expect(conversationRepository.addConversation).toHaveBeenCalledWith(
      userId,
      expect.stringContaining("Olá, preciso de informações Sobre os quartos disponíveis"),
      expect.stringContaining("Esta é uma resposta de teste da IA")
    );
  }, 30000);
});
