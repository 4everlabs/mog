# Dockerfile Templates for Bun

This reference provides optimized Dockerfile templates for various Bun application types.

## Web Application (Standard)

```dockerfile
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:1-alpine AS runtime
WORKDIR /app
RUN addgroup --system --gid 1001 bunuser && \
    adduser --system --uid 1001 bunuser
COPY --from=deps --chown=bunuser:bunuser /app/node_modules ./node_modules
COPY --from=builder --chown=bunuser:bunuser /app/dist ./dist
COPY --from=builder --chown=bunuser:bunuser /app/package.json ./
USER bunuser
EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
```

## Compiled Binary (Minimal)

```dockerfile
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun build src/index.ts --compile --outfile server

FROM gcr.io/distroless/base-debian12
COPY --from=builder /app/server /server
EXPOSE 3000
ENTRYPOINT ["/server"]
```

## API Server with Database

```dockerfile
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build
RUN bunx prisma generate

FROM oven/bun:1-alpine AS runtime
WORKDIR /app
RUN addgroup --system --gid 1001 bunuser && \
    adduser --system --uid 1001 bunuser
COPY --from=deps --chown=bunuser:bunuser /app/node_modules ./node_modules
COPY --from=builder --chown=bunuser:bunuser /app/dist ./dist
COPY --from=builder --chown=bunuser:bunuser /app/prisma ./prisma
COPY --from=builder --chown=bunuser:bunuser /app/package.json ./
USER bunuser
EXPOSE 3000
CMD ["sh", "-c", "bunx prisma migrate deploy && bun run dist/index.js"]
```

## Monorepo Application

```dockerfile
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN bun install --frozen-lockfile

FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps ./apps
COPY . .
RUN bun run build --filter=api

FROM oven/bun:1-alpine AS runtime
WORKDIR /app
RUN addgroup --system --gid 1001 bunuser && \
    adduser --system --uid 1001 bunuser
COPY --from=deps --chown=bunuser:bunuser /app/node_modules ./node_modules
COPY --from=builder --chown=bunuser:bunuser /app/apps/api/dist ./dist
COPY --from=builder --chown=bunuser:bunuser /app/apps/api/package.json ./
USER bunuser
EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
```

## Development Image

```dockerfile
FROM oven/bun:1-alpine
WORKDIR /app

# Install development dependencies
RUN apk add --no-cache git

COPY package.json bun.lockb ./
RUN bun install

COPY . .

EXPOSE 3000 9229

CMD ["bun", "run", "--hot", "--inspect=0.0.0.0:9229", "src/index.ts"]
```

## Full-Stack Application (Frontend + Backend)

```dockerfile
# Frontend build
FROM oven/bun:1-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/bun.lockb ./
RUN bun install --frozen-lockfile
COPY frontend/ ./
RUN bun run build

# Backend build
FROM oven/bun:1-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package.json backend/bun.lockb ./
RUN bun install --frozen-lockfile --production
COPY backend/ ./

# Runtime
FROM oven/bun:1-alpine AS runtime
WORKDIR /app
RUN addgroup --system --gid 1001 bunuser && \
    adduser --system --uid 1001 bunuser

# Copy backend
COPY --from=backend-builder --chown=bunuser:bunuser /app/backend ./

# Copy frontend build to public directory
COPY --from=frontend-builder --chown=bunuser:bunuser /app/frontend/dist ./public

USER bunuser
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
```

## Worker/Background Job

```dockerfile
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1-alpine AS runtime
WORKDIR /app
RUN addgroup --system --gid 1001 bunuser && \
    adduser --system --uid 1001 bunuser
COPY --from=deps --chown=bunuser:bunuser /app/node_modules ./node_modules
COPY --chown=bunuser:bunuser . .
USER bunuser

# No EXPOSE needed for workers
CMD ["bun", "run", "src/worker.ts"]
```

## CLI Tool

