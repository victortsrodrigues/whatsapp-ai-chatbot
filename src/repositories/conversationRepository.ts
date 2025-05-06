import { ConversationHistory } from '../interfaces';
import logger from '../utils/logger';
import redisClient from '../utils/redisClient';

class ConversationRepository {
  private readonly MAX_HISTORY_LENGTH = 6; // Mantém 3 interações (pergunta + resposta para cada)
  private readonly HISTORY_PREFIX = 'history:';
  
  /**
   * Get conversation history for a user
   */
  public async getHistory(userId: string): Promise<ConversationHistory[]> {
    try {
      const key = this.getRedisKey(userId);
      const historyJson = await redisClient.get(key);
      
      if (!historyJson) {
        return [];
      }
      
      return JSON.parse(historyJson);
    } catch (error) {
      logger.error(`Error getting history for user ${userId}:`, error);
      return [];
    }
  }
  
  /**
   * Add a new conversation entry for a user
   */
  public async addConversation(userId: string, query: string, response: string): Promise<void> {
    try {
      const key = this.getRedisKey(userId);
      const currentHistory = await this.getHistory(userId);
      
      // Add new conversation
      const updatedHistory = [
        ...currentHistory, 
        { role: 'user', content: query },
        { role: 'assistant', content: response }
      ];
      
      // Keep only the last MAX_HISTORY_LENGTH conversations
      const trimmedHistory = updatedHistory.length > this.MAX_HISTORY_LENGTH
        ? updatedHistory.slice(updatedHistory.length - this.MAX_HISTORY_LENGTH)
        : updatedHistory;
      
      // Save updated history
      await redisClient.set(key, JSON.stringify(trimmedHistory));
      logger.debug(`Added conversation for user ${userId}. History length: ${trimmedHistory.length}`);
    } catch (error) {
      logger.error(`Error adding conversation for user ${userId}:`, error);
    }
  }
  
  /**
   * Clear conversation history for a user
   */
  public async clearHistory(userId: string): Promise<void> {
    try {
      const key = this.getRedisKey(userId);
      await redisClient.del(key);
      logger.debug(`Cleared conversation history for user ${userId}`);
    } catch (error) {
      logger.error(`Error clearing history for user ${userId}:`, error);
    }
  }
  
  /**
   * Get Redis key for user history
   */
  private getRedisKey(userId: string): string {
    return `${this.HISTORY_PREFIX}${userId}`;
  }
}

export default new ConversationRepository();