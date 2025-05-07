import logger from '../utils/logger';
import redisClient from '../utils/redisClient';

class AutoReplyService {
  private readonly REDIS_KEY = 'enabled_users';
  private readonly enabledUsersCache = new Set<string>();
  private initialized = false;

  // Public method to initialize the service
  public async initialize(): Promise<void> {
    await this.initializeFromRedis();
  }

  // Initialize the cache from Redis
  private async initializeFromRedis(): Promise<void> {
    try {
      const enabledUsers = await redisClient.lRange(this.REDIS_KEY, 0, -1);

      // Clear local cache
      this.enabledUsersCache.clear();

      // Populates the local cache with values from Redis
      enabledUsers.forEach(userId => {
        this.enabledUsersCache.add(userId);
      });

      this.initialized = true;
      logger.info(`AutoReplyService inicializado com ${this.enabledUsersCache.size} usuários ativos`);
    } catch (error) {
      logger.error('Erro ao inicializar AutoReplyService do Redis:', error);
    }
  }
  
  // Disable autoresponder for these users
  public async disable(userIds: string[]): Promise<void> {
    try {
      for (const userId of userIds) {
        // Remove from local cache
        this.enabledUsersCache.delete(userId);

        // Find and remove from Redis
        const client = redisClient.getClient();
        await client.lRem(this.REDIS_KEY, 0, userId);

        logger.info(`Auto-reply desativado para ${userId}`);
      }
    } catch (error) {
      logger.error(`Erro ao desativar auto-reply:`, error);
    }
  }

  // Enable autoresponder for these users
  public async enable(userIds: string[]): Promise<void> {
    try {
      for (const userId of userIds) {
        // Add to local cache if not already present
        if (!this.enabledUsersCache.has(userId)) {
          this.enabledUsersCache.add(userId);

          // Add to Redis if not exists
          await redisClient.rPush(this.REDIS_KEY, userId);

          logger.info(`Auto-reply ativado para ${userId}`);
        }
      }
    } catch (error) {
      logger.error(`Erro ao ativar auto-reply:`, error);
    }
  }

  // Check if it is activated
  public isEnabled(userId: string): boolean {
    // If you haven't initialized Redis yet, assume it is disabled
    if (!this.initialized) {
      logger.warn(`AutoReplyService ainda não inicializado ao verificar ${userId}`);
      return false;
    }
    return this.enabledUsersCache.has(userId);
  }

  // Get all enabled users
  public async getAllEnabled(): Promise<string[]> {
    try {
      // Updates cache before returning
      await this.initializeFromRedis();
      return Array.from(this.enabledUsersCache);
    } catch (error) {
      logger.error('Erro ao obter lista de usuários habilitados:', error);
      return Array.from(this.enabledUsersCache);
    }
  }
}

const autoReplyService = new AutoReplyService();
(async () => {
  try {
    await autoReplyService.initialize();
  } catch (error) {
    logger.error('Failed to initialize AutoReplyService:', error);
  }
})();

export default autoReplyService;
