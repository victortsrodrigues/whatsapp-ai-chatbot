# 🤖 WhatsApp Chatbot Backend

![Build & Test](https://img.shields.io/github/actions/workflow/status/your-username/whatsapp-chatbot/ci-cd.yml?branch=main)
![Docker Pulls](https://img.shields.io/docker/pulls/your-username/whatsapp-chatbot)
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
  - `RENDER_DEPLOY_HOOK_URL`

---
