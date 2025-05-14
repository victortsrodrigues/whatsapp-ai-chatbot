import { BufferedMessage } from "../interfaces";
import environment from "../config/environment";
import logger from "./logger";
import conversationRepository from "../repositories/conversationRepository";
import autoReplyService from "../services/autoReplyService";
import { messageProcessingQueue } from '../utils/queues';
import EventEmitter from 'events';

export const testEventsMessageBuffer = new EventEmitter();

class MessageBuffer {
  private readonly buffers: Map<string, BufferedMessage> = new Map();
  // Add a message to the buffer for a specific user
  public addMessage(userId: string, message: string, timestamp: string): void {
    try {
      const existingBuffer = this.buffers.get(userId);

      if (existingBuffer?.timeoutId) {
        clearTimeout(existingBuffer.timeoutId);
      }

      const buffer = existingBuffer || {
        userId,
        messages: [],
        lastTimestamp: timestamp,
      };

      buffer.messages.push(message);
      buffer.lastTimestamp = timestamp;

      const timeoutId = setTimeout(async () => {
        if (!autoReplyService.isEnabled(userId)) {
          this.buffers.delete(userId);
          testEventsMessageBuffer.emit('messageNotSent', { userId });
          return;
        }

        try {
          const history = await conversationRepository.getHistory(userId);

          // Adiciona o job à fila de processamento
          await messageProcessingQueue.add('process', {
            userId,
            combinedMessage: buffer.messages.join(' '),
            history
          });

        } catch (error) {
          logger.error(`Error queueing message for ${userId}:`, error);
        }

        this.buffers.delete(userId);
      }, environment.messageBuffer.timeout);

      this.buffers.set(userId, { ...buffer, timeoutId });

      logger.debug(`Added message to buffer for user ${userId}. Buffer size: ${buffer.messages.length}`);
    } catch (error) {
      logger.error(`Error adding message to buffer for user ${userId}: ${error}`);
    }
  }
}

export default new MessageBuffer();