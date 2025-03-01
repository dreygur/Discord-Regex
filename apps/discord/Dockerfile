FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# If using a monorepo setup, uncomment and adjust these lines
# COPY ../../packages ./packages
# COPY ../../package.json ./package.json
# COPY ../../tsconfig.json ./tsconfig.json

# Build the application
RUN yarn build

# Production image, copy all the files and run node
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 discordbot

# Copy only the necessary files
COPY --from=builder --chown=discordbot:nodejs /app/dist ./dist
COPY --from=builder --chown=discordbot:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=discordbot:nodejs /app/package.json ./package.json

USER discordbot

# Command to run the application
CMD ["node", "dist/index.js"]