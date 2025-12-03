# ---- Base image with Node ----
FROM node:20-slim

# ---- Install dependencies needed by Chromium ----
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libatspi2.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxrandr2 \
  xdg-utils \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Puppeteer will look here if we set this
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Work directory
WORKDIR /app

# Copy package files and install
COPY package*.json ./
RUN npm install

# Copy the rest of the backend
COPY . .

# Expose your server port (Render ignores EXPOSE but good practice)
EXPOSE 5000

# Start command
CMD ["node", "server.js"]
