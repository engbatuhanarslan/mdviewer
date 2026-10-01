FROM node:22-alpine

WORKDIR /app

COPY --chown=node:node . .
RUN mkdir -p /app/documents && chown -R node:node /app

USER node

ENV HOST=0.0.0.0 \
    PORT=4173

EXPOSE 4173

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:4173/api/documents >/dev/null || exit 1

CMD ["node", "server.mjs"]
