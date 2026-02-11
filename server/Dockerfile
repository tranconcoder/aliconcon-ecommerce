FROM oven/bun:1

WORKDIR /app

COPY package.json ./
COPY bun.lock ./

RUN bun install

COPY . .

EXPOSE 5000

CMD ["bun", "run", "dev"]
