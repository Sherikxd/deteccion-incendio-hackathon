# ============================================================
# PyroWatch Valle — Dockerfile de producción (multi-stage)
# Build:  docker build -t pyrowatch .
# Run:    docker run -d -p 3000:3000 -e OPENROUTER_API_KEY=sk-... pyrowatch
# ============================================================

# ---------- Etapa 1: compilación del frontend (Vite) ----------
FROM node:22-alpine AS build

WORKDIR /app

# Instalar dependencias primero para aprovechar la caché de capas
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copiar el código fuente y compilar el frontend a /app/dist
COPY . .
RUN npm run build


# ---------- Etapa 2: imagen ligera de ejecución ----------
FROM node:22-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

# Solo dependencias de producción (tsx viene en el lock como transitivo de vite,
# por eso está disponible para ejecutar server.ts en producción)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Backend (Express + SSE + WebSocket) y frontend compilado
COPY server.ts tsconfig.json ./
COPY --from=build /app/dist ./dist

# Permitir ejecutar `tsx` directamente en el CMD
ENV PATH="/app/node_modules/.bin:$PATH"

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/health" || exit 1

CMD ["tsx", "server.ts"]
