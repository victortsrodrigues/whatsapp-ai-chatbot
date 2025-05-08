import axios, { AxiosResponse } from 'axios';
import { AIRequest, AIResponse, ConversationHistory, ApiError } from '../interfaces';
import environment from '../config/environment';
import logger from '../utils/logger';
import CircuitBreaker from 'opossum';
import servicesInitialization from '../utils/servicesInitialization';

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
        timeout: 30000,
        errorThresholdPercentage: 30, // Opens after 30% failures
        resetTimeout: 60000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 5
      }
    );

    // Logging events
    this.circuitBreaker.fallback(() => {
      return { 
        status: 503, 
        data: { 
          response: "AI service temporarily unavailable. Please try again later." 
        } 
      };
    });
    this.circuitBreaker.on('open', () => 
      logger.error('Circuit breaker OPEN: AI service calls suspended')
    );
    this.circuitBreaker.on('halfOpen', () => 
      logger.info('Circuit breaker HALF-OPEN: Testing recovery')
    );
    this.circuitBreaker.on('close', () => 
      logger.info('Circuit breaker CLOSED: AI service calls normalized')
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

      // Check if AI service is healthy
      const isAIReady = await servicesInitialization.checkAIServiceHealth();

      if (!isAIReady) {
        logger.error(`AI service is not healthy when processing query for user ${userId}`);
        const apiError: ApiError = new Error('AI service is currently unavailable');
        apiError.statusCode = 503; // Service Unavailable
        throw apiError;
      }

      // Prepare request payload
      const requestBody: AIRequest = {
        query,
        user_id: userId,
        history,
        system_message: this.systemMessage,
      };

      const response = await this.circuitBreaker.fire(requestBody);

      logger.info(`AI service responded with status: ${response.status}`);

      if (response.status !== 200) {
        const apiError: ApiError = new Error(`AI service returned ${response.status}`);
        apiError.statusCode = response.status;
        throw apiError;
      }

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

        if (this.circuitBreaker.opened) {
          throw new Error('Serviço de IA indisponível (Circuit Breaker Aberto)');
        }

        // Adicione mais detalhes para ajudar no debug
        logger.error(`Erro detalhado na requisição de IA:
          Usuário: ${userId}
          Query: ${query.substring(0, 50)}
          Histórico: ${history.length} mensagens
          Erro: ${error.stack ?? error.message}
        `);

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