import { BufferedMessage } from "../interfaces";
import environment from "../config/environment";
import logger from "./logger";
import aiService from "../services/aiService";
import whatsappService from "../services/whatsappService";
import conversationRepository from "../repositories/conversationRepository";
import autoReplyService from "../services/autoReplyService";
import axios from "axios";

class MessageBuffer {
  private readonly buffers: Map<string, BufferedMessage> = new Map();
  // Add a message to the buffer for a specific user
  public addMessage(userId: string, message: string, timestamp: string): void {
    try {
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
    } catch (error) {
      logger.error(
        `Error adding message to buffer for user ${userId}: ${error}`
      );
    }
  }

  /**
   * Process the buffer for a specific user
   * Processes the buffer after the timeout, sends it to the AI and returns the response.
   * If auto-responder is disabled for that user, simply clears the buffer.
   */
  private async processBuffer(userId: string, retryCount = 0): Promise<void> {
    const MAX_RETRIES = 2;

    if (!autoReplyService.isEnabled(userId)) {
      logger.info(
        `Auto-reply disabled for ${userId}, clearing buffer and not responding.`
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

      const history = await conversationRepository.getHistory(userId);

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
      if (error instanceof Error && error.message.includes('indisponível')) { // Mensagem do fallback
        await whatsappService.sendMessage(
          userId, 
          "Desculpe, nosso sistema está ocupado. Por favor, tente novamente em alguns minutos."
        );
        this.buffers.delete(userId);
        return;
      }

      logger.error(`Error processing buffer for user ${userId}:`, error instanceof Error ? error.stack : error);

      if (retryCount < MAX_RETRIES && this.isRetryableError(error)) {
        const backoff = Math.pow(2, retryCount) * 1000; // Exponential backoff
        logger.info(`Retrying processing for user ${userId} in ${backoff}ms (attempt ${retryCount + 1})`);

        setTimeout(() => {
          this.processBuffer(userId, retryCount + 1);
        }, backoff);
        return;
    }

      // Attempt to notify the user of the error
      try {
        await whatsappService.sendMessage(
          userId,
          "Desculpe, estamos com problemas técnicos no momento. Um atendente entrará em contato em breve."
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

  // Novo método para determinar se um erro pode ter retry
  private isRetryableError(error: unknown): boolean {
    // Erros de rede ou timeouts geralmente podem ser retentados
    if (axios.isAxiosError(error)) {
      // Códigos 5xx, timeout, ou erro de conexão
      return error.code === 'ECONNRESET' || 
            error.code === 'ETIMEDOUT' || 
            (error.response?.status !== undefined && error.response.status >= 500);
    }

    // Customize com outros tipos de erros que podem ser retentados
    return false;
  }

  // Force process all pending buffers
  public processAllBuffers(): void {
    for (const userId of this.buffers.keys()) {
      this.processBuffer(userId);
    }
  }
}

export default new MessageBuffer();