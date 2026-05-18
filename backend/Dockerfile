# ==========================================
# Stage 1: Install packages and Prisma Client
# ==========================================
FROM node:18-alpine AS builder

# Install OpenSSL and compatibility libraries so Prisma can compile the correct native binary
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

RUN npx prisma generate

# ==========================================
# Stage 2: Hardened Runtime Container
# ==========================================
FROM node:18-alpine

# Install OpenSSL runtime libraries
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Install standard production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy generated Prisma binaries & app code
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY prisma ./prisma/
COPY src ./src/
COPY ./entrypoint.sh ./entrypoint.sh

# Harden filesystem permissions and switch to unprivileged user
RUN chmod +x ./entrypoint.sh && \
    chown -R node:node /app

USER node

EXPOSE 5000

ENTRYPOINT ["sh", "./entrypoint.sh"]
