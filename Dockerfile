# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /app/wiki

COPY ./package.json ./
RUN npm install --no-audit --no-fund

COPY ./tsconfig.json ./
COPY ./src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3002 \
    WIKI_DATA_DIR=/data
    
RUN apk add --no-cache su-exec \
    && addgroup -S app \
    && adduser -S app -G app \
    && mkdir -p /data \
    && chown -R app:app /data

COPY --from=build /app/wiki/node_modules ./wiki/node_modules
COPY --from=build /app/wiki/dist ./wiki/dist
COPY --from=build /app/wiki/package.json ./wiki/package.json
COPY ./docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3003

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "wiki/dist/index.js"]
