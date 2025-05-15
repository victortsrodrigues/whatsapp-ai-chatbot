import { WhatsAppWebhookPayload } from "../../interfaces";

export const createWebhookPayload = (
  userId: string,
  message: string
): WhatsAppWebhookPayload => {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "test-entry-id",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: userId,
                phone_number_id: userId,
              },
              contacts: [
                {
                  profile: {
                    name: "Test User",
                  },
                  wa_id: userId,
                },
              ],
              messages: [
                {
                  id: "test-message-id",
                  from: userId,
                  timestamp: new Date().toISOString(),
                  type: "text",
                  text: {
                    body: message,
                  },
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };
};

export const createImageWebhookPayload = (
  userId: string,
  message: string
): WhatsAppWebhookPayload => {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "test-entry-id",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: userId,
                phone_number_id: userId,
              },
              contacts: [
                {
                  profile: {
                    name: "Test User",
                  },
                  wa_id: userId,
                },
              ],
              messages: [
                {
                  id: "test-message-id",
                  from: userId,
                  timestamp: new Date().toISOString(),
                  type: "image",
                  image: {
                    caption: message,
                  },
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };
};
