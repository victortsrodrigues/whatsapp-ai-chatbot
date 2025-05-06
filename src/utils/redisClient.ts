import { createClient } from 'redis';
import logger from './logger';
import environment from '../config/environment';

class RedisClient {
  private client;
  private isConnected: boolean = false;
  private readonly EXPIRY_TIME = 60 * 60 * 24 * 14; // 14 days in seconds

  constructor() {
    this.client = createClient({
      url: environment.redis.url
    });

    this.client.on('error', (err) => {
      logger.error('Redis Client Error', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Connected to Redis');
      this.isConnected = true;
    });

    this.client.on('reconnecting', () => {
      logger.info('Reconnecting to Redis');
    });

    this.client.on('end', () => {
      logger.info('Redis connection ended');
      this.isConnected = false;
    });

    // Connect to redis
    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      // Try to reconnect after a delay
      setTimeout(() => this.connect(), 5000);
    }
  }

  /**
   * Get a value from Redis
   */
  public async get(key: string): Promise<string | null> {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, trying to reconnect...');
        await this.connect();
      }
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Error getting key ${key} from Redis:`, error);
      return null;
    }
  }

  /**
   * Set a value in Redis with expiry
   */
  public async set(key: string, value: string, expiry: number = this.EXPIRY_TIME): Promise<void> {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, trying to reconnect...');
        await this.connect();
      }
      await this.client.set(key, value, { EX: expiry });
    } catch (error) {
      logger.error(`Error setting key ${key} in Redis:`, error);
    }
  }

  /**
   * Delete a key from Redis
   */
  public async del(key: string): Promise<void> {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, trying to reconnect...');
        await this.connect();
      }
      await this.client.del(key);
    } catch (error) {
      logger.error(`Error deleting key ${key} from Redis:`, error);
    }
  }

  /**
   * Check if Redis is connected
   */
  public isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Close Redis connection
   */
  public async close(): Promise<void> {
    try {
      await this.client.quit();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection:', error);
    }
  }
}

// Create a singleton instance
const redisClient = new RedisClient();

export default redisClient;