# CI/CD Pipelines for Bun Applications

## GitHub Actions

Complete workflow for building and deploying Bun Docker images.

### Basic Build and Push

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run tests
        run: bun test

      - name: Build application
        run: bun run build

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Deploy to production
        run: |
          # Add your deployment commands here
          # e.g., kubectl apply, helm upgrade, etc.
          echo "Deploying to production..."
```

## GitLab CI

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - build
  - deploy

variables:
  DOCKER_IMAGE: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA

test:
  stage: test
  image: oven/bun:latest
  script:
    - bun install --frozen-lockfile
    - bun test
  only:
    - merge_requests
    - main

build:
  stage: build
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $DOCKER_IMAGE .
    - docker push $DOCKER_IMAGE
  only:
    - main

deploy:
  stage: deploy
  image: bitnami/kubectl:latest
  script:
    - kubectl set image deployment/bun-app app=$DOCKER_IMAGE
  only:
    - main
  environment:
    name: production
```

## Docker Build Scripts

### Build Script

Create `scripts/docker-build.sh`:

```bash
#!/usr/bin/env bash

set -e

# Variables
IMAGE_NAME="${IMAGE_NAME:-myapp}"
VERSION="${VERSION:-latest}"
REGISTRY="${REGISTRY:-}"

# Build image
echo "🔨 Building Docker image..."
docker build -t ${IMAGE_NAME}:${VERSION} .

# Tag for registry if specified
if [ -n "$REGISTRY" ]; then
  docker tag ${IMAGE_NAME}:${VERSION} ${REGISTRY}/${IMAGE_NAME}:${VERSION}
  echo "✅ Tagged as ${REGISTRY}/${IMAGE_NAME}:${VERSION}"
fi

# Show image size
echo ""
echo "📦 Image size:"
docker images ${IMAGE_NAME}:${VERSION} --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

echo ""
echo "✅ Build complete!"
```

### Push Script

Create `scripts/docker-push.sh`:

```bash
#!/usr/bin/env bash

set -e

IMAGE_NAME="${IMAGE_NAME:-myapp}"
VERSION="${VERSION:-latest}"
REGISTRY="${REGISTRY:-docker.io}"

# Build if not exists
if ! docker images ${IMAGE_NAME}:${VERSION} -q | grep -q .; then
  echo "Image not found, building..."
  ./scripts/docker-build.sh
fi

# Login to registry
echo "🔐 Logging in to ${REGISTRY}..."
docker login ${REGISTRY}

# Push image
echo "⬆️  Pushing ${REGISTRY}/${IMAGE_NAME}:${VERSION}..."
docker push ${REGISTRY}/${IMAGE_NAME}:${VERSION}

echo "✅ Push complete!"
```

### Multi-Platform Build Script

Create `scripts/docker-build-multiplatform.sh`:

```bash
#!/usr/bin/env bash

set -e

IMAGE_NAME="${IMAGE_NAME:-myapp}"
VERSION="${VERSION:-latest}"
REGISTRY="${REGISTRY:-}"

# Create buildx builder if not exists
if ! docker buildx ls | grep -q multiplatform-builder; then
  echo "Creating buildx builder..."
  docker buildx create --name multiplatform-builder --use
fi

# Build for multiple platforms
echo "🔨 Building multi-platform image..."
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag ${IMAGE_NAME}:${VERSION} \
  ${REGISTRY:+--tag ${REGISTRY}/${IMAGE_NAME}:${VERSION}} \
  ${PUSH:+--push} \
  .

echo "✅ Multi-platform build complete!"
```

Make scripts executable:
```bash
chmod +x scripts/docker-*.sh
```

## CircleCI

Create `.circleci/config.yml`:

```yaml
version: 2.1

orbs:
  docker: circleci/docker@2.0

jobs:
  test:
    docker:
      - image: oven/bun:latest
    steps:
      - checkout
      - run:
          name: Install dependencies
          command: bun install --frozen-lockfile
      - run:
          name: Run tests
          command: bun test

  build-and-push:
    docker:
      - image: cimg/base:stable
    steps:
      - checkout
      - setup_remote_docker
      - run:
          name: Build Docker image
          command: docker build -t myapp:$CIRCLE_SHA1 .
      - run:
          name: Push to registry
          command: |
            echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin
            docker push myapp:$CIRCLE_SHA1

workflows:
  build-deploy:
    jobs:
      - test
      - build-and-push:
          requires:
            - test
          filters:
            branches:
              only: main
```

## Automated Deployment with ArgoCD

Create `argocd-application.yaml`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: bun-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/yourorg/yourrepo
    targetRevision: HEAD
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Package.json Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "docker:build": "docker build -t myapp:latest .",
    "docker:build:dev": "docker build -f Dockerfile.dev -t myapp:dev .",
    "docker:run": "docker run -p 3000:3000 myapp:latest",
    "docker:run:dev": "docker-compose up",
    "docker:push": "./scripts/docker-push.sh",
    "docker:clean": "docker system prune -af",
    "ci:test": "bun test --coverage",
    "ci:build": "bun run build && docker build -t myapp:ci ."
  }
}
```

## Environment-Specific Builds

Use Docker build args for environment-specific builds:

```dockerfile
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

ARG API_URL
ENV API_URL=${API_URL}
```

Build with:
```bash
docker build \
  --build-arg NODE_ENV=staging \
  --build-arg API_URL=https://staging-api.example.com \
  -t myapp:staging .
```

## Security Scanning in CI

Add vulnerability scanning:

```yaml
- name: Run Trivy scanner
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.DOCKER_IMAGE }}
    format: 'sarif'
    output: 'trivy-results.sarif'

- name: Upload Trivy results to GitHub Security
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: 'trivy-results.sarif'
```
