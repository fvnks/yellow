# syntax=docker/dockerfile:1
# Yellow — image for Coolify (or any Docker host).
# Coolify detects this file automatically and runs it as-is.

FROM node:24-slim AS build
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy sources and build. prisma generate does NOT require DATABASE_URL;
# runtime environment variables are injected by Coolify, not baked in.
COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# On every container start: apply pending migrations, then serve.
# DATABASE_URL must be provided by Coolify (use the internal Postgres URL).
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
