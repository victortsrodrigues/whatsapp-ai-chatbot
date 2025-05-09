import { Queue, Worker } from 'bullmq';
import { processMessageJob, sendMessageJob, processWebhookJob } from '../workers';
import environment from '../config/environment';
import logger from './logger';
import redisClient from './redisClient';

// Shared Redis connection
export const redisConnection = {
  connection: {
    url: `redis://default:${environment.redis.password}@${environment.redis.host}:${environment.redis.port}`,
  }
};

// Queues
export const webhookProcessingQueue = new Queue('webhookProcessing', {
  ...redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: true
  }
});

export const messageProcessingQueue = new Queue('messageProcessing', {
  ...redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  }
});

export const messageReplyQueue = new Queue('messageReply', redisConnection);

// Workers
export const webhookProcessingWorker = new Worker('webhookProcessing', processWebhookJob, {
  ...redisConnection,
  concurrency: 50
});

export const messageProcessingWorker = new Worker('messageProcessing', processMessageJob, {
  ...redisConnection,
  concurrency: 20
});

export const messageReplyWorker = new Worker('messageReply', sendMessageJob, {
  ...redisConnection,
  concurrency: 30
});

// Error handling for workers
webhookProcessingWorker.on('failed', async (job, err) => {
  if (job && job.attemptsMade === job.opts?.attempts) {
    logger.error(`Webhook processing failed for job ${job.id}:`, err);

    await redisClient.rPush('dead-letters', JSON.stringify(job.data));
  }
});

messageProcessingWorker.on('failed', async (job, err) => {
  if (job && job.attemptsMade === job.opts.attempts) {
    logger.error(`Job ${job.id} falhou após ${job.attemptsMade} tentativas`);
    const userId = job.data.userId;
    logger.error(`Critical processing failure for user ${userId}`);
  }
});

messageReplyWorker.on('failed', async (job, err) => {
  if (job && job.attemptsMade === job.opts.attempts) {
    logger.error(`Message not delivered for ${job.data.userId}:`, job.data.response);

    await redisClient.rPush('dead-letters', JSON.stringify(job.data));
  }
});