# Phase Z.4 — Pilot Observability Consolidation

Centraliza observabilidade do piloto:

- Leakage (menu + KPI simulado)
- Underdelivery (menu + KPI simulado)
- Maturidade
- Degradation safety
- Conflitos de targeting
- Timeline de governance
- Rollback readiness

## APIs

| Prefixo | Endpoints |
|---------|-----------|
| `/api/internal/pilot-observability` | status, leakage, underdelivery, targeting, convergence, degradation, report |
| `/api/internal/pilot-maturity` | maturity, readiness |
| `/api/internal/delivery-quality` | dashboard-quality |

## Integração `/dashboard/me`

Bloco aditivo `pilot_operational_stabilization` (após `pilot_runtime_enforcement`).

Frontend ignora chaves novas; legacy intacto.

## Rollout supervisionado

1. Manter Z.3 menu enforcement activo no piloto
2. `IMPETUS_PILOT_OBSERVABILITY=on` (default)
3. Activar análises gradualmente (maturity, menu stability, delivery quality)
4. Revisar `/api/internal/pilot-observability/report`
5. Só quando `kpi_channel_ready=true` → planear KPI enforcement (não automático)

## Rollback

Usar Z.3: `POST /api/internal/pilot-tenants/rollback/:tenant`

## Testes

```bash
npm run test:pilot-observability
npm run test:pilot-operational-stabilization
```
