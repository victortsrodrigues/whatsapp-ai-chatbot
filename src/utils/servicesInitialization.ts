import logger from "./logger";
import redisClient from "./redisClient";
import aiService from "../services/aiService";
import autoReplyService from "../services/autoReplyService";

export const initializeRedis = async (): Promise<void> => {
  try {
    logger.info("Verificando conexão com Redis...");

    let isRedisReady = false;
    let attempts = 1;
    const maxAttempts = 5;

    while (!isRedisReady && attempts < maxAttempts) {
      isRedisReady = await redisClient.isHealthy();
      if (!isRedisReady) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
        attempts++;
      }
    }

    if (!(await redisClient.isHealthy())) {
      logger.warn("Redis não está conectado. O servidor continuará, mas o histórico de conversas pode não funcionar corretamente.");
    } else {
      logger.info("Redis conectado com sucesso!");
    }
  } catch (error) {
    logger.error("Erro ao verificar conexão com Redis:", error);
    logger.warn("Iniciando servidor sem garantia de conexão com Redis");
  }
};

export const initializeAIService = async (): Promise<void> => {
  try {
    logger.info("Verificando conexão com o microserviço AI...");

    const isAIReady = await checkAIServiceHealth();

    if (!isAIReady) {
      logger.error("Não foi possível conectar ao microserviço AI após várias tentativas.");
      logger.error("O servidor não será iniciado, pois o microserviço AI é essencial para o funcionamento do chatbot.");
      process.exit(1);
    } else {
      logger.info("Microserviço AI conectado com sucesso!");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    const errorName = error instanceof Error ? error.name : "UnknownError";
    logger.error(`Erro ao verificar conexão com o microserviço AI: ${errorName} - ${errorMessage}`);
    logger.error("O servidor não será iniciado devido a falha na verificação do microserviço AI.");
    process.exit(1);
  }
};

export const checkAIServiceHealth = async (): Promise<boolean> => {
  let isAIReady = false;
  let attempts = 1;
  const maxAttempts = 5;

  while (!isAIReady && attempts <= maxAttempts) {
    try {
      isAIReady = await aiService.checkHealth();

      if (!isAIReady) {
        logger.warn(`AI service is not healthy. Attempt ${attempts} of ${maxAttempts}. Retrying...`);
        if (attempts < maxAttempts) {
          const waitTime = 10000 * attempts;
          logger.info(`Waiting ${waitTime / 1000} seconds before retrying...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        attempts++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      const errorName = error instanceof Error ? error.name : "UnknownError";
      logger.error(`Erro na tentativa ${attempts}/${maxAttempts} ao verificar conexão com o microserviço AI: ${errorName} - ${errorMessage}`);

      if (attempts < maxAttempts) {
        const waitTime = 10000 * attempts;
        logger.info(`Aguardando ${waitTime / 1000} segundos antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      attempts++;
    }
  }
  return isAIReady;
}

export const initializeAutoReplyService = async (): Promise<void> => {
  try {
    logger.info("Inicializando serviço de auto-resposta...");
    await autoReplyService.initialize();
    logger.info("Serviço de auto-resposta inicializado com sucesso!");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    const errorName = error instanceof Error ? error.name : "UnknownError";
    logger.warn(`Erro ao inicializar serviço de auto-resposta: ${errorName} - ${errorMessage}`);
    logger.warn("O servidor continuará, mas o serviço de auto-resposta pode não funcionar corretamente.");
  }
};