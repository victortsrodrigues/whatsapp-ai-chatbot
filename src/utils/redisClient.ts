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
          host: 'redis-16971.c8.us-east-1-3.ec2.redns.redis-cloud.com',
          port: 16971
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

    // Connect to redis
    this.connect();
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