# Multi-Platform Docker Builds for Bun

Guide for building Docker images that work on both AMD64 and ARM64 architectures.

## Why Multi-Platform?

- **ARM64**: Apple Silicon (M1/M2), AWS Graviton, Raspberry Pi
- **AMD64**: Traditional Intel/AMD servers, most cloud instances
- **Bun**: Works natively on both architectures

## Basic Multi-Platform Dockerfile

```dockerfile
FROM --platform=$BUILDPLATFORM oven/bun:1-alpine AS deps
ARG TARGETPLATFORM
ARG BUILDPLATFORM

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

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]
```

## Build Commands

### Setup Buildx

```bash
# Create a new builder
docker buildx create --name multiplatform-builder --use

# Verify builder
docker buildx inspect --bootstrap
```

### Build for Multiple Platforms

```bash
# Build and push (requires registry)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag myregistry/myapp:latest \
  --push \
  .

# Build and load locally (single platform only)
docker buildx build \
  --platform linux/amd64 \
  --tag myapp:latest \
  --load \
  .
```

### Build Script

Create `scripts/build-multiplatform.sh`:

```bash
#!/usr/bin/env bash

set -e

IMAGE_NAME="${IMAGE_NAME:-myapp}"
VERSION="${VERSION:-latest}"
REGISTRY="${REGISTRY:-docker.io}"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"

# Ensure builder exists
if ! docker buildx ls | grep -q multiplatform; then
  echo "Creating buildx builder..."
  docker buildx create --name multiplatform --use
fi

echo "Building for platforms: $PLATFORMS"

# Build and push
docker buildx build \
  --platform $PLATFORMS \
  --tag ${REGISTRY}/${IMAGE_NAME}:${VERSION} \
  --push \
  .

echo "✅ Multi-platform build complete!"
echo "   Pushed to: ${REGISTRY}/${IMAGE_NAME}:${VERSION}"
```

## Platform-Specific Optimizations

### Conditional Dependencies

```dockerfile
FROM oven/bun:1-alpine AS deps
ARG TARGETARCH

WORKDIR /app
COPY package.json bun.lockb ./

# Install architecture-specific packages
RUN if [ "$TARGETARCH" = "arm64" ]; then \
      apk add --no-cache libffi-dev; \
    fi

RUN bun install --frozen-lockfile --production
```

### Binary Selection

```dockerfile
ARG TARGETARCH

# Copy architecture-specific binaries
COPY bin/app-${TARGETARCH} /usr/local/bin/app
```

## Testing Multi-Platform Images

### Local Testing with QEMU

```bash
# Install QEMU for cross-platform emulation
docker run --privileged --rm tonistiigi/binfmt --install all

# Test ARM64 image on AMD64 machine
docker run --platform linux/arm64 myapp:latest

# Test AMD64 image on ARM64 machine
docker run --platform linux/amd64 myapp:latest
```

### Verify Image Platforms

```bash
# Inspect image platforms
docker buildx imagetools inspect myregistry/myapp:latest

# Output shows:
# Name:      myregistry/myapp:latest
# MediaType: application/vnd.docker.distribution.manifest.list.v2+json
# Digest:    sha256:abc123...
# Manifests:
#   Name:      myregistry/myapp:latest@sha256:def456...
#   MediaType: application/vnd.docker.distribution.manifest.v2+json
#   Platform:  linux/amd64
#
#   Name:      myregistry/myapp:latest@sha256:ghi789...
#   MediaType: application/vnd.docker.distribution.manifest.v2+json
#   Platform:  linux/arm64
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Set up QEMU
  uses: docker/setup-qemu-action@v3

- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build and push multi-platform
  uses: docker/build-push-action@v5
  with:
    context: .
    platforms: linux/amd64,linux/arm64
    push: true
    tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### GitLab CI

```yaml
build-multiplatform:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker run --privileged --rm tonistiigi/binfmt --install all
    - docker buildx create --use
  script:
    - docker buildx build
        --platform linux/amd64,linux/arm64
        --tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
        --push
        .
```

## Performance Considerations

### Build Time

Multi-platform builds take longer:
- **Single platform**: ~2-3 minutes
- **Multi-platform**: ~4-6 minutes

Optimize with:
```yaml
# Use GitHub Actions cache
cache-from: type=gha
cache-to: type=gha,mode=max
```

### Image Size

Bun images are small on both platforms:
- **AMD64**: ~90MB (Alpine) / ~40MB (binary)
- **ARM64**: ~90MB (Alpine) / ~40MB (binary)

## Troubleshooting

### Build Fails on One Platform

```bash
# Build platforms separately to identify issues
docker buildx build --platform linux/amd64 -t myapp:amd64 .
docker buildx build --platform linux/arm64 -t myapp:arm64 .
```

### QEMU Performance

Cross-platform emulation is slow. For faster builds:
1. Use native builders for each architecture
2. Use remote builders (AWS Graviton for ARM, EC2 for AMD)

```bash
# Add remote builder
docker buildx create \
  --name remote-arm64 \
  --platform linux/arm64 \
  ssh://user@arm64-host
```

### Registry Issues

Some registries don't support multi-platform manifests:
```bash
# Check if registry supports manifest lists
docker buildx imagetools inspect myregistry/myapp:latest
```

## Advanced: Native Builders

Use separate machines for each architecture:

```bash
# AMD64 builder (local)
docker buildx create --name amd64-builder --platform linux/amd64

# ARM64 builder (remote Graviton instance)
docker buildx create \
  --name arm64-builder \
  --platform linux/arm64 \
  --append ssh://user@graviton-host

# Use both builders
docker buildx use amd64-builder
docker buildx build --platform linux/amd64,linux/arm64 --push .
```

## Kubernetes Deployment

Multi-platform images work seamlessly in K8s:

```yaml
spec:
  containers:
  - name: app
    image: myregistry/myapp:latest  # Pulls correct platform automatically
```

Kubernetes automatically selects the correct image variant based on node architecture.
