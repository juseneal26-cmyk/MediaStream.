# --- Etapa de build ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Variables de entorno en BUILD TIME (sección 8.1 del documento): la URL del
# API Gateway se fija al construir la imagen, distinta por entorno.
ARG VITE_API_GATEWAY_URL=http://localhost:3000
ENV VITE_API_GATEWAY_URL=$VITE_API_GATEWAY_URL

RUN npm run build

# --- Etapa de producción: nginx sirviendo los estáticos ---
FROM nginx:1.27-alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
