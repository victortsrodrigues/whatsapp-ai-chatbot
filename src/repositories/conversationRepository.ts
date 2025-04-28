import { ConversationHistory, UserConversation } from '../interfaces';
import logger from '../utils/logger';

class ConversationRepository {
  private conversations: Map<string, ConversationHistory[]> = new Map();
  private readonly MAX_HISTORY_LENGTH = 3;
  
  /**
   * Get conversation history for a user
   */
  public getHistory(userId: string): ConversationHistory[] {
    const history = this.conversations.get(userId) || [];
    return [...history];
  }
  
  /**
   * Add a new conversation entry for a user
   */
  public addConversation(userId: string, query: string, response: string): void {
    const history = this.conversations.get(userId) || [];
    
    // Add new conversation
    const updatedHistory = [
      ...history, 
      { query, response }
    ];
    
    // Keep only the last MAX_HISTORY_LENGTH conversations
    if (updatedHistory.length > this.MAX_HISTORY_LENGTH) {
      updatedHistory.shift(); // Remove oldest conversation
    }
    
    // Save updated history
    this.conversations.set(userId, updatedHistory);
    logger.debug(`Added conversation for user ${userId}. History length: ${updatedHistory.length}`);
  }
  
  /**
   * Clear conversation history for a user
   */
  public clearHistory(userId: string): void {
    this.conversations.delete(userId);
    logger.debug(`Cleared conversation history for user ${userId}`);
  }
  
  /**
   * Get all user conversations
   */
  public getAllConversations(): UserConversation[] {
    const result: UserConversation[] = [];
    
    for (const [userId, history] of this.conversations.entries()) {
      result.push({
        userId,
        history: [...history]
      });
    }
    
    return result;
  }
}

export default new ConversationRepository();