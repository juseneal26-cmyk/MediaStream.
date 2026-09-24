# --- Etapa de build ---
FROM node:20-alpine AS builder
WORKDIR /app

# Alpine (musl) no trae OpenSSL por defecto; el motor de Prisma lo necesita
# para detectar correctamente la versión de libssl y generar el binario correcto.
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
COPY prisma ./prisma
RUN npm install --omit=dev
RUN npx prisma generate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY scripts ./scripts

EXPOSE 3002

# Ejecuta migraciones pendientes y luego arranca el servicio.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
