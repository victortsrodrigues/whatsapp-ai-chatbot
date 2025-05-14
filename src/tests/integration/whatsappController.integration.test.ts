import request from "supertest";
import { app } from "../../app";
import whatsappService from "../../services/whatsappService";
import autoReplyService from "../../services/autoReplyService";
import { WhatsAppWebhookPayload } from "../../interfaces";
import {
  messageProcessingQueue,
  messageReplyQueue,
  webhookProcessingQueue,
} from "../../utils/queues";
import { createWebhookPayload } from "./factoryIntegration";
import { testEventsWorkers } from "../../workers";
import { testEventsMessageBuffer } from "../../utils/messageBuffer";

// Mock do serviço AI para não fazer chamadas externas
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
      // Limpar filas antes de cada teste
      await webhookProcessingQueue.obliterate({ force: true });
      await messageProcessingQueue.obliterate({ force: true });
      await messageReplyQueue.obliterate({ force: true });

      // Resetar mocks
      jest.clearAllMocks();

      // Garantir que o autoReply está habilitado para o usuário de teste
      await autoReplyService.enable(["123456789"]);
    } catch (error) {
      console.error("Error in test setup:", error);
    }
  }, 10000);

  afterEach(async () => {
    // Limpar qualquer estado específico do teste
    jest.clearAllMocks();
  });

  it("should process a webhook and send a response message", async () => {
    // Arrange
    jest.spyOn(whatsappService, "sendMessage").mockResolvedValue();
    const userId = "123456789";
    const userMessage = "Olá, preciso de ajuda!";
    const webhookPayload = createWebhookPayload(userId, userMessage);

    // Enviar requisição para o endpoint webhook
    const response = await request(app)
      .post("/webhook")
      .send(webhookPayload)
      .set("Content-Type", "application/json");

    // Verificar se a resposta foi OK
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
  }, 15000);

  it("should not process messages for disabled users", async () => {
    // Arrange
    jest.spyOn(whatsappService, "sendMessage").mockResolvedValue();
    const userId = "987654321";
    const userMessage = "Esta mensagem não deve ser processada";
    const webhookPayload = createWebhookPayload(userId, userMessage);

    // Garantir que o usuário está desabilitado
    await autoReplyService.disable([userId]);

    // Act
    const response = await request(app)
      .post("/webhook")
      .send(webhookPayload)
      .set("Content-Type", "application/json");

    // Verificar resposta imediata
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
  }, 15000);
});
