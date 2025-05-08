import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import * as http from "http";
import environment from "./config/environment";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import {
  validateContentType,
  validateWebhookPayload,
} from "./middleware/requestValidator";
import whatsappController from "./controllers/whatsappController";
import logger from "./utils/logger";
import redisClient from "./utils/redisClient";
import aiService from "./services/aiService";
import autoReplyService from "./services/autoReplyService";

// Create Express application
const app: Express = express();
let server: http.Server;

// Basic middleware setup
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Apply content-type validation middleware
app.use(validateContentType);

app.get("/", whatsappController.baseMessage);

// Define routes
app.get("/health", whatsappController.healthCheck);

// WhatsApp webhook verification endpoint
app.get("/webhook", whatsappController.verifyWebhook);

// WhatsApp webhook endpoint - with payload validation
app.post("/webhook", validateWebhookPayload, whatsappController.handleWebhook);

// Routes to pause/resume or auto-reply on specific conversation
app.post("/chatbot/disable", whatsappController.disableAutoReply);
app.post("/chatbot/enable", whatsappController.enableAutoReply);
app.get("/chatbot/enabled", whatsappController.listEnabledUsers);

// Handle 404 errors
app.use(notFoundHandler);

// Central error handling
app.use(errorHandler);

// Start the server
const startServer = async (): Promise<void> => {
  const port = environment.port;

  // Check connection to Redis before starting the server
  try {
    logger.info("Verificando conexão com Redis...");

    // Wait a little while for the connection attempt
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

  // Check AI microservice health before starting the server
  try {
    logger.info("Verificando conexão com o microserviço AI...");

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
        // Extrair informações seguras do erro para evitar problemas com estruturas circulares
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        const errorName = error instanceof Error ? error.name : 'UnknownError';
        logger.error(`Erro na tentativa ${attempts}/${maxAttempts} ao verificar conexão com o microserviço AI: ${errorName} - ${errorMessage}`);

        if (attempts < maxAttempts) {
          const waitTime = 10000 * attempts;
          logger.info(`Aguardando ${waitTime / 1000} segundos antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        attempts++;
      }
    }

    if (!isAIReady) {
      logger.error("Não foi possível conectar ao microserviço AI após várias tentativas.");
      logger.error("O servidor não será iniciado, pois o microserviço AI é essencial para o funcionamento do chatbot.");
      process.exit(1); // Encerra o processo com código de erro
    } else {
      logger.info("Microserviço AI conectado com sucesso!");
    }
  } catch (error) {
    // Extrair apenas informações seguras do erro
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    logger.error(`Erro ao verificar conexão com o microserviço AI: ${errorName} - ${errorMessage}`);
    logger.error("O servidor não será iniciado devido a falha na verificação do microserviço AI.");
    process.exit(1); // Encerra o processo com código de erro
  }

  // Initialize AutoReplyService
  try {
    logger.info("Inicializando serviço de auto-resposta...");
    await autoReplyService.initialize();
    logger.info("Serviço de auto-resposta inicializado com sucesso!");
  } catch (error) {
    // Extrair apenas informações seguras do erro
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    logger.warn(`Erro ao inicializar serviço de auto-resposta: ${errorName} - ${errorMessage}`);
    logger.warn("O servidor continuará, mas o serviço de auto-resposta pode não funcionar corretamente.");
  }

  server = app.listen(port, () => {
    logger.info(
      `Server started on port ${port} in ${environment.nodeEnv} mode`
    );
  });

  // Handle graceful shutdown
  process.on("SIGTERM", () => {
    logger.info("SIGTERM signal received: closing HTTP server");
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    logger.info("SIGINT signal received: closing HTTP server");
    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });
  });

  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception:", error);

    // Attempt graceful shutdown after uncaught exception
    server.close(() => {
      logger.info("HTTP server closed after uncaught exception");
      process.exit(1);
    });

    // Force shutdown if graceful shutdown fails
    setTimeout(() => {
      logger.error("Forced shutdown after uncaught exception");
      process.exit(1);
    }, 5000);
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at:", promise, "reason:", reason);
    // Application can continue running despite unhandled promise rejections
  });
};

// Start server if this file is run directly
if (require.main === module) {
  startServer().catch(error => {
    logger.error("Failed to start server:", error);
    process.exit(1);
  });
}

export { app, startServer };