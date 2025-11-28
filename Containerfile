# syntax=docker/dockerfile:1

FROM debian:bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      bash \
      ca-certificates \
      curl \
      make && \
    rm -rf /var/lib/apt/lists/*

# Copy only what is required to refresh the emoji metadata bundle.
COPY Makefile .
COPY scripts ./scripts
COPY dist ./dist


FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
RUN chmod -R a+rX /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
