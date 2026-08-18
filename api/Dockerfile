# Build stage: includes development tooling and Prisma CLI.
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json ./api/package.json
COPY web/package.json ./web/package.json
RUN npm ci

COPY api ./api
ENV DATABASE_URL="postgresql://pulsewatch:build-only@localhost:5432/pulsewatch?schema=public"
RUN rm -rf api/dist api/*.tsbuildinfo \
    && npm run build --workspace @pulse-watch/api \
    && test -f api/dist/main.js

# One-off migration target. This image contains Prisma CLI, but it exits
# immediately after applying pending migrations and is not used as the API runtime.
FROM build AS migrate
CMD ["npm", "run", "prisma:migrate:deploy", "--workspace", "@pulse-watch/api"]

# Install only the API's long-lived runtime dependencies. Optional/peer-only
# packages are omitted so the Prisma CLI toolchain is not shipped in production.
FROM node:24-alpine AS prod-deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json ./api/package.json
COPY web/package.json ./web/package.json
RUN npm ci \
      --omit=dev \
      --omit=optional \
      --omit=peer \
      --workspace @pulse-watch/api \
      --include-workspace-root=false \
    && test ! -d node_modules/prisma \
    && test ! -d node_modules/@prisma/config \
    && test ! -d node_modules/deepmerge-ts \
    && npm cache clean --force

# Minimal long-lived API runtime.
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/api/dist ./api/dist
COPY --from=build --chown=node:node /app/api/package.json ./api/package.json

USER node
EXPOSE 3000
CMD ["node", "api/dist/main.js"]
