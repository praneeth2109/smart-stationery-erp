# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first (better layer caching — only re-runs npm install
# when package.json or package-lock.json actually changes)
COPY package*.json ./
RUN npm ci

# Copy Prisma schema and generate the client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source and compile TypeScript → dist/
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: Production image ──────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Only install production dependencies (no devDependencies)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output and Prisma files from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

# Expose the API port
EXPOSE 4000

# Run schema sync + seed + start server
CMD ["sh", "-c", "npx prisma db push && npx tsx prisma/seed.ts && node dist/index.js"]
