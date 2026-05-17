# LOGISTICS — Enterprise Runtime Alignment

**Data:** 2026-05-17  
**Estado:** shadow-first · additive-only · reutiliza frameworks QUALITY + SAFETY + Enterprise Runtime Validation

## Alinhamento

| Framework reutilizado | Uso em LOGISTICS |
|----------------------|------------------|
| Domain Publication Framework | `logisticsPublicationHealthService` |
| Enterprise Runtime Validation | `logisticsOperationalValidationOrchestrator` → `enterpriseRuntimeValidationOrchestrator` |
| Enterprise Controlled Rollout | estágios shadow → pilot → controlled → staged → full |
| Enterprise Audience / UX / Cognitive | via pacote `/pack` |
| `enterpriseObservabilityRuntime` | métricas `logistics_*` |

## Runtimes (domínio)

- `logisticsPublicationRuntime` — flags + merge menu
- `logisticsNavigationRuntime` — manifest + resolver
- `logisticsAudienceRuntime` — bands operador → diretor
- `logisticsActivationRuntime` — `/api/logistics-activation`
- `logisticsOperationalValidationRuntime` — `/api/logistics-operational-validation`
- Proteções: `safeMergeLogisticsPublicationIntoMenu`, `LogisticsRuntimePublicationGate`, stability + fallback

## APIs

- `GET /api/logistics-navigation/context`
- `GET /api/logistics-activation/readiness`
- `POST /api/logistics-operational-validation/pack`

## Frontend

- Rotas: `/app/logistics/operational` (+ `?view=receiving|storage|picking|shipping|maturity`)
- Menu: cadeia Layout `quality → safety → logistics`
- Módulo: `logistics_intelligence`

## Flags (default off)

Backend: `IMPETUS_LOGISTICS_*` em `featureGovernanceService`  
Frontend: `VITE_IMPETUS_LOGISTICS_*`

## Evolução controlada (proibido auto-promoção)

1. Runtime Validation  
2. Operational / UX / Audience / Cognitive Validation  
3. Shadow → Pilot → Controlled → Staged → Full (manual)

## Testes

```bash
cd backend && npm run test:logistics-runtime-validation
cd frontend && npm run test:logistics-runtime-validation
```

## Decisão

**REMAIN_IN_SHADOW** até flags activas, `logistics_intelligence` no tenant e pacote `/pack` estável.

## Preservado

WMS/TMS scaffold · LPN contracts · `logisticsIntelligence` legacy · IA/Chat/Dashboard · coexistência legacy.
