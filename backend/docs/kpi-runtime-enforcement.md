# Phase Z.5 — KPI Runtime Enforcement

Primeiro **enforcement real** de KPIs — tenant piloto, canal KPI apenas.

## Regras

- Sem fabricação de KPIs
- Sem enrichment artificial
- Graceful degradation a partir do snapshot original
- Summary/chat **bloqueados**

## Integração

`GET /dashboard/kpis` — altera `kpis` apenas quando:

1. Tenant piloto registado
2. `IMPETUS_KPI_RUNTIME_ENFORCEMENT=on`
3. `IMPETUS_TENANT_KPI_ENFORCEMENT=on`
4. Canal `kpi` activo (`POST .../kpi-runtime-enforcement/activate/:tenant`)

Bloco aditivo: `kpi_runtime_enforcement`.

## Activar (fluxo supervisionado)

```bash
# 1. Readiness + simulação
GET /api/internal/kpi-runtime-enforcement/readiness?tenant_id=PILOT

# 2. Activar canal KPI
POST /api/internal/kpi-runtime-enforcement/activate/PILOT
{ "execute": true, "approved_by": "ops@empresa", "kpis_before": [...] }

# 3. Validar GET /dashboard/kpis no tenant piloto
```

## Rollback

```bash
POST /api/internal/kpi-runtime-enforcement/rollback/PILOT
{ "execute": true, "approved_by": "ops@empresa", "kpis_before": [...] }
```

## Flags

| Variável | Default |
|----------|---------|
| `IMPETUS_KPI_RUNTIME_ENFORCEMENT` | off |
| `IMPETUS_TENANT_KPI_ENFORCEMENT` | off |
| `IMPETUS_KPI_PILOT_OBSERVABILITY` | on |

## Testes

```bash
npm run test:kpi-runtime-enforcement
```
