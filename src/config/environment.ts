import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const environment = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '5000', 10),
  whatsapp: {
    apiToken: process.env.WHATSAPP_API_TOKEN ?? '',
    apiUrl: process.env.WHATSAPP_API_URL ?? '',
  },
  ai: {
    serviceUrl: process.env.AI_SERVICE_URL ?? 'https://chatbot-republic-ai-microservice.onrender.com/rag/query',
    systemMessage:
    `Você é um atendente prestativo da República dos Estudantes. 
    Seu objetivo é construir uma conversa agradável com o cliente e enviar todas as informações necessárias.
    Suas respostas devem ser curtas, amigáveis e profissionais.
    Responda como uma pessoa comum e não como um assistente virtual.`,
  },
  messageBuffer: {
    timeout: parseInt(process.env.MESSAGE_BUFFER_TIMEOUT ?? '5000', 10), // 5 seconds default
  },
  logging: {
    level: process.env.LOG_LEVEL ?? 'info',
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
    ttl: parseInt(process.env.REDIS_TTL ?? (60 * 60 * 24 * 14).toString(), 10), // 14 days in seconds
    password: process.env.REDIS_PASSWORD,
    host: process.env.REDIS_HOST ?? 'redis-16971.c8.us-east-1-3.ec2.redns.redis-cloud.com',
    port: parseInt(process.env.REDIS_PORT ?? '16971', 10),
  }
};

// Validate required environment variables
const requiredEnvVars = ['WHATSAPP_API_TOKEN', 'WHATSAPP_API_URL'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

export default environment;