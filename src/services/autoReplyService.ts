import logger from '../utils/logger'

class AutoReplyService {
  private readonly enabledUsers = new Set<string>();

  // Desativa o auto-responder para esse userId
  public disable(userId: string): void {
    this.enabledUsers.delete(userId);
    logger.info(`Auto-reply desativado para ${userId}`);
  }

  // Reativa o auto-responder para esse userId
  public enable(userId: string): void {
    this.enabledUsers.add(userId);
    logger.info(`Auto-reply ativado para ${userId}`);
  }

  // Checa se está ativado
  public isEnabled(userId: string): boolean {
    return this.enabledUsers.has(userId);
  }
}

export default new AutoReplyService();
