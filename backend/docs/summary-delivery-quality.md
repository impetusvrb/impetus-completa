# Phase Z.9 — Summary Delivery Quality

## Objectivo

Medir utilidade narrativa, força de sinal, ruído contextual e guidance fraco — **sem** reescrita automática.

## Métricas

- `summaryOperationalUsefulness` — acções operacionais no texto.
- `narrativeSignalStrength` — diversidade lexical / sinal.
- `contextualNarrativeNoise` — marcadores de ruído (placeholder, lorem, etc.).
- `weakNarrativeGuidanceAdvisor` — recomendações only.

## Flag

`IMPETUS_SUMMARY_DELIVERY_QUALITY` — OFF por defeito.

## Integração

Bloco `summary_delivery_quality` em `GET /dashboard/smart-summary` quando contexto piloto activo.

## API

`/api/internal/summary-delivery-quality/*`

## Testes

```bash
npm run test:summary-delivery-quality
```

## Cockpit

`summaryCockpitConsistency` alinha narrativa com KPIs visíveis (Z.8 alignment reutilizado).
