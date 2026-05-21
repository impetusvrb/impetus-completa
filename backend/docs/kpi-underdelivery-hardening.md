# Phase Z.6 — KPI Underdelivery Hardening

Protege contra:

- Cockpit perigosamente vazio
- Operational blindness (operador sem KPIs operacionais)
- Executive blindness (executivo sem visão estratégica)
- Underdelivery crítico

## Mínimos (sem fabricação)

Restauro apenas a partir de `kpis_before` / snapshot do tenant piloto.

## API

`/api/internal/kpi-runtime-stability/underdelivery` e `/blindness`

## Flag

`IMPETUS_KPI_UNDERDELIVERY_HARDENING` — default **off**

## Testes

```bash
npm run test:kpi-underdelivery-hardening
```
