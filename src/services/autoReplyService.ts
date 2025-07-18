import logger from '../utils/logger';
import redisClient from '../utils/redisClient';

class AutoReplyService {
  public readonly REDIS_KEY = 'enabled_users';
  public readonly enabledUsersCache = new Set<string>();
  private initialized = false;

  // Public method to initialize the service
  public async initialize(): Promise<void> {
    await this.initializeFromRedis();
    setInterval(async () => {
      await this.initializeFromRedis();
    }, 300000);
  }

  // Initialize the cache from Redis
  private async initializeFromRedis(): Promise<void> {
    let attempts = 0;
    const MAX_ATTEMPTS = 5;
    while (attempts < MAX_ATTEMPTS) {
      try {
        const enabledUsers = await redisClient.lRange(this.REDIS_KEY, 0, -1);
        this.enabledUsersCache.clear();
        enabledUsers.forEach(userId => this.enabledUsersCache.add(userId));
        this.initialized = true;
        logger.info(`AutoReplyService initialized with ${this.enabledUsersCache.size} active users.`);
        return;
      } catch (error) {
        attempts++;
        logger.error(`${attempts} initialization attempt failed.`, error);
        await new Promise(resolve => setTimeout(resolve, 5000 * attempts));
      }
    }
    logger.error("Critical failure while initializing AutoReplyService.");
  }

  // Disable autoreply for these users
  public async disable(userIds: string[]): Promise<void> {
    try {
      for (const userId of userIds) {
        // Remove from local cache
        this.enabledUsersCache.delete(userId);

        // Find and remove from Redis
        const client = redisClient.getClient();
        await client.lRem(this.REDIS_KEY, 0, userId);

        logger.info(`Auto-reply disabled for${userId}`);
      }
    } catch (error) {
      logger.error(`Error disabling auto-reply:`, error);
    }
  }

  // Enable autoreply or these users
  public async enable(userIds: string[]): Promise<void> {
    try {
      for (const userId of userIds) {
        // Add to local cache if not already present
        if (!this.enabledUsersCache.has(userId)) {
          this.enabledUsersCache.add(userId);

          // Add to Redis if not exists
          if (await redisClient.isHealthy()) {
            await redisClient.rPush(this.REDIS_KEY, userId);
            logger.info(`Auto-reply enabled for ${userId}`);
          }
        }
      }
    } catch (error) {
      logger.error(`Error activating auto-reply:`, error);
    }
  }

  // Check if it is activated
  public isEnabled(userId: string): boolean {
    // If you haven't initialized Redis yet, assume it is disabled
    if (!this.initialized) {
      logger.warn(`AutoReplyService not yet initialized when checking ${userId}`);
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
      logger.error('Error getting list of enabled users:', error);
      return Array.from(this.enabledUsersCache);
    }
  }
}

const autoReplyService = new AutoReplyService();
export default autoReplyService;
