FROM node:22-slim

RUN npm install -g pnpm@10

WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY lib ./lib
COPY artifacts/vendorgrid/package.json ./artifacts/vendorgrid/
COPY artifacts/api-server/package.json ./artifacts/api-server/

RUN pnpm install --no-frozen-lockfile

COPY artifacts/vendorgrid ./artifacts/vendorgrid
COPY artifacts/api-server ./artifacts/api-server
COPY attached_assets ./attached_assets

RUN PORT=3000 BASE_PATH=/ pnpm --filter @workspace/vendorgrid run build
RUN pnpm --filter @workspace/api-server run build
RUN cp -r artifacts/vendorgrid/dist/public artifacts/api-server/dist/public

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
