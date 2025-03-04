# FROM node:18-alpine AS base
FROM public.ecr.aws/docker/library/node:22.14.0-alpine AS base

# Install pnpm and turbo
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN npm install --global turbo@latest

ARG TOKEN
ARG THUMBNAIL
ARG REGION
ARG ENDPOINT
ARG ACCESS_KEY_ID
ARG SECRET_ACCESS_KEY

ENV TOKEN=$TOKEN
ENV THUMBNAIL=$THUMBNAIL
ENV REGION=$REGION
ENV ENDPOINT=$ENDPOINT
ENV ACCESS_KEY_ID=$ACCESS_KEY_ID
ENV SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
# Set working directory
WORKDIR /app

COPY . .

# Generate a partial monorepo with a pruned lockfile for discord
RUN turbo prune @discord/bot --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app


# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Install dependencies with pnpm which supports workspace: protocol
RUN pnpm install --no-frozen-lockfile

# Build the project
COPY --from=builder /app/out/full/ .
RUN pnpm turbo run build --filter=@discord/bot

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 discordbot

# Copy built application
COPY --from=installer --chown=discordbot:nodejs /app .

USER discordbot

CMD ["node", "apps/discord/dist/index.js"]