# Build from the repository root:
# docker build -f pp/deploy/Dockerfile --target web .
ARG BUN_IMAGE=oven/bun:1.4.2
ARG CADDY_IMAGE=caddy:2.10.2-alpine

FROM ${BUN_IMAGE} AS source
USER root
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates git openssh-client ripgrep python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . .
RUN HUSKY=0 bun install --frozen-lockfile

FROM source AS app-build
ARG VITE_PP_HOME_URL
ARG VITE_PP_CHAT_URL
ARG VITE_PP_FLOW_URL
ENV VITE_PP_ENABLED=true \
    VITE_OPENCODE_SERVER_MODE=origin \
    VITE_PP_HOME_URL=${VITE_PP_HOME_URL} \
    VITE_PP_CHAT_URL=${VITE_PP_CHAT_URL} \
    VITE_PP_FLOW_URL=${VITE_PP_FLOW_URL}
RUN bun run --cwd packages/app build

FROM source AS backend
RUN mkdir -p /workspace /var/lib/opencode /home/bun \
    && chown -R bun:bun /workspace /var/lib/opencode /home/bun \
    && chmod 755 /app/pp/deploy/backend-entrypoint.sh
ENV XDG_DATA_HOME=/var/lib/opencode/data \
    XDG_STATE_HOME=/var/lib/opencode/state \
    XDG_CACHE_HOME=/var/lib/opencode/cache \
    XDG_CONFIG_HOME=/var/lib/opencode/config \
    OPENCODE_CONFIG=/config/opencode.json \
    OPENCODE_DISABLE_MODELS_FETCH=true \
    OPENCODE_DISABLE_AUTOUPDATE=true
USER bun
WORKDIR /workspace
EXPOSE 4096
ENTRYPOINT ["/app/pp/deploy/backend-entrypoint.sh"]

FROM ${BUN_IMAGE} AS router
WORKDIR /app
COPY pp/router /app/pp/router
USER bun
EXPOSE 8787
CMD ["bun", "pp/router/src/index.ts"]

FROM ${CADDY_IMAGE} AS web
COPY --from=app-build /app/packages/app/dist /srv
COPY pp/deploy/Caddyfile /etc/caddy/Caddyfile
COPY pp/deploy/site.caddy /etc/caddy/site.caddy
