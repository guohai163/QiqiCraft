# Stage 1: Build frontend and compile TypeScript
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/src/types ./src/types
COPY --from=builder /app/src/data ./src/data
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Create data directory and define volume
RUN mkdir -p /app/data/uploads
VOLUME ["/app/data"]

EXPOSE 3001

CMD ["npx", "tsx", "server/index.ts"]
