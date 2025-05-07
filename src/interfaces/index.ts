export interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
  image?: {
    caption: string;
  };
}

export interface WhatsAppStatus {
  id: string;
  status: string;
  recipient_id: string;
  timestamp: string;
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
  lastTimestamp: string;
  timeoutId?: NodeJS.Timeout;
}

export interface ConversationHistory {
  role: string;
  content: string;
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
  requires_action: boolean;
}

export interface ApiError extends Error {
  statusCode?: number;
  details?: any;
}