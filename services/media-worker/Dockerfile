FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY services/media-worker/package.json ./package.json
COPY services/media-worker/worker.mjs ./worker.mjs

ENV NODE_ENV=production
CMD ["npm", "start"]
