# ---- Build Next.js ----
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ---- Final image ----
FROM python:3.12-slim

# Install Node.js and supervisor
RUN apt-get update && apt-get install -y curl supervisor && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Backend
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./

# Frontend (pre-built)
WORKDIR /app/frontend
COPY --from=frontend-build /app/frontend/.next ./.next
COPY --from=frontend-build /app/frontend/node_modules ./node_modules
COPY --from=frontend-build /app/frontend/package.json ./package.json
COPY --from=frontend-build /app/frontend/public ./public
COPY --from=frontend-build /app/frontend/next.config.js ./next.config.js

# Supervisord config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 3000 5000

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
