# WhatsApp AI Chatbot

A TypeScript backend that integrates WhatsApp API with an AI chatbot microservice for Student Republic.

## Features

- WhatsApp API integration for sending and receiving messages
- Message buffering to collect complete thoughts from users
- Integration with AI microservice for generating responses
- Conversation history tracking (last 3 interactions)
- Error handling and logging
- Health check endpoints

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- WhatsApp Business API credentials
- Access to the AI microservice

## Installation

1. Clone the repository
```bash
git clone <repository-url>
cd whatsapp-ai-chatbot
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
```

4. Edit the `.env` file with your WhatsApp API credentials and other settings

## Development

Run the development server:
```bash
npm run dev
```

## Building for Production

Build the TypeScript code:
```bash
npm run build
```

Run the production server:
```bash
npm start
```

## API Endpoints

- `GET /health`: Health check endpoint
- `GET /webhook`: WhatsApp webhook verification endpoint
- `POST /webhook`: WhatsApp webhook endpoint for incoming messages

## WhatsApp API Setup

1. Create a WhatsApp Business account in the Meta Developer Portal
2. Set up a WhatsApp Business API integration
3. Configure the webhook URL to point to your server's `/webhook` endpoint
4. Set up a verify token (same as in your .env file)
5. Subscribe to the appropriate webhook events (messages, message_deliveries, etc.)

## License

[MIT](LICENSE)