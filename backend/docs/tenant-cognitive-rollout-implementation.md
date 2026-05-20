# Tenant Cognitive Rollout — Implementação

## Sequência

**KPI → Summary → Chat** (por tenant, isolado).

## API

`/api/internal/tenant-rollout`

| Método | Rota |
|--------|------|
| GET | `/status`, `/tenants`, `/health`, `/stability`, `/activation`, `/report` |
| POST | `/activate/:tenant`, `/deactivate/:tenant` |

**Activação real:** `{ "execute": true, "approved_by": "ops@empresa", "channel": "kpi" }`  
Se `channel` omitido, activa o próximo canal da sequência.

## Flags

| Variável | Default |
|----------|---------|
| `IMPETUS_TENANT_COGNITIVE_ROLLOUT` | off |
| `IMPETUS_TENANT_ROLLOUT_ACTIVATION` | off |
| `IMPETUS_TENANT_ROLLOUT_OBSERVABILITY` | on |

## Testes

```bash
npm run test:tenant-cognitive-rollout
```
