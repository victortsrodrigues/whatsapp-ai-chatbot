# Estágio de build
FROM node:20-alpine AS builder

# Diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Compilar TypeScript para JavaScript
RUN npm run build

# Estágio de produção
FROM node:20-alpine AS production

# Definir variáveis de ambiente para produção
ENV NODE_ENV=production

# Criar diretório para logs
RUN mkdir -p /app/logs

# Diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar apenas dependências de produção
RUN npm ci --only=production

# Copiar arquivos compilados do estágio de build
COPY --from=builder /app/dist ./dist

# Expor a porta definida no .env (padrão 5000)
EXPOSE 5000

# Definir usuário não-root para segurança
USER node

# Comando para iniciar a aplicação
CMD ["node", "dist/app.js"]
