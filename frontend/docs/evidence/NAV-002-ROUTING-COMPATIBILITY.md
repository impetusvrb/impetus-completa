# NAV-002 — Routing Compatibility

**Data:** 2026-07-19

## Rotas certificadas preservadas

| Rota | Comportamento |
|------|---------------|
| `/app/logistics/warehouses` | ✅ + ONX layout |
| `/app/logistics/inventory` | ✅ + ONX layout |
| `/app/logistics/receiving` | ✅ + ONX layout |
| `/app/logistics/picking` | ✅ + ONX layout |
| `/app/logistics/shipping` | ✅ + ONX layout |
| `/app/logistics/transfers` | ✅ + ONX layout |
| `/app/logistics-operational/workspace/*` | ✅ Legacy redirects intactos |
| `/app/logistics/*` wildcard | ✅ Redirect /app inalterado |

## Retorno oficial

| Contexto | Destino | Label |
|----------|---------|-------|
| Módulos WMS | `/app/logistics-operational/workspace` | Voltar para Logística |
| CC (link secundário) | `/app` | Voltar ao Centro Cognitivo |

**Proibido:** `history.back()`, `window.history.go(-1)`

## Deep links (preparação)

Query params reservados: `onx_source`, `onx_intent`, `onx_module`, `onx_filter_*`

Parser: `parseOperationalDeepLink()` · Builder: `buildOperationalDeepLinkHref()`

Implementação cognitiva: fase futura (OPM-007+).
