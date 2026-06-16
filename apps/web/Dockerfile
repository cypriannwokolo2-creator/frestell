FROM node:18-alpine AS builder
WORKDIR /app
ENV NODE_ENV=production
# Install dependencies
COPY apps/web/package*.json ./
RUN npm ci --legacy-peer-deps
# Copy source files
COPY apps/web/ ./
# Build the Next.js app
RUN npm run build

# Production image
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "run", "start"]
