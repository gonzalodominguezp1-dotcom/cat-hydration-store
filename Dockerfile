# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml .npmrc ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app ./
USER node
EXPOSE 3000
# Apply pending migrations, then start the web server. Run the worker as a
# separate container with: command: ["pnpm", "worker"]
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm start"]
