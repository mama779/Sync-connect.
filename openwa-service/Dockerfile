# Dockerfile para Microservicio OpenWA WhatsApp Web 24/7
FROM node:20-slim

# Instalar Chromium y dependencias necesarias para Puppeteer / OpenWA
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libdrm2 \
    libgbm1 \
    libasound2 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libpango-1.0-0 \
    libcairo2 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/chromium
ENV PORT=8080

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Crear directorio para persistencia de sesiones de WhatsApp
RUN mkdir -p sync_connect_openwa_session

EXPOSE 8080

CMD ["node", "index.js"]
