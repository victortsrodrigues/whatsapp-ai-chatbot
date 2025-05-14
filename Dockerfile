# Build stage
FROM node:20-alpine AS builder

# Working directory
WORKDIR /app

# Copy dependencies files
COPY package*.json ./

# Install dependencies
RUN npm ci --no-audit --no-fund --prefer-offline

# Copy source files
COPY . .

# Compile typescript files to JavaScript
RUN NODE_OPTIONS="--max-old-space-size=256" npm run build

# Production stage
FROM node:20-alpine AS production

# Define environment variables for production
ENV NODE_ENV=production
# Limit memory usage for Node.js
ENV NODE_OPTIONS="--max-old-space-size=384"

# Create a logs directory
RUN mkdir -p /app/logs

# Working directory
WORKDIR /app

# Copy dependencies files
COPY package*.json ./

# Install dependencies for production
RUN npm ci --omit=dev --no-audit --no-fund --prefer-offline

# Copy compiled files from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the application port
EXPOSE 5000

# Define a non-root user to run the application
USER node

# Initialize the application
CMD ["node", "dist/app.js"]
