# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl libssl3 ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV PRISMA_CLI_BINARY_TARGETS="debian-openssl-3.0.x"
ENV PRISMA_QUERY_ENGINE_LIBRARY="/app/node_modules/@prisma/engines/libquery_engine-debian-openssl-3.0.x.so.node"
ENV PRISMA_SCHEMA_ENGINE_BINARY="/app/node_modules/@prisma/engines/schema-engine-debian-openssl-3.0.x"
WORKDIR /app

FROM base AS deps
ENV NODE_ENV=development
COPY package*.json ./
RUN npm install

FROM base AS builder
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npx prisma generate

FROM base AS runner
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
RUN npm prune --omit=dev
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
