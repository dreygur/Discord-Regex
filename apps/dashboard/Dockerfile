# FROM node:18-alpine AS base
FROM public.ecr.aws/docker/library/node:22.14.0-alpine AS base

# Install pnpm and turbo
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN npm install --global turbo@latest

ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_REGION
ARG NEXT_ENDPOINT
ARG NEXT_ACCESS_KEY_ID
ARG NEXT_SECRET_ACCESS_KEY

ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL
ENV NEXT_REGION=$NEXT_REGION
ENV NEXT_ENDPOINT=$NEXT_ENDPOINT
ENV NEXT_ACCESS_KEY_ID=$NEXT_ACCESS_KEY_ID
ENV NEXT_SECRET_ACCESS_KEY=$NEXT_SECRET_ACCESS_KEY

FROM base AS builder
RUN apk update
RUN apk add --no-cache libc6-compat
# Set working directory
WORKDIR /app

COPY . .

# Generate a partial monorepo with a pruned lockfile for discord
RUN turbo prune @discord/dashboard --docker

# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
RUN apk update
RUN apk add --no-cache libc6-compat
WORKDIR /app


# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .

# Install dependencies with pnpm which supports workspace: protocol
RUN pnpm install --no-frozen-lockfile

# Build the project
COPY --from=builder /app/out/full/ .
COPY pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./
RUN pnpm turbo run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 dashboard
USER dashboard

# Copy built application
COPY --from=installer --chown=nextjs:nodejs /app/apps/dashboard/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/dashboard/public ./apps/dashboard/public

CMD node apps/dashboard/server.js