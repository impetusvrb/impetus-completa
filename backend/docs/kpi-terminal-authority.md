# KPI Terminal Authority (Z.16)

## Regras

Após lock (`IMPETUS_TERMINAL_KPI_LOCK=on` ou `governance_freeze_state.governance_locked`):

- KPIs executivos (faturamento, lucro, OEE global) **não** aparecem em perfis de coordenação/operação.
- KPIs de outro `domain` são removidos.
- Restauro mínimo: apenas KPIs do `original_kpis` no mesmo domínio e sem flag executiva.

## Módulo

`finalKpiAuthority.js` — integrado em `GET /dashboard/kpis` via `applyTerminalKpiLock`.

## Endpoint interno

`GET /api/internal/terminal-governance/kpis`
