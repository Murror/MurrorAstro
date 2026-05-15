---
name: Staging murror-api ingress config
description: nsp-staging-murror/murror-api ingress must use ingressClassName=nginx and TLS secretName=murror-api-tls-staging
type: reference
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---
## Staging murror-api ingress — canonical config

Cluster only runs `ingress-nginx-controller` (no traefik). All staging ingresses must use `ingressClassName: nginx`, otherwise nginx won't claim the ingress and `staging.api.murror.app` returns default nginx 404 for every path (even though pods are healthy internally).

### Required spec fields

```yaml
spec:
  ingressClassName: nginx        # not traefik
  rules:
  - host: staging.api.murror.app
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: murror-api
            port: {number: 3000}
  tls:
  - hosts: [staging.api.murror.app]
    secretName: murror-api-tls-staging   # existing Let's Encrypt cert, valid until 2026-06-29
```

### Gotcha — `ambercare-app-tls` secret does NOT exist in nsp-staging-murror

Cert-manager Certificate `ambercare-app-tls` is stuck "Issuing" (DoesNotExist). The real working TLS secret is `murror-api-tls-staging` (type kubernetes.io/tls, CN=staging.api.murror.app). Do NOT set `secretName: ambercare-app-tls` — it will make nginx serve the "Kubernetes Ingress Controller Fake Certificate".

### Symptoms of misconfig

- `kubectl get ingress -n nsp-staging-murror` shows CLASS=`traefik` → broken
- `curl https://staging.api.murror.app/*` returns nginx 404 for every path
- BUT internal pods healthy (`kubectl exec` + hit `127.0.0.1:3000/api/health/live` → 200)
- `kubectl describe ingress` shows no sync events from nginx controller

### One-liner fix

```bash
kubectl patch ingress murror-api -n nsp-staging-murror --type=merge \
  -p '{"spec":{"ingressClassName":"nginx"}}'
kubectl patch ingress murror-api -n nsp-staging-murror --type=json \
  -p '[{"op":"replace","path":"/spec/tls/0/secretName","value":"murror-api-tls-staging"}]'
```

Verify: `curl -s -o /dev/null -w "%{http_code}\n" https://staging.api.murror.app/api/health/live` → 200

### Permanent fix shipped (PR #331, 2026-04-19/20)

`k8s/manifests.yml` now templates `${INGRESS_CLASS_NAME}` and `${TLS_SECRET_NAME}`. The deploy action (`.github/actions/deploy/action.yml`) derives per-env values before `envsubst`: staging→`murror-api-tls-staging`, alpha→`murror-api-tls`, prod(+us)→`murror-api-prod-tls`, preview→`ambercare-app-tls`. All envs use `nginx` (all four CI-deployed envs live on DOKS SFO2 which runs ingress-nginx; the `traefik` hardcode was dead code). Manual kubectl patches are no longer needed after deploys.

### History

- 2026-04-19: ingressClassName was `traefik` (18 days old). Patched by Claude after Astro authorized, following env-reconciliation PRs #324/#360/#361/#362 merge.
- 2026-04-19: re-patched after PR #329 + #330 deploys both reverted the ingress to the broken state.
- 2026-04-20: PR #331 merged. Post-deploy live state verified `ingressClassName=nginx` + `secretName=murror-api-tls-staging` with no manual patching. Public health + memory-room endpoints return 200.
