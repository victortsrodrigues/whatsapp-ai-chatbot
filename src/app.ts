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
app.post("/chatbot/:userId/disable", whatsappController.disableAutoReply);
app.post("/chatbot/:userId/enable",  whatsappController.enableAutoReply);

// Handle 404 errors
app.use(notFoundHandler);

// Central error handling
app.use(errorHandler);

// Start the server
const startServer = async (): Promise<void> => {
  const port = environment.port;

  // Verificar conexão com Redis antes de iniciar o servidor
  try {
    logger.info("Verificando conexão com Redis...");

    // Esperar um pouco pela tentativa de conexão
    await new Promise(resolve => setTimeout(resolve, 2000));

    if (!(await redisClient.isHealthy())) {
      logger.warn("Redis não está conectado. O servidor continuará, mas o histórico de conversas pode não funcionar corretamente.");
    } else {
      logger.info("Redis conectado com sucesso!");
    }
  } catch (error) {
    logger.error("Erro ao verificar conexão com Redis:", error);
    logger.warn("Iniciando servidor sem garantia de conexão com Redis");
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