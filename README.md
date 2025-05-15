# 🤖 WhatsApp Chatbot Backend

![Build & Test](https://img.shields.io/github/actions/workflow/status/victortsrodrigues/whatsapp-ai-chatbot/ci-cd.yml?branch=main)
![Docker Pulls](https://img.shields.io/docker/pulls/victortsrodrigues/republica-whatsapp-ai-chatbot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**A Node.js/Express backend powered by Redis & BullMQ to process WhatsApp webhooks, generate AI‑driven replies and respond asynchronously.**

🔗 **Live URL**: [https://whatsapp-ai-chatbot-qd42.onrender.com](https://whatsapp-ai-chatbot-qd42.onrender.com)

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
```
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
```

---

## ⚙️ Prerequisites

- **Node.js** v20+  
- **npm** v8+  
- **Docker** (for local container or CI)  
- **Redis** (local or via Testcontainers / redis-memory-server for tests)  
- **GitHub Secrets** (for CI/CD):  
  - `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`  
  - `RENDER_DEPLOY_HOOK_URL`

---

## 💻 Running Locally

1. **Clone the repo**  
```bash
git clone https://github.com/your-username/whatsapp-chatbot.git
cd whatsapp-chatbot
```

2. **Clone the repo**
```bash	
cp .env.example .env
# then fill:
# REDIS_HOST=localhost
# REDIS_PORT=6379
# REDIS_PASSWORD=
# AI_SERVICE_URL=...
# PORT=5000
```

3. **Install dependencies**
```bash	
npm ci
```

4. **Start a local Redis (if not already running)**
```bash	
docker run -d --rm -p 6379:6379 redis:alpine
```

5. **Run in development**
```bash
npm run dev
```
The server will listen on http://localhost:5000

---

## 🧪 Automated Testing

### Run unit tests:
```bash
npm run test:unit
```

### Run integration tests:
```bash
npm run test:integration
```

---

## 🐳 Docker

### Build:
```bash
docker build -t your-username/whatsapp-chatbot:latest .
```

### Run:
```bash
docker run --rm -p 5000:5000 \
  --env-file .env \
  your-username/whatsapp-chatbot:latest
```

---

## 🔁 CI/CD

The GitHub Actions pipeline (`.github/workflows/ci-cd.yml`) automates:
1. Unit & Integration Tests
2. Docker Build & Push to Docker Hub
3. Deploy via Render Deploy Hook

Make sure to set these GitHub Secrets:
- DOCKERHUB_USERNAME, DOCKERHUB_TOKEN
- RENDER_DEPLOY_HOOK_URL

---

## 📡 API Endpoints

- `GET /health`: Health check endpoint
- `GET /webhook`: WhatsApp webhook verification endpoint
- `POST /webhook`: WhatsApp webhook endpoint for incoming messages

---

## WhatsApp API Setup

1. Create a WhatsApp Business account in the Meta Developer Portal
2. Set up a WhatsApp Business API integration
3. Configure the webhook URL to point to your server's `/webhook` endpoint
4. Set up a verify token (same as in your .env file)
5. Subscribe to the appropriate webhook events (messages, message_deliveries, etc.)

---

## 📬 Contributing
Pull requests are welcome!  
For major changes, please open an issue first to discuss what you'd like to change.

To contribute:
1. Fork the repository  
2. Create a feature branch  
3. Commit your changes with clear messages  
4. Ensure tests are included if applicable  
5. Open a pull request 

---

## 🛡️ License
MIT © [Victor Rodrigues](https://github.com/victortsrodrigues)