```dockerfile
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun build src/cli.ts --compile --outfile mycli

FROM gcr.io/distroless/base-debian12
COPY --from=builder /app/mycli /usr/local/bin/mycli
ENTRYPOINT ["/usr/local/bin/mycli"]
```

## Serverless/Lambda Function

```dockerfile
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun build src/handler.ts --target=node --outdir=dist

FROM public.ecr.aws/lambda/nodejs:20
COPY --from=builder /app/dist ${LAMBDA_TASK_ROOT}/
COPY --from=builder /app/node_modules ${LAMBDA_TASK_ROOT}/node_modules

# Install Bun in Lambda
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

CMD ["dist/handler.handler"]
```

## Multi-Platform (ARM64 + AMD64)

```dockerfile
FROM --platform=$BUILDPLATFORM oven/bun:1-alpine AS deps
ARG TARGETPLATFORM
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

FROM --platform=$BUILDPLATFORM oven/bun:1-alpine AS builder
ARG TARGETPLATFORM
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:1-alpine AS runtime
WORKDIR /app
RUN addgroup --system --gid 1001 bunuser && \
    adduser --system --uid 1001 bunuser
COPY --from=deps --chown=bunuser:bunuser /app/node_modules ./node_modules
COPY --from=builder --chown=bunuser:bunuser /app/dist ./dist
COPY --from=builder --chown=bunuser:bunuser /app/package.json ./
USER bunuser
EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
```

Build command:
```bash
docker buildx build --platform linux/amd64,linux/arm64 -t myapp:latest .
```

## With NGINX Reverse Proxy

```dockerfile
# App build
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# NGINX + Bun runtime
FROM oven/bun:1-alpine AS runtime
WORKDIR /app

# Install NGINX
RUN apk add --no-cache nginx

# Copy app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Copy NGINX config
COPY nginx.conf /etc/nginx/nginx.conf

# Create startup script
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'nginx' >> /start.sh && \
    echo 'bun run dist/index.js' >> /start.sh && \
    chmod +x /start.sh

EXPOSE 80 3000
CMD ["/start.sh"]
```

## With Health Checks

```dockerfile
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1-alpine AS runtime
WORKDIR /app
RUN addgroup --system --gid 1001 bunuser && \
    adduser --system --uid 1001 bunuser
COPY --from=deps --chown=bunuser:bunuser /app/node_modules ./node_modules
COPY --chown=bunuser:bunuser . .
USER bunuser
EXPOSE 3000

# HTTP health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun run -e 'fetch("http://localhost:3000/health").then(r => r.ok ? process.exit(0) : process.exit(1))'

CMD ["bun", "run", "src/index.ts"]
```

## Caching Optimization

```dockerfile
FROM oven/bun:1-alpine AS deps
WORKDIR /app

# Cache mount for bun install
RUN --mount=type=cache,target=/root/.bun/install/cache \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=bun.lockb,target=bun.lockb \
    bun install --frozen-lockfile --production

FROM oven/bun:1-alpine AS runtime
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
```

## Image Size Comparison

| Configuration | Size | Use Case |
|--------------|------|----------|
| Bun Alpine (full) | ~90 MB | Development, debugging |
| Bun Alpine (multi-stage) | ~50 MB | Production apps |
| Compiled binary (distroless) | ~40 MB | Minimal production |
| Node.js Alpine | ~180 MB | Baseline comparison |

## Best Practices

1. **Use multi-stage builds** to reduce final image size
2. **Copy only necessary files** to runtime image
3. **Use .dockerignore** to exclude dev files
4. **Run as non-root user** for security
5. **Enable health checks** for container orchestration
6. **Use specific version tags** instead of `latest`
7. **Leverage build cache** with proper layer ordering
8. **Scan images** for vulnerabilities regularly

## Resources

- [Bun Docker Documentation](https://bun.sh/docs/install/docker)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Multi-stage Build Guide](https://docs.docker.com/build/building/multi-stage/)
