import { BufferedMessage } from "../interfaces";
import environment from "../config/environment";
import logger from "./logger";
import aiService from "../services/aiService";
import whatsappService from "../services/whatsappService";
import conversationRepository from "../repositories/conversationRepository";
import autoReplyService from "../services/autoReplyService";

class MessageBuffer {
  private readonly buffers: Map<string, BufferedMessage> = new Map();
  /**
   * Add a message to the buffer for a specific user
   */
  public addMessage(userId: string, message: string, timestamp: string): void {
    const existingBuffer = this.buffers.get(userId);

    // Clear existing timeout if there is one
    if (existingBuffer?.timeoutId) {
      clearTimeout(existingBuffer.timeoutId);
    }

    // Create or update buffer
    const buffer = existingBuffer || {
      userId,
      messages: [],
      lastTimestamp: timestamp,
    };
    buffer.messages.push(message);
    buffer.lastTimestamp = timestamp;

    // Set new timeout
    const timeoutId = setTimeout(() => {
      this.processBuffer(userId);
    }, environment.messageBuffer.timeout);

    // Store updated buffer
    this.buffers.set(userId, { ...buffer, timeoutId });

    logger.debug(
      `Added message to buffer for user ${userId}. Buffer size: ${buffer.messages.length}`
    );
  }

  /**
   * Process the buffer for a specific user
   * Processa o buffer depois do timeout, envia à IA e devolve a resposta.
   * Se o auto-responder estiver desativado para esse user, simplesmente limpa o buffer.
   */
  private async processBuffer(userId: string): Promise<void> {
    // Se estiver desativado, limpamos e voltamos
    if (!autoReplyService.isEnabled(userId)) {
      logger.info(
        `Auto-reply desativado para ${userId}, limpando buffer e não respondendo.`
      );
      this.buffers.delete(userId);
      return;
    }

    const buffer = this.buffers.get(userId);
    if (!buffer) return;

    try {
      // Combine all messages in the buffer
      const combinedMessage = buffer.messages.join(" ");
      logger.info(
        `Processing buffer for user ${userId} with ${buffer.messages.length} messages`
      );

      // Get conversation history
      const history = await conversationRepository.getHistory(userId);

      // Send to AI service
      const aiResponse = await aiService.queryAI(
        combinedMessage,
        userId,
        history
      );

      // Store the new conversation entry
      await conversationRepository.addConversation(
        userId,
        combinedMessage,
        aiResponse.response
      );

      // Send response back to WhatsApp
      await whatsappService.sendMessage(userId, aiResponse.response);

      // Clear the buffer
      this.buffers.delete(userId);
    } catch (error) {
      logger.error(`Error processing buffer for user ${userId}:`, error);

      // Attempt to notify the user of the error
      try {
        await whatsappService.sendMessage(
          userId,
          "Desculpe, houve algum problema."
        );
      } catch (sendError) {
        logger.error(
          `Failed to send error message to user ${userId}:`,
          sendError
        );
      }

      // Clear the buffer even on error
      this.buffers.delete(userId);
    }
  }

  /**
   * Force process all pending buffers
   */
  public processAllBuffers(): void {
    for (const userId of this.buffers.keys()) {
      this.processBuffer(userId);
    }
  }
}

export default new MessageBuffer();