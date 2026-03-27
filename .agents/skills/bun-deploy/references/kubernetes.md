# Kubernetes Deployment for Bun Applications

Complete guide for deploying Bun applications to Kubernetes.

## Basic Deployment

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bun-app
  labels:
    app: bun-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bun-app
  template:
    metadata:
      labels:
        app: bun-app
    spec:
      containers:
      - name: app
        image: myregistry/myapp:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        envFrom:
        - secretRef:
            name: app-secrets
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: bun-app
spec:
  selector:
    app: bun-app
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  type: LoadBalancer
```

## Secrets Management

Create `k8s/secrets.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  DATABASE_URL: postgresql://user:pass@db:5432/prod
  SESSION_SECRET: your-secret-key
  API_KEY: your-api-key
```

**Never commit secrets to git!** Use sealed secrets or external secret managers.

## ConfigMaps

Create `k8s/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  PORT: "3000"
```

Reference in deployment:

```yaml
envFrom:
- configMapRef:
    name: app-config
```

## Horizontal Pod Autoscaling

Create `k8s/hpa.yaml`:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: bun-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: bun-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Ingress Configuration

Create `k8s/ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bun-app-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - app.example.com
    secretName: app-tls
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: bun-app
            port:
              number: 80
```

## Deployment Commands

```bash
# Apply all manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get deployments
kubectl get pods
kubectl get services

# View logs
kubectl logs -f deployment/bun-app

# Scale manually
kubectl scale deployment bun-app --replicas=5

# Rolling update
kubectl set image deployment/bun-app app=myregistry/myapp:v2

# Rollback
kubectl rollout undo deployment/bun-app

# Check rollout status
kubectl rollout status deployment/bun-app
```

## Resource Optimization for Bun

Bun applications typically use less memory than Node.js:

```yaml
resources:
  requests:
    memory: "64Mi"   # Bun uses ~50% less memory
    cpu: "50m"       # Lower CPU for startup
  limits:
    memory: "256Mi"  # Still safer than Node.js 512Mi
    cpu: "300m"
```

## Health Checks Best Practices

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30  # Give Bun time to start
  periodSeconds: 10        # Check every 10s
  timeoutSeconds: 3        # Fail after 3s
  failureThreshold: 3      # Restart after 3 failures

readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5   # Bun starts fast
  periodSeconds: 5
  timeoutSeconds: 2
  failureThreshold: 2
```

## Multi-Environment Setup

Use Kustomize for environment-specific configs:

```
k8s/
├── base/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── kustomization.yaml
├── overlays/
│   ├── staging/
│   │   ├── kustomization.yaml
│   │   └── patch-replicas.yaml
│   └── production/
│       ├── kustomization.yaml
│       └── patch-replicas.yaml
```

Deploy:
```bash
kubectl apply -k k8s/overlays/staging
kubectl apply -k k8s/overlays/production
```

## Monitoring and Observability

```yaml
apiVersion: v1
kind: Service
metadata:
  name: bun-app-metrics
  labels:
    app: bun-app
spec:
  selector:
    app: bun-app
  ports:
  - name: metrics
    port: 9090
    targetPort: 9090
```

Add Prometheus annotations:

```yaml
template:
  metadata:
    annotations:
      prometheus.io/scrape: "true"
      prometheus.io/port: "9090"
      prometheus.io/path: "/metrics"
```
