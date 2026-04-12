# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Native build tools needed by bcrypt
RUN apk add --no-cache python3 make g++

# Install pnpm
RUN npm install -g pnpm

# Install all dependencies (dev + prod) using the lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source & config
COPY . .

# Generate Prisma client into src/generated/prisma/
RUN npx prisma generate

# Compile TypeScript → dist/
RUN pnpm run build


# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Copy compiled output
COPY --from=builder /app/dist ./dist

# Copy full node_modules (prisma CLI is a devDep but needed for migrate deploy)
COPY --from=builder /app/node_modules ./node_modules

# Copy prisma schema + migrations (used by prisma migrate deploy at startup)
COPY --from=builder /app/prisma ./prisma

# Copy prisma config (provides DATABASE_URL to the CLI)
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Copy package.json (prisma CLI reads it for project metadata)
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

# Run as non-root user for security
USER node

# Apply pending migrations, then start the server
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/main.js"]
