export interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: number;
  type: string;
  text?: {
    body: string;
  };
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: WhatsAppMessage[];
        statuses?: any[];
      };
      field: string;
    }>;
  }>;
}

export interface BufferedMessage {
  userId: string;
  messages: string[];
  lastTimestamp: number;
  timeoutId?: NodeJS.Timeout;
}

export interface ConversationHistory {
  query: string;
  response: string;
}

export interface UserConversation {
  userId: string;
  history: ConversationHistory[];
}

export interface AIRequest {
  query: string;
  user_id: string;
  history: ConversationHistory[];
  system_message: string | null;
}

export interface AIResponse {
  response: string;
  sources?: any[];
}

export interface ApiError extends Error {
  statusCode?: number;
  details?: any;
}