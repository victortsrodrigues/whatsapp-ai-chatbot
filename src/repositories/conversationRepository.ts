import { ConversationHistory } from '../interfaces';
import logger from '../utils/logger';
import redisClient from '../utils/redisClient';

class ConversationRepository {
  private readonly MAX_HISTORY_LENGTH = 6; // Keep 3 interactions (question + answer for each)
  private readonly HISTORY_PREFIX = 'history:';
  private readonly EXPIRY_TIME = 60 * 60 * 24 * 14; // 14 days in seconds

  // Get conversation history for a user
  public async getHistory(userId: string): Promise<ConversationHistory[]> {
    try {
      const key = this.getRedisKey(userId);

      // Fallback para memória local se redis não estiver disponível
      if (!(await redisClient.isHealthy())) {
        logger.warn(`Redis unavailable, using empty history for user ${userId}`);
        return [];
      }

      // Obtém todos os itens da lista
      const historyItems = await redisClient.lRange(key, 0, -1);

      if (!historyItems || historyItems.length === 0) {
        return [];
      }

      // Converte cada item de string JSON para objeto com validação
      return historyItems.map(item => {
        try {
          const parsed = JSON.parse(item);
          // Validar o formato do objeto
          if (typeof parsed.role === 'string' && typeof parsed.content === 'string') {
            return parsed;
          } else {
            logger.warn(`Invalid history item format for user ${userId}`);
            return { role: "system", content: "História de conversação incompleta" };
          }
        } catch (parseError) {
          logger.error(`Error parsing history item for user ${userId}:`, parseError);
          return { role: "system", content: "História de conversação incompleta" };
        }
      });
    } catch (error) {
      logger.error(`Error getting history for user ${userId}:`, error);
      return [];
    }
  }

  // Add a new conversation entry for a user
  public async addConversation(userId: string, query: string, response: string): Promise<void> {
    try {
      const key = this.getRedisKey(userId);

      // Adiciona a mensagem do usuário no final da lista
      await redisClient.rPush(key, JSON.stringify({ role: 'user', content: query }));

      // Adiciona a resposta no final da lista
      await redisClient.rPush(key, JSON.stringify({ role: 'assistant', content: response }));

      // Mantém apenas os últimos MAX_HISTORY_LENGTH itens
      await redisClient.lTrim(key, -this.MAX_HISTORY_LENGTH, -1);

      // Renova o tempo de expiração
      await redisClient.expire(key, this.EXPIRY_TIME);

      logger.debug(`Added conversation for user ${userId}`);
    } catch (error) {
      logger.error(`Error adding conversation for user ${userId}:`, error);
    }
  }

  // Clear conversation history for a user
  public async clearHistory(userId: string): Promise<void> {
    try {
      const key = this.getRedisKey(userId);
      await redisClient.del(key);
      logger.debug(`Cleared conversation history for user ${userId}`);
    } catch (error) {
      logger.error(`Error clearing history for user ${userId}:`, error);
    }
  }

  // Get Redis key for user history
  private getRedisKey(userId: string): string {
    return `${this.HISTORY_PREFIX}${userId}`;
  }
}

export default new ConversationRepository();