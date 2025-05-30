import { Job } from 'bullmq';
import aiService from './services/aiService';
import conversationRepository from './repositories/conversationRepository';
import { messageReplyQueue } from './utils/queues';
import whatsappService from './services/whatsappService';
import logger from './utils/logger';
import EventEmitter from 'events';

export const testEventsWorkers = new EventEmitter();

export const processWebhookJob = async (job: Job) => {
  try {
    const payload = job.data;
    await whatsappService.processWebhook(payload);
  } catch (error) {
    logger.error("Error processing webhook job:", error);
    throw error;
  }
};

export const processMessageJob = async (job: Job) => {
  const { userId, combinedMessage, history } = job.data;

  try {
    const aiResponse = await aiService.queryAI(combinedMessage, userId, history);
    await conversationRepository.addConversation(userId, combinedMessage, aiResponse.response);

    await messageReplyQueue.add('sendReply', { 
      userId, 
      response: aiResponse.response 
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 }
    });

  } catch (error) {
    logger.error(`Job ${job.id} failed for user ${userId}:`, error);

    if (job.attemptsMade === (job.opts?.attempts ?? 3)) {
      await messageReplyQueue.add('sendError', {
        userId,
        response: "Desculpe, estamos com problemas técnicos. Por favor, tente novamente mais tarde."
      }, {
        attempts: 2,
        backoff: { type: 'fixed', delay: 5000 }
      });
    }

    throw error;
  }
};

export const sendMessageJob = async (job: Job) => {
  const { userId, response } = job.data;

  try {
    await whatsappService.sendMessage(userId, response);
    testEventsWorkers.emit('messageSent', { userId, response });
  } catch (error) {
    logger.error(`Failed to send error message to ${userId}:`, error);

    if (job.attemptsMade === (job.opts?.attempts ?? 2)) {
      logger.error(`Critical undeliverable message for ${userId}:`, response);
    }

    throw error;
  }
};