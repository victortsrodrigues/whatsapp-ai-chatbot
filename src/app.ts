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
import servicesInitialization from "./utils/servicesInitialization";
import { messageProcessingWorker, messageReplyWorker, webhookProcessingWorker } from './utils/queues';

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
  await servicesInitialization.initializeRedis();
  await servicesInitialization.initializeAIService();
  await servicesInitialization.initializeAutoReplyService();

  // Initialize workers
  await webhookProcessingWorker.waitUntilReady();
  await messageProcessingWorker.waitUntilReady();
  await messageReplyWorker.waitUntilReady();

  const port = environment.port;
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