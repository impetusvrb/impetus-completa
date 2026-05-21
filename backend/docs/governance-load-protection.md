# Phase Z.11 — Governance Load Protection

## Objectivo

Proteger o runtime contra overload, saturação de observabilidade e entropia operacional.

## Detecções

- Governance overload
- Observability saturation (`layers > 9`)
- Runtime entropy (instabilidade + overload + saturação)
- Scaling instability

## Flags

| Flag | Defeito |
|------|---------|
| `IMPETUS_GOVERNANCE_LOAD_PROTECTION` | OFF |
| `IMPETUS_RUNTIME_EXPANSION_CONTROL` | OFF |
| `IMPETUS_RUNTIME_EXPANSION_OBSERVABILITY` | ON |

**Chat** e **boundary** continuam OFF.

## API

- `/api/internal/runtime-expansion-observability/*` — entropy, pressure, overload, evolution, report
- Protecção exposta em `/dashboard/me` → `governance_load_protection`

## PM2

```bash
pm2 reload impetus-backend --update-env
```

## Roadmap pós-Z.11

- Chat runtime supervisionado (fase dedicada)
- Boundary enforcement global (fase futura)
- Multi-tenant expansion após métricas de scaling readiness estáveis

## Testes

```bash
npm run test:governance-load-protection
npm run test:tenant-expansion-scaling
npm run test:runtime-scaling-readiness
```
