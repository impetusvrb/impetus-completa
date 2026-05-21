# Phase Z.4 — Delivery Quality Stabilization

Mede qualidade do delivery sem alterar payload:

- `delivery_quality_score`
- Utilidade operacional por tier
- Noise contextual (ex.: SST em perfil RH)
- `dashboard_signal_quality` (cockpit genérico vs útil)

## API

`GET /api/internal/delivery-quality/{status,dashboard-quality,report}`

## Flag

`IMPETUS_DELIVERY_QUALITY_ANALYSIS` — default **off**

## Testes

```bash
npm run test:delivery-quality
```
