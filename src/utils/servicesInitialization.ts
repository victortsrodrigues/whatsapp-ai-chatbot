import logger from "./logger";
import redisClient from "./redisClient";
import aiService from "../services/aiService";
import autoReplyService from "../services/autoReplyService";

class ServicesInitialization {
  public async initializeRedis(): Promise<void> {
    try {
      logger.info("Checking connection to Redis...");

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
        logger.warn("Redis is not connected. The server will continue, but the conversation history may not work correctly.");
      } else {
        logger.info("Redis connected successfully!");
      }
    } catch (error) {
      logger.error("Error checking connection to Redis:", error);
      logger.warn("Starting server without guaranteed connection with Redis.");
    }
  };

  public async initializeAIService(): Promise<void> {
    try {
      logger.info("Checking connection to AI microservice...");

      const isAIReady = await this.checkAIServiceHealth();

      if (!isAIReady) {
        logger.error("Unable to connect to AI microservice after multiple attempts.");
        logger.error("The server will not start as the AI microservice is essential for the chatbot to function.");
        process.exit(1);
      } else {
        logger.info("AI Microservice successfully connected!");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorName = error instanceof Error ? error.name : "UnknownError";
      logger.error(`Error checking connection to AI microservice: ${errorName} - ${errorMessage}`);
      logger.error("The server will not start due to AI microservice verification failure.");
      process.exit(1);
    }
  };

  public async checkAIServiceHealth(): Promise<boolean> {
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
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logger.error(`Error trying ${attempts}/${maxAttempts} while checking connection to AI microservice:${errorMessage}`);

        if (attempts < maxAttempts) {
          const waitTime = 10000 * attempts;
          logger.info(`Waiting ${waitTime / 1000} seconds before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        attempts++;
      }
    }
    return isAIReady;
  }

  public async initializeAutoReplyService(): Promise<void> {
    try {
      logger.info("Initializing auto-reply service...");
      await autoReplyService.initialize();
      logger.info("Auto-reply service initialized successfully!");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorName = error instanceof Error ? error.name : "UnknownError";
      logger.warn(`Error initializing autore-reply service: ${errorName} - ${errorMessage}`);
      logger.warn("The server will continue, but the autoresponder service may not function properly.");
    }
  };
}

export default new ServicesInitialization();