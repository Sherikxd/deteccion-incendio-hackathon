# ============================================================
# NatureIntelligence — Dockerfile de producción (multi-stage)
# Build:  docker build -t natureintelligence .
# Run:    docker run -d -p 3000:3000 -e OPENROUTER_API_KEY=sk-... natureintelligence
# ============================================================

# ---------- Etapa 1: compilación del frontend (Vite) ----------
FROM node:22-alpine AS build

WORKDIR /app

# Instalar dependencias primero para aprovechar la caché de capas
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copiar el código fuente y compilar el frontend y el backend a JavaScript
COPY . .
RUN npm run build
RUN npm run build:server


# ---------- Etapa 2: imagen ligera de ejecución ----------
FROM node:22-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

# Instalar únicamente las dependencias necesarias para ejecutar el servidor
# compilado y servir el frontend.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Backend compilado (Express + SSE + WebSocket) y frontend compilado
COPY --from=build /app/build-server ./build-server
COPY --from=build /app/dist ./build-server/dist
ENV PATH="/app/node_modules/.bin:$PATH"

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1

CMD ["node", "build-server/server.js"]
