# --- Etapa de build ---
FROM node:20-alpine AS builder
WORKDIR /app

# openssl: el motor de Prisma lo necesita en Alpine (musl).
RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

# --- Etapa de producción ---
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public

EXPOSE 3006

# Ejecuta migraciones pendientes y luego arranca el servicio, igual que el
# resto de microservicios de MediaStream.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
