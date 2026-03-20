FROM node:22.11.0

WORKDIR /app

COPY .env .env
COPY package*.json ./
COPY pnpm-lock.yaml ./  
COPY hardhat.config.ts ./
COPY tsconfig.json ./
COPY contracts ./contracts
COPY deploy ./deploy
# COPY scripts ./scripts

RUN npm install -g pnpm && pnpm install

EXPOSE 6969

CMD ["pnpm", "run", "server"]
