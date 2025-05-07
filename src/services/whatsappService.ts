import axios from 'axios';
import { WhatsAppWebhookPayload, ApiError } from '../interfaces';
import environment from '../config/environment';
import logger from '../utils/logger';
import messageBuffer from '../utils/messageBuffer';

class WhatsAppService {
  private readonly apiUrl: string = environment.whatsapp.apiUrl;
  private readonly apiToken: string = environment.whatsapp.apiToken;
  
  // Process incoming webhook payload from WhatsApp
  public processWebhook(payload: WhatsAppWebhookPayload): void {
    try {
      if (payload.object !== 'whatsapp_business_account') {
        logger.warn(`Received non-WhatsApp webhook: ${payload.object}`);
        return;
      }

      // Process each entry in the webhook
      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field !== 'messages') continue;
          
          const messages = change.value.messages || [];
          
          // Process each message
          for (const message of messages) {
            // Only process text messages
            let text: string;

            if (message.text?.body) {
              text = message.text.body;
            } else if (message.image?.caption) {
              text = message.image.caption;
            } else {
              continue;
            }
            
            const userId = message.from;
            const timestamp = message.timestamp;
            
            logger.info(`Received message from ${userId}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
            
            // Add message to buffer for processing
            messageBuffer.addMessage(userId, text, timestamp);
          }
        }
      }
    } catch (error) {
      logger.error('Error processing webhook:', error);
    }
  }
  
  // Send a message to a WhatsApp user
  public async sendMessage(to: string, text: string): Promise<void> {
    try {
      logger.info(`Sending message to ${to}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
      
      const response = await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: {
            preview_url: false,
            body: text
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiToken}`
          }
        }
      );
      
      logger.debug(`WhatsApp API response status: ${response.status}`);
      
    } catch (error) {
      // Handle axios errors
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status ?? 500;
        const errorMessage = error.response?.data?.message ?? error.message;
        
        logger.error(`WhatsApp API error (${statusCode}): ${errorMessage}`);
        
        const apiError: ApiError = new Error(`WhatsApp API error: ${errorMessage}`);
        apiError.statusCode = statusCode;
        apiError.details = error.response?.data;
        
        throw apiError;
      }
      
      // Handle other errors
      logger.error('Unknown error when calling WhatsApp API:', error);
      throw new Error('Failed to send WhatsApp message');
    }
  }
  
  // Verify WhatsApp webhook challenge
  public verifyWebhook(mode: string, token: string, challenge: string): string | null {
    // The token you set up in the WhatsApp developer portal
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    
    if (mode === 'subscribe' && token === verifyToken) {
      logger.info('WhatsApp webhook verified');
      return challenge;
    }
    
    logger.warn('WhatsApp webhook verification failed');
    return null;
  }
}

export default new WhatsAppService();