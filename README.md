# 🤖 WhatsApp Chatbot Backend

![Build & Test](https://img.shields.io/github/actions/workflow/status/your-username/whatsapp-chatbot/ci-cd.yml?branch=main)
![Docker Pulls](https://img.shields.io/docker/pulls/your-username/whatsapp-chatbot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**A Node.js/Express backend powered by Redis & BullMQ to process WhatsApp webhooks, generate AI‑driven replies and respond asynchronously.**

🔗 **Live URL**: _(add your Render service URL here)_

---

## 🚀 Features

- 🔄 **Webhook Receiver**: Exposes an HTTP endpoint to accept WhatsApp webhook payloads.  
- 📨 **Asynchronous Processing**: Enqueues jobs in Redis via BullMQ for reliable, scalable task execution.  
- 🤖 **AI‑Powered Replies**: Integrates with your AI service to generate context‑aware responses.  
- 💬 **Auto‑Reply Toggle**: Per‑user enable/disable switch for auto‑reply behavior.  
- 📚 **Conversation History**: Persists chat history in Redis for context on each message.  
- 📈 **Healthcheck Endpoint**: `/health` returns 200 OK for uptime monitoring.  
- 🐳 **Dockerized**: Ready for container deployment.  
- 🔧 **CI/CD**: GitHub Actions for lint, unit tests, Docker build/push, and Render deploy hook.

---

## 🏗️ Project Structure

whatsapp-chatbot/
├── src/
│ ├── app.ts
│ ├── controllers/
│ ├── services/
│ ├── repositories/
│ ├── utils/
│ │ ├── redisClient.ts
│ │ └── queues.ts
│ └── workers.ts
├── dist/ # compiled output (if using TypeScript)
├── test/
│ ├── unit/
│ └── integration/
├── .env.example
├── Dockerfile
├── ci-cd.yml
├── jest.config.js
├── package.json
└── README.md

---

## ⚙️ Prerequisites

- **Node.js** v20+  
- **npm** v8+  
- **Docker** (for local container or CI)  
- **Redis** (local or via Testcontainers / redis-memory-server for tests)  
- **GitHub Secrets** (for CI/CD):  
  - `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`  
  - `RENDER_SERVICE_ID`, `RENDER_API_KEY`

---

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
