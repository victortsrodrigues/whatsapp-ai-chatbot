import { Queue, Worker } from 'bullmq';
import { processMessageJob, sendMessageJob } from '../workers';
import environment from '../config/environment';
import logger from './logger';
import redisClient from './redisClient';

// Conexão compartilhada
export const redisConnection = {
  connection: {
    url: `redis://default:${environment.redis.password}@${environment.redis.host}:${environment.redis.port}`,
  }
};

// Filas
export const messageProcessingQueue = new Queue('messageProcessing', {
  ...redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  }
});

export const messageReplyQueue = new Queue('messageReply', redisConnection);

// Workers (Serão inicializados no app.ts)
export const messageProcessingWorker = new Worker('messageProcessing', processMessageJob, {
  ...redisConnection,
  concurrency: 20 // Limita processamento paralelo
});

export const messageReplyWorker = new Worker('messageReply', sendMessageJob, {
  ...redisConnection,
  concurrency: 30 // Limita envios simultâneos
});

// Após a criação dos workers
messageProcessingWorker.on('failed', async (job, err) => {
  if (job && job.attemptsMade === job.opts.attempts) {
    logger.error(`Job ${job.id} falhou após ${job.attemptsMade} tentativas`);
    const userId = job.data.userId;

    // Notificação alternativa (ex: enviar para canal de monitoramento)
    logger.error(`Falha crítica no processamento para usuário ${userId}`);
  }
});

messageReplyWorker.on('failed', async (job, err) => {
  if (job && job.attemptsMade === job.opts.attempts) {
    logger.error(`Mensagem não entregue para ${job.data.userId}:`, job.data.response);

    // Aqui você pode adicionar lógica para dead-letter queue
    await redisClient.rPush('dead-letters', JSON.stringify(job.data));
  }
});