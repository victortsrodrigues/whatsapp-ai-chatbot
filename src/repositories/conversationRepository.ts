import { ConversationHistory } from '../interfaces';
import logger from '../utils/logger';
import redisClient from '../utils/redisClient';

class ConversationRepository {
  private readonly MAX_HISTORY_LENGTH = 6; // Keep 3 interactions (question + answer for each)
  private readonly HISTORY_PREFIX = 'history:';
  private readonly EXPIRY_TIME = 60 * 60 * 24 * 7; // 7 days in seconds

  // Get conversation history for a user
  public async getHistory(userId: string): Promise<ConversationHistory[]> {
    try {
      const key = this.getRedisKey(userId);

      // Fallback to local memory if Redis is not available
      if (!(await redisClient.isHealthy())) {
        logger.warn(`Redis unavailable, using empty history for user ${userId}`);
        return [];
      }

      // Get all items from the list
      const historyItems = await redisClient.lRange(key, 0, -1);

      if (!historyItems || historyItems.length === 0) {
        return [];
      }

      // Converts each JSON string item to an object with validation
      return historyItems.map(item => {
        try {
          const parsed = JSON.parse(item);
          // Validar o formato do objeto
          if (typeof parsed.role === 'string' && typeof parsed.content === 'string') {
            return parsed;
          } else {
            logger.warn(`Invalid history item format for user ${userId}`);
            return { role: "system", content: "Histórico incompleto" };
          }
        } catch (parseError) {
          logger.error(`Error parsing history item for user ${userId}:`, parseError);
          return { role: "system", content: "Histórico incompleto" };
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

      await redisClient.rPush(key, JSON.stringify({ role: 'user', content: query }));

      await redisClient.rPush(key, JSON.stringify({ role: 'assistant', content: response }));

      // Keep only the last MAX_HISTORY_LENGTH items
      await redisClient.lTrim(key, -this.MAX_HISTORY_LENGTH, -1);

      // Reset the expiration time for the key
      await redisClient.expire(key, this.EXPIRY_TIME);

      logger.debug(`Added conversation for user ${userId}`);
    } catch (error) {
      logger.error(`Error adding conversation for user ${userId}:`, error);
    }
  }

  // Get Redis key for user history
  private getRedisKey(userId: string): string {
    return `${this.HISTORY_PREFIX}${userId}`;
  }
}

export default new ConversationRepository();