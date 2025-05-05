import axios from 'axios';
import { AIRequest, AIResponse, ConversationHistory, ApiError } from '../interfaces';
import environment from '../config/environment';
import logger from '../utils/logger';

class AIService {
  private readonly serviceUrl: string = environment.ai.serviceUrl;
  
  /**
   * Query the AI microservice with user message and conversation history
   */
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
        system_message: null
      };
      
      logger.info('AI request payload:', requestBody);
      
      // Make request to AI microservice
      const response = await axios.post<AIResponse>(
        this.serviceUrl,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );
      
      logger.info(`AI service responded with status: ${response.status}`);
      return response.data;
      
    } catch (error) {
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
      logger.error('Unknown error when calling AI service:', error);
      throw new Error('Failed to communicate with AI service');
    }
  }
  
  /**
   * Check if the AI service is healthy
   */
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