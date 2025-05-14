import { startServer } from "../app";
import redisClient from "../utils/redisClient";
import environment from "../config/environment";
import logger from "../utils/logger";
import {
  messageProcessingWorker,
  messageReplyWorker,
  webhookProcessingWorker,
  messageProcessingQueue,
  messageReplyQueue,
  webhookProcessingQueue,
} from "../utils/queues";

// Sobrescrever configurações para teste
environment.redis.host = "localhost";
environment.redis.port = 6379;
environment.redis.password = "";
environment.messageBuffer.timeout = 1000;

// Desativar verificação de saúde do serviço AI para testes
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

// // Silenciar logs durante testes
// logger.transports.forEach((t) => {
//   t.silent = true;
// });

// Setup global
beforeAll(async () => {
  // Inicializar o servidor e serviços
  await startServer();

  // Garantir que os workers estão prontos
  await webhookProcessingWorker.waitUntilReady();
  await messageProcessingWorker.waitUntilReady();
  await messageReplyWorker.waitUntilReady();
}, 30000);

// Cleanup global mais robusto
afterAll(async () => {
  try {
    // Fechar workers com timeout
    const closeWorkers = async () => {
      await Promise.allSettled([
        webhookProcessingWorker.close(),
        messageProcessingWorker.close(),
        messageReplyWorker.close()
      ]);
    };
    
    // Fechar filas
    const closeQueues = async () => {
      await Promise.allSettled([
        webhookProcessingQueue.close(),
        messageProcessingQueue.close(),
        messageReplyQueue.close()
      ]);
    };
    
    // Executar com timeout - usando let para poder limpar o timeout
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
    
    // Fechar conexão Redis por último
    await redisClient.close();
    
  } catch (error) {
    console.error('Error during test cleanup:', error);
  }
  
  // Forçar encerramento de conexões pendentes
  let finalTimeoutId: NodeJS.Timeout | null = null;
  await new Promise(resolve => {
    finalTimeoutId = setTimeout(resolve, 1000);
  });
  if (finalTimeoutId) clearTimeout(finalTimeoutId);
}, 15000);
