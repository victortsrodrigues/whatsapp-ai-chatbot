import logger from "../../utils/logger";
import messageBuffer from "../../utils/messageBuffer";
import whatsappService from "../../services/whatsappService";
import { WhatsAppWebhookPayload } from "../../interfaces/index";
import autoReplyService from "../../services/autoReplyService";
import axios from "axios";
import environment from "../../config/environment";
import { messageReplyQueue } from "../../utils/queues";
import conversationRepository from "repositories/conversationRepository";

jest.mock("axios");
describe("WhatsAppService", () => {
  // Process valid WhatsApp webhook payload with messages
  it("should process messages from a valid WhatsApp webhook payload", async () => {
    // Arrange
    jest.spyOn(logger, "info").mockImplementation();
    jest.spyOn(messageBuffer, "addMessage").mockImplementation();

    const payload: WhatsAppWebhookPayload = {
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
                    from: "123456789",
                    id: "wamid.HBgNNTUxNzk5MTg4NDQ1NxUCABIYFDNBQkM5MEI0RDUyMkNEN0Y5NDQwAA==",
                    timestamp: "1234567890",
                    text: { body: "Hello world" },
                    type: "text",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    // Act
    await whatsappService.processWebhook(payload);

    // Assert
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Received message from 123456789: Hello world")
    );
    expect(messageBuffer.addMessage).toHaveBeenCalledWith(
      "123456789",
      "Hello world",
      "1234567890"
    );
  });

  // Handle non-WhatsApp webhook payloads
  it("should log warning and return early for non-WhatsApp webhook payloads", async () => {
    // Arrange
    jest.spyOn(logger, "warn").mockImplementation();
    jest.spyOn(messageBuffer, "addMessage").mockImplementation();

    const payload: WhatsAppWebhookPayload = {
      object: "instagram",
      entry: [],
    };

    // Act
    await whatsappService.processWebhook(payload);

    // Assert
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("Received non-WhatsApp webhook: instagram")
    );
    expect(messageBuffer.addMessage).not.toHaveBeenCalled();
  });

  it("should process image messages with captions", async () => {
    // Arrange
    jest.spyOn(logger, "info").mockImplementation();
    jest.spyOn(messageBuffer, "addMessage").mockImplementation();

    const payload: WhatsAppWebhookPayload = {
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
                    from: "123456789",
                    id: "wamid.HBgNNTUxNzk5MTg4NDQ1NxUCABIYFDNBQkM5MEI0RDUyMkNEN0Y5NDQwAA==",
                    timestamp: "1234567890",
                    image: { caption: "Image caption" },
                    type: "image",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    // Act
    await whatsappService.processWebhook(payload);

    // Assert
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("Received message from 123456789: Image caption")
    );
    expect(messageBuffer.addMessage).toHaveBeenCalledWith(
      "123456789",
      "Image caption",
      "1234567890"
    );
  });

  it("should enable auto-reply for specific trigger message", async () => {
    // Arrange
    jest.spyOn(logger, "info").mockImplementation();
    jest.spyOn(messageBuffer, "addMessage").mockImplementation();
    jest.spyOn(autoReplyService, "enable").mockImplementation();

    const payload: WhatsAppWebhookPayload = {
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
                    from: "123456789",
                    id: "wamid.HBgNNTUxNzk5MTg4NDQ1NxUCABIYFDNBQkM5MEI0RDUyMkNEN0Y5NDQwAA==",
                    timestamp: "1234567890",
                    text: {
                      body: "vi esse anúncio e gostaria de mais informações",
                    },
                    type: "text",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    // Act
    await whatsappService.processWebhook(payload);

    // Assert
    expect(autoReplyService.enable).toHaveBeenCalledWith(["123456789"]);
  });

  it("should send a message to WhatsApp API with valid parameters", async () => {
    // Arrange
    const to = "1234567890";
    const text = "Test message";

    const axiosPostSpy = jest
      .spyOn(axios, "post")
      .mockResolvedValueOnce({ status: 200, data: {} });
    const loggerInfoSpy = jest.spyOn(logger, "info");
    const loggerDebugSpy = jest.spyOn(logger, "debug");

    // Act
    await whatsappService.sendMessage(to, text);

    // Assert
    expect(axiosPostSpy).toHaveBeenCalledWith(
      environment.whatsapp.apiUrl,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: false,
          body: text,
        },
      },
      expect.any(Object)
    );
    expect(loggerInfoSpy).toHaveBeenCalledWith(
      `Sending message to ${to}: ${text}`
    );
    expect(loggerDebugSpy).toHaveBeenCalledWith(
      "WhatsApp API response status: 200"
    );
  });

  it("should truncate message if it exceeds max length", async () => {
    // Arrange
    const longMessage = "a".repeat(5000); // 5000 characters
    const to = "1234567890";
    const truncatedMessage = longMessage.substring(0, 4096 - 3) + "...";
    const axiosPostSpy = jest
      .spyOn(axios, "post")
      .mockResolvedValueOnce({ status: 200, data: {} });

    // Act
    await whatsappService.sendMessage(to, longMessage);

    // Assert
    expect(axiosPostSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: {
          preview_url: false,
          body: truncatedMessage,
        },
      }),
      expect.any(Object)
    );
  });

  it("should handle rate limiting by enqueuing message for retry", async () => {
    // Arrange
    jest.mock("axios");
    const to = "1234567890";
    const text = "Test message";
    const rateLimitError = {
      response: {
        status: 429,
        headers: { "retry-after": "60" },
        data: { message: "Rate limit exceeded" },
      },
    };

    (axios.post as jest.Mock).mockRejectedValueOnce(rateLimitError);
    jest.spyOn(messageReplyQueue, "add").mockImplementation();
    jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
    // Act & Assert
    await expect(whatsappService.sendMessage(to, text)).rejects.toThrow();
    expect(messageReplyQueue.add).toHaveBeenCalledWith(
      "sendReply",
      { userId: to, response: text },
      expect.objectContaining({
        delay: 60000,
      })
    );
  });

  it("should handle other API errors", async () => {
    // Arrange
    jest.mock("axios");
    const to = "1234567890";
    const text = "Test message";
    const errorResponse = {
      response: {
        status: 400,
        data: { message: "Bad request" },
      },
    };

    (axios.post as jest.Mock).mockRejectedValueOnce(errorResponse);
    jest.spyOn(logger, "error").mockImplementation();

    // Act
    await expect(whatsappService.sendMessage(to, text)).rejects.toThrow(
      "WhatsApp API error: Bad request"
    );
  });

  it("should verify webhook with valid token", async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = "valid_token";
    const result = whatsappService.verifyWebhook(
      "subscribe",
      "valid_token",
      "challenge_code"
    );
    expect(result).toBe("challenge_code");
  });

  it("should reject webhook with invalid token", () => {
    process.env.WHATSAPP_VERIFY_TOKEN = "valid_token";
    const result = whatsappService.verifyWebhook(
      "subscribe",
      "invalid_token",
      "challenge_code"
    );
    expect(result).toBeNull();
  });

  it("should resend the last message when delivery fails", async () => {
    // Arrange
    jest.spyOn(conversationRepository, "getHistory").mockResolvedValueOnce([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
    ]);
    
    // Act
    await (whatsappService as any).resendFailedMessage("987654321");

    // Assert
    expect(conversationRepository.getHistory).toHaveBeenCalledWith("987654321");
    expect(axios.post).toHaveBeenCalled();
  });
});
