FROM node:20.10.0-alpine
# add php8 and sockets
RUN apk add --no-cache php82 php82-sockets
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml package.json ./
RUN pnpm install
COPY servers.php ./
COPY ./src/ ./src/
RUN pnpm build
CMD node dist/server.js