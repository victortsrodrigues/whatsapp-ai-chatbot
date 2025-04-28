import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const environment = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  whatsapp: {
    apiToken: process.env.WHATSAPP_API_TOKEN || '',
    apiUrl: process.env.WHATSAPP_API_URL || '',
  },
  ai: {
    serviceUrl: process.env.AI_SERVICE_URL || 'https://chatbot-republic-ai-microservice.onrender.com/rag/query',
  },
  messageBuffer: {
    timeout: parseInt(process.env.MESSAGE_BUFFER_TIMEOUT || '5000', 10), // 5 seconds default
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validate required environment variables
const requiredEnvVars = ['WHATSAPP_API_TOKEN', 'WHATSAPP_API_URL'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

export default environment;