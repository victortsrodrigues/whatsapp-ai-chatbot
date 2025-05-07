import logger from '../utils/logger';
import redisClient from '../utils/redisClient';

class AutoReplyService {
  private readonly REDIS_KEY = 'enabled_users';
  private enabledUsersCache = new Set<string>();
  private initialized = false;

  constructor() {
    // Inicializar a cache do Redis quando o serviço for criado
    this.initializeFromRedis();
  }

  // Inicializa a cache a partir do Redis
  private async initializeFromRedis(): Promise<void> {
    try {
      const enabledUsers = await redisClient.lRange(this.REDIS_KEY, 0, -1);

      // Limpa a cache local
      this.enabledUsersCache.clear();

      // Popula a cache local com os valores do Redis
      enabledUsers.forEach(userId => {
        this.enabledUsersCache.add(userId);
      });

      this.initialized = true;
      logger.info(`AutoReplyService inicializado com ${this.enabledUsersCache.size} usuários ativos`);
    } catch (error) {
      logger.error('Erro ao inicializar AutoReplyService do Redis:', error);
    }
  }
  
  // Desativa o auto-responder para esses userIds
  public async disable(userIds: string[]): Promise<void> {
    try {
      for (const userId of userIds) {
        // Remove da cache local
        this.enabledUsersCache.delete(userId);

        // Encontra e remove do Redis
        const client = redisClient.getClient();
        await client.lRem(this.REDIS_KEY, 0, userId);

        logger.info(`Auto-reply desativado para ${userId}`);
      }
    } catch (error) {
      logger.error(`Erro ao desativar auto-reply:`, error);
    }
  }

  // Ativa o auto-responder para esses userIds
  public async enable(userIds: string[]): Promise<void> {
    try {
      for (const userId of userIds) {
        // Adiciona à cache local se ainda não existir
        if (!this.enabledUsersCache.has(userId)) {
          this.enabledUsersCache.add(userId);

          // Adiciona ao Redis se não existir
          await redisClient.rPush(this.REDIS_KEY, userId);

          logger.info(`Auto-reply ativado para ${userId}`);
        }
      }
    } catch (error) {
      logger.error(`Erro ao ativar auto-reply:`, error);
    }
  }

  // Checa se está ativado
  public isEnabled(userId: string): boolean {
    // Se ainda não inicializou do Redis, assume que está desabilitado
    if (!this.initialized) {
      logger.warn(`AutoReplyService ainda não inicializado ao verificar ${userId}`);
      return false;
    }
    return this.enabledUsersCache.has(userId);
  }

  // Obtém todos os usuários habilitados
  public async getAllEnabled(): Promise<string[]> {
    try {
      // Atualiza a cache antes de retornar
      await this.initializeFromRedis();
      return Array.from(this.enabledUsersCache);
    } catch (error) {
      logger.error('Erro ao obter lista de usuários habilitados:', error);
      return Array.from(this.enabledUsersCache);
    }
  }
}

export default new AutoReplyService();
