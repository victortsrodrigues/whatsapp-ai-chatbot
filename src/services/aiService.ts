import axios, { AxiosResponse } from 'axios';
import { AIRequest, AIResponse, ConversationHistory, ApiError } from '../interfaces';
import environment from '../config/environment';
import logger from '../utils/logger';
import CircuitBreaker from 'opossum';

class AIService {
  private readonly serviceUrl: string = environment.ai.serviceUrl;
  private readonly systemMessage: string = environment.ai.systemMessage || '';
  private readonly circuitBreaker: CircuitBreaker<[AIRequest], AxiosResponse<AIResponse>>;

  constructor() {
    // Configure o circuit breaker
    this.circuitBreaker = new CircuitBreaker<[AIRequest], AxiosResponse<AIResponse>>(
      async (requestBody: AIRequest) => {
        const response = await axios.post<AIResponse>(
          this.serviceUrl,
          requestBody,
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
          }
        );
        return response;
      },
      {
        timeout: 30000, // Timeout individual
        errorThresholdPercentage: 50, // Abre após 50% de falhas
        resetTimeout: 30000, // Tempo em meio-aberto
        rollingCountTimeout: 10000, // Janela de análise de falhas
        rollingCountBuckets: 5
      }
    );

    // Eventos para logging
    this.circuitBreaker.fallback(() => {
      return { 
        status: 503, 
        data: { 
          response: "Serviço de IA temporariamente indisponível. Tente novamente mais tarde." 
        } 
      };
    });
    this.circuitBreaker.on('open', () => 
      logger.error('Circuit breaker ABERTO: Chamadas ao AI service suspensas')
    );
    this.circuitBreaker.on('halfOpen', () => 
      logger.info('Circuit breaker MEIO-ABERTO: Testando recuperação')
    );
    this.circuitBreaker.on('close', () => 
      logger.info('Circuit breaker FECHADO: Chamadas ao AI service normalizadas')
    );
  }

  // Query the AI microservice with user message and conversation history
  public async queryAI(
    query: string, 
    userId: string, 
    history: ConversationHistory[]
  ): Promise<AIResponse> {
    try {
      logger.info(`Sending query to AI service for user ${userId}`);

      // Prepare request payload
      const requestBody: AIRequest = {
        query,
        user_id: userId,
        history,
        system_message: this.systemMessage,
      };

      const response = await this.circuitBreaker.fire(requestBody);

      logger.info(`AI service responded with status: ${response.status}`);

      if (!response.data) {
        const apiError: ApiError = new Error('Empty response from AI service');
        apiError.statusCode = 502;
        throw apiError;
      }

      if (typeof response.data.response !== 'string') {
        const apiError: ApiError = new Error('Invalid response format from AI service');
        apiError.statusCode = 502;
        apiError.details = { received: typeof response.data.response };
        throw apiError;
      }

      if (response.data.response.trim() === '') {
        const apiError: ApiError = new Error('Empty string response from AI service');
        apiError.statusCode = 502;
        throw apiError;
      }

      return response.data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('indisponível')) {
        // Erro do fallback
        const apiError: ApiError = new Error(error.message);
        apiError.statusCode = 503;
        throw apiError;
      }
      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status ?? 500;
        const errorMessage = error.response?.data?.message ?? error.message;

        logger.error(`AI service error (${statusCode}): ${errorMessage}`);

        const apiError: ApiError = new Error(`AI service error: ${errorMessage}`);
        apiError.statusCode = statusCode;
        apiError.details = error.response?.data;

        throw apiError;
      }

      // Handle other errors
      throw error;
    }
  }

  // Check if the AI service is healthy
  public async checkHealth(): Promise<boolean> {
    try {
      const healthUrl = this.serviceUrl.replace('/rag/query', '/health/ready');
      const response = await axios.get(healthUrl, { timeout: 10000 });
      return response.status === 200;
    } catch (error) {
      logger.error('AI service health check failed:', error);
      return false;
    }
  }
}

export default new AIService();