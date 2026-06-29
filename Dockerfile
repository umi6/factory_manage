FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173 3141

CMD ["./node_modules/.bin/concurrently", "npm run dev:backend", "npm run dev:frontend -- --host 0.0.0.0"]
