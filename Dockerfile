FROM node:20-slim

# Install Chromium + Dependencies
RUN apt-get update && apt-get install -y \
  chromium \
  chromium-driver \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxi6 \
  libxtst6 \
  libnss3 \
  libcups2 \
  libxrandr2 \
  libasound2 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libgtk-3-0 \
  libdrm2 \
  libgbm1 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  fonts-liberation \
  xdg-utils \
  wget \
  ca-certificates \
  --no-install-recommends && \
  rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .

CMD ["npm", "start"]
