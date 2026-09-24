# --- Etapa de build ---
FROM node:20-alpine AS builder
WORKDIR /app

# openssl: el motor de Prisma lo necesita en Alpine (musl).
# python3/make/g++: bcrypt es un módulo nativo; normalmente descarga un
# binario precompilado, pero si no hay uno para esta plataforma lo compila.
RUN apk add --no-cache openssl python3 make g++

COPY package*.json ./
COPY prisma ./prisma
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

# --- Etapa de producción ---
# Se copian los node_modules ya instalados (y bcrypt ya compilado) desde la
# etapa de build, en vez de volver a instalar: más rápido y sin necesitar
# compiladores en la imagen final.
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY scripts ./scripts

EXPOSE 3001

# Ejecuta migraciones pendientes y luego arranca el servicio, igual que el
# resto de microservicios de MediaStream.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
