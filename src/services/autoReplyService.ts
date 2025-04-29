// src/services/autoReplyService.ts
class AutoReplyService {
  private readonly disabledUsers = new Set<string>();

  /** Desativa o auto-responder para esse userId */
  public disable(userId: string): void {
    this.disabledUsers.add(userId);
  }

  /** Reativa o auto-responder para esse userId */
  public enable(userId: string): void {
    this.disabledUsers.delete(userId);
  }

  /** Checa se está desativado */
  public isDisabled(userId: string): boolean {
    return this.disabledUsers.has(userId);
  }
}

export default new AutoReplyService();
