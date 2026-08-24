FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/web/package.json apps/web/
RUN npm ci

COPY apps/web apps/web/
RUN npm run build --workspace @nexus/web

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static
COPY --from=builder /app/apps/web/public ./public

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
