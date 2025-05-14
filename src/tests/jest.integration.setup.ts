import { startServer } from "../app";
import redisClient from "../utils/redisClient";
import environment from "../config/environment";
import {
  messageProcessingWorker,
  messageReplyWorker,
  webhookProcessingWorker,
  messageProcessingQueue,
  messageReplyQueue,
  webhookProcessingQueue,
} from "../utils/queues";

// Override environment variables for testing
environment.redis.host = "localhost";
environment.redis.port = 6379;
environment.redis.password = "";
environment.messageBuffer.timeout = 1000;

// Mock AI service for testing
jest.mock("../services/aiService", () => ({
  __esModule: true,
  default: {
    checkHealth: jest.fn().mockResolvedValue(true),
    queryAI: jest.fn().mockResolvedValue({
      response: "Esta é uma resposta de teste da IA",
      requires_action: false,
    }),
  },
}));

// Setup global
beforeAll(async () => {
  await startServer();

  await webhookProcessingWorker.waitUntilReady();
  await messageProcessingWorker.waitUntilReady();
  await messageReplyWorker.waitUntilReady();
}, 30000);

// Cleanup global
afterAll(async () => {
  try {
    const closeWorkers = async () => {
      await Promise.allSettled([
        webhookProcessingWorker.close(),
        messageProcessingWorker.close(),
        messageReplyWorker.close()
      ]);
    };
    
    const closeQueues = async () => {
      await Promise.allSettled([
        webhookProcessingQueue.close(),
        messageProcessingQueue.close(),
        messageReplyQueue.close()
      ]);
    };
    
    let workerTimeoutId: NodeJS.Timeout | null = null;
    await Promise.race([
      closeWorkers(),
      new Promise(r => {
        workerTimeoutId = setTimeout(r, 5000);
      })
    ]);
    if (workerTimeoutId) clearTimeout(workerTimeoutId);
    
    let queueTimeoutId: NodeJS.Timeout | null = null;
    await Promise.race([
      closeQueues(),
      new Promise(r => {
        queueTimeoutId = setTimeout(r, 5000);
      })
    ]);
    if (queueTimeoutId) clearTimeout(queueTimeoutId);
    
    await redisClient.close();
    
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
  
  let finalTimeoutId: NodeJS.Timeout | null = null;
  await new Promise(resolve => {
    finalTimeoutId = setTimeout(resolve, 1000);
  });
  if (finalTimeoutId) clearTimeout(finalTimeoutId);
}, 15000);
