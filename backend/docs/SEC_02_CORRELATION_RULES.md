# SEC-02 — Correlation Rules

## Agrupamento

| Critério | Default |
|----------|---------|
| Janela temporal | 4h (`SECURITY_CORRELATION_WINDOW_MS`) |
| Fecho por inactividade | 30min (`SECURITY_INCIDENT_CLOSURE_MS`) |
| Chave primária | IP + classification |
| Chave secundária | UA normalizado + classification |

## Severidade

| Nível | Condições típicas |
|-------|-------------------|
| INFO | HEALTH_CHECK, OPERATIONAL_ACCESS |
| LOW | Volume < 100, CRAWLER |
| MEDIUM | 100–5000 requests, ENUMERATION |
| HIGH | CREDENTIAL_SCAN + volume alto |
| CRITICAL | ≥20000 requests ou score composto ≥8 |

## Risk Score (0.0–1.0)

Pesos: classification (30%), volume (25%), paths (10%), IPs (5%), duration (10%), 401 (10%), 404 (10%).

## Timeline phases

RECONNAISSANCE → ENUMERATION → RESOURCE_DISCOVERY → AUTH_ATTEMPT → PERSISTENCE → CLOSURE

Geradas deterministicamente por ordem temporal e duração do incidente.
