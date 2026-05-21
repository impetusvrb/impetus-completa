# Phase Z.1 — Tenant Delivery Profiling

## Objetivo

Detectar tenants **incompletos** antes de qualquer enforcement contextual.

## Bloqueios automáticos (preparation only)

Enforcement **não deve activar** quando:

- `domain_axis` unknown/generic
- `hierarchy_level` ausente
- `profile_code` ausente
- `inference_complete === false`

Evento: `TENANT_ENFORCEMENT_BLOCKED_INCOMPLETE`

## API

`/api/internal/tenant-profiling/{status,readiness,tenants,report}`

## Testes

```bash
npm run test:tenant-profiling
```
