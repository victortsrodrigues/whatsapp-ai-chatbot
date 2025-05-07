import axios from 'axios';
import { WhatsAppWebhookPayload, ApiError } from '../interfaces';
import environment from '../config/environment';
import logger from '../utils/logger';
import messageBuffer from '../utils/messageBuffer';
import autoReplyService from './autoReplyService';
import conversationRepository from "../repositories/conversationRepository";
import { setTimeout } from 'timers/promises';

class MessageQueue {
  private static readonly MAX_RETRIES = 3;
  private static readonly BACKOFF_FACTOR = 2;
  private static readonly queue: Map<string, { to: string; text: string; attempts: number }> = new Map();

  static async add(to: string, text: string, retryAfter: number, attempt = 1): Promise<void> {
    const key = `${to}-${Date.now()}`;

    this.queue.set(key, { to, text, attempts: attempt });

    await setTimeout(retryAfter * 1000);
    await this.retrySend(key);
  }

  private static async retrySend(key: string): Promise<void> {
    const entry = this.queue.get(key);
    if (!entry) return;

    try {
      const whatsappService = new WhatsAppService();
      await whatsappService.sendMessage(entry.to, entry.text);
      this.queue.delete(key);
    } catch (error) {
      if (entry.attempts < this.MAX_RETRIES && axios.isAxiosError(error)) {
        const retryAfter = Number(error.response?.headers?.['retry-after']) || 60;
        const nextDelay = retryAfter * this.BACKOFF_FACTOR ** entry.attempts;
        await this.add(entry.to, entry.text, nextDelay, entry.attempts + 1);
      }
    }
  }
}

class WhatsAppService {
  private readonly apiUrl: string = environment.whatsapp.apiUrl;
  private readonly apiToken: string = environment.whatsapp.apiToken;

  // Process incoming webhook payload from WhatsApp
  public async processWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
    try {
      if (payload.object !== 'whatsapp_business_account') {
        logger.warn(`Received non-WhatsApp webhook: ${payload.object}`);
        return;
      }

      // Process each entry in the webhook
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field !== 'messages') continue;

          const statuses = change.value.statuses || [];
          for (const status of statuses) {
            if (status.status === 'failed' || status.status === 'unable_to_deliver') {
              logger.warn(`Message ${status.id} failed to deliver to ${status.recipient_id}`);
              await this.resendFailedMessage(status.recipient_id);
            }
          }

          const messages = change.value.messages || [];

          // Process each message
          for (const message of messages) {
            // Only process text messages
            let text: string;

            if (message.text?.body) {
              text = message.text.body;
            } else if (message.image?.caption) {
              text = message.image.caption;
            } else {
              continue;
            }

            const userId = message.from;
            const timestamp = message.timestamp;

            logger.info(`Received message from ${userId}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);

            // Check if the message is a command to disable/enable auto-reply
            if (text.trim().toLowerCase() === 'vi esse anúncio e gostaria de mais informações') {
              logger.info(`Ativando auto-reply para ${userId}`);
              await autoReplyService.enable([userId]);
            }

            // Add message to buffer for processing
            messageBuffer.addMessage(userId, text, timestamp);
          }
        }
      }
    } catch (error) {
      logger.error('Error processing webhook:', error instanceof Error ? error.stack : error);
    }
  }

  // Send a message to a WhatsApp user
  public async sendMessage(to: string, text: string): Promise<void> {
    try {
      const MAX_MESSAGE_LENGTH = 4096;
      if (text.length > MAX_MESSAGE_LENGTH) {
        logger.warn(`Message to ${to} exceeds max length, truncating...`);
        text = text.substring(0, MAX_MESSAGE_LENGTH - 3) + "...";
      }

      logger.info(`Sending message to ${to}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);

      const response = await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: {
            preview_url: false,
            body: text
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiToken}`
          }
        }
      );

      logger.debug(`WhatsApp API response status: ${response.status}`);

    } catch (error) {
      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status ?? 500;
        const errorMessage = error.response?.data?.message ?? error.message;

        if (statusCode === 429) {
          const retryAfter = Number(error.response?.headers?.['retry-after']) || 60;
          logger.warn(`Rate limited. Enqueuing message to ${to}. Retry in ${retryAfter}s`);

          MessageQueue.add(to, text, retryAfter).catch((queueError) => {
            logger.error('Queue processing failed:', queueError);
          });

          throw new Error(`Message enqueued for retry. Next attempt in ${retryAfter}s`);
        } else if (statusCode === 400) {
          logger.error(`WhatsApp API bad request (${statusCode}): ${errorMessage}`, {
            to,
            errorDetails: error.response?.data
          });
        } else {
          logger.error(`WhatsApp API error (${statusCode}): ${errorMessage}`);
        }

        const apiError: ApiError = new Error(`WhatsApp API error: ${errorMessage}`);
        apiError.statusCode = statusCode;
        apiError.details = error.response?.data;

        throw apiError;
      }

      // Handle other errors
      logger.error('Unknown error when calling WhatsApp API:', error);
      throw new Error('Failed to send WhatsApp message');
    }
  }

  // Search for the last message sent to this user
  private async resendFailedMessage(recipientId: string): Promise<void> {
    try {
      const history = await conversationRepository.getHistory(recipientId);

      if (history.length > 0) {
        let lastSystemMessage = '';

        for (let i = history.length - 1; i >= 0; i--) {
          if (history[i].role === 'assistant') {
            lastSystemMessage = history[i].content;
            break;
          }
        }

        if (lastSystemMessage) {
          logger.info(`Resending last message to ${recipientId}`);
          await this.sendMessage(recipientId, lastSystemMessage);
        }
      }
    } catch (error) {
      logger.error(`Error resending message to ${recipientId}:`, error);
    }
  }

  // Verify WhatsApp webhook challenge
  public verifyWebhook(mode: string, token: string, challenge: string): string | null {
    // The token you set up in the WhatsApp developer portal
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
      logger.info('WhatsApp webhook verified');
      return challenge;
    }

    logger.warn('WhatsApp webhook verification failed');
    return null;
  }
}

export default new WhatsAppService();