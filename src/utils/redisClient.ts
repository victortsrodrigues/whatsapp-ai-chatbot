import { createClient } from 'redis';
import logger from './logger';
import environment from '../config/environment';

class RedisClient {
  private readonly client;
  private isConnected: boolean = false;
  private readonly EXPIRY_TIME = 60 * 60 * 24 * 14; // 14 days in seconds
  private reconnectAttempts: number = 0;

  constructor() {
    this.client = createClient({
      username: 'default',
      password: environment.redis.password,
      socket: {
          host: environment.redis.host,
          port: environment.redis.port,
      }
    });

    this.client.on('error', (err) => {
      logger.error('Redis Client Error', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Connected to Redis');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      logger.info('Redis ready to use');
      this.isConnected = true;
    });

    this.client.on('reconnecting', () => {
      logger.info('Reconnecting to Redis');
    });

    this.client.on('end', () => {
      logger.info('Redis connection ended');
      this.isConnected = false;
    });
  }

  async initialize(): Promise<void> {
      try {
          await this.client.connect();
          logger.info('Redis connection successfully initialized');
      } catch (error) {
          logger.error('Failed to initialize Redis connection', error);
          this.isConnected = false;
      }
  }

  private async connect(): Promise<void> {
    try {
      if (this.client.isOpen) {
        return;
      }
      await this.client.connect();
      // Reset reconnect attempts after successful connection
      this.reconnectAttempts = 0;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      // Exponential backoff for reconnection attempts
      const backoff = Math.min(5000 * Math.pow(2, this.reconnectAttempts), 30000);
      this.reconnectAttempts++;

      logger.info(`Trying to reconnect in ${backoff/1000} seconds (attempt ${this.reconnectAttempts})...`);
      setTimeout(() => this.connect(), 5000);
    }
  }

  // Ping Redis to check if it's really available
  public async ping(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      // Set a timeout of 2 seconds for the ping command
      const pingPromise = this.client.ping();
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('Redis ping timeout')), 2000);
      });

      const result = await Promise.race([pingPromise, timeoutPromise]);
      return result === 'PONG';
    } catch (error) {
      logger.error('Error pinging Redis:', error);
      return false;
    }
  }

  // Check if Redis is available and responding (for health checks)
  public async isHealthy(): Promise<boolean> {
    return this.isConnected && await this.ping();
  }

  // Get direct access to Redis client for more complex operations
  public getClient() {
    return this.client;
  }

  // Get a value from Redis
  public async get(key: string, retryCount = 0): Promise<string | null> {
    const MAX_RETRIES = 3;

    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, trying to reconnect...');
        await this.connect();
      }
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Error getting key ${key} from Redis:`, error);

      // Implementar retry para operações de leitura
      if (retryCount < MAX_RETRIES) {
        const backoff = Math.min(100 * Math.pow(2, retryCount), 2000);
        logger.info(`Retrying Redis get for key ${key} in ${backoff}ms (attempt ${retryCount + 1})`);

        await new Promise(resolve => setTimeout(resolve, backoff));
        return this.get(key, retryCount + 1);
      }

      return null;
    }
  }

  // Set a value in Redis with expiry
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

  // Delete a key from Redis
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

  // Add item to the end of a list (RPUSH)
  public async rPush(key: string, value: string): Promise<number> {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, trying to reconnect...');
        await this.connect();
      }
      return await this.client.rPush(key, value);
    } catch (error) {
      logger.error(`Error adding to list ${key} in Redis:`, error);
      return 0;
    }
  }

  // Get a range of elements from a list
  public async lRange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, trying to reconnect...');
        await this.connect();
      }
      return await this.client.lRange(key, start, stop);
    } catch (error) {
      logger.error(`Error getting range from list ${key} in Redis:`, error);
      return [];
    }
  }

  // Trim a list to the specified range
  public async lTrim(key: string, start: number, stop: number): Promise<void> {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, trying to reconnect...');
        await this.connect();
      }
      await this.client.lTrim(key, start, stop);
    } catch (error) {
      logger.error(`Error trimming list ${key} in Redis:`, error);
    }
  }

  // Remove elementos de uma lista baseado no valor
  public async lRem(key: string, count: number, value: string): Promise<number> {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, trying to reconnect...');
        await this.connect();
      }
      return await this.client.lRem(key, count, value);
    } catch (error) {
      logger.error(`Error removing value from list ${key} in Redis:`, error);
      return 0;
    }
  }

  // Set expiration time for a key
  public async expire(key: string, seconds: number): Promise<void> {
    try {
      if (!this.isConnected) {
        logger.warn('Redis not connected, trying to reconnect...');
        await this.connect();
      }
      await this.client.expire(key, seconds);
    } catch (error) {
      logger.error(`Error setting expiry for key ${key} in Redis:`, error);
    }
  }

  // Close Redis connection
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