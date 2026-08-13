FROM oven/bun:1.3.13

WORKDIR /app

COPY . .

RUN bun install --frozen-lockfile

EXPOSE 5173 8787

CMD ["bun", "run", "dev"]