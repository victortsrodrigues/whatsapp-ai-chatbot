import { Request, Response } from 'express';
import { WhatsAppWebhookPayload } from '../interfaces';
import whatsappService from '../services/whatsappService';
import aiService from '../services/aiService';
import logger from '../utils/logger';

class WhatsAppController {
  /**
   * Handle incoming webhooks from WhatsApp
   */
  public async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body as WhatsAppWebhookPayload;
      
      // Process the webhook asynchronously
      setImmediate(() => {
        whatsappService.processWebhook(payload);
      });
      
      // Respond quickly to webhook
      res.status(200).send('OK');
    } catch (error) {
      logger.error('Error in webhook handler:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * Verify the webhook subscription
   */
  public verifyWebhook(req: Request, res: Response): void {
    try {
      const mode = req.query['hub.mode'] as string;
      const token = req.query['hub.verify_token'] as string;
      const challenge = req.query['hub.challenge'] as string;
      
      if (!mode || !token) {
        logger.warn('Missing verification parameters');
        res.status(400).send('Missing parameters');
        return;
      }
      
      const response = whatsappService.verifyWebhook(mode, token, challenge);
      
      if (response) {
        res.status(200).send(response);
      } else {
        res.status(403).send('Verification failed');
      }
    } catch (error) {
      logger.error('Error in verify webhook:', error);
      res.status(500).send('Internal server error');
    }
  }
  
  /**
   * Health check endpoint for the API
   */
  public async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Check the AI service health
      const aiHealthy = await aiService.checkHealth();
      
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          api: 'healthy',
          ai: aiHealthy ? 'healthy' : 'unhealthy'
        }
      });
    } catch (error) {
      logger.error('Health check failed:', error);
      
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'Health check failed'
      });
    }
  }
}

export default new WhatsAppController();