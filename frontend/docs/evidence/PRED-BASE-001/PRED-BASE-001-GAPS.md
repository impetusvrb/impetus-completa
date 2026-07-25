# PRED-BASE-001 — Gaps & closure plan

**Fonte:** `readiness/platformPredictionReadiness.js`  
**Actualizado por:** PRED-BASE-002

| Gap | Scope | Status | Resolução |
|-----|-------|--------|-----------|
| GAP-PB-003 | transversal | **PARTIAL** | Expansão de cobertura energética — **não** bloqueia certificação / FIN-EVOLVE-2.4 onda inicial |
| GAP-PB-005 | transversal | **READY (CLOSED)** | Certificado em PRED-BASE-002 (`platform.prediction.v0`) |
| GAP-PB-001 | shared | PARTIAL | Histórico de custos multi-período |
| GAP-PB-002 | shared | PARTIAL | Série de leakage |
| GAP-PB-006 | transversal | PARTIAL | Expor AIOI forecasts |
| GAP-PB-007 | domain_exclusive | DISCOVERED | Quality/Safety após baseline |
| GAP-PB-008 | transversal | PARTIAL | Enforce lanes na UI |

## Gate de consumidores

O gate oficial `openFinEvolve24` vive em **PRED-BASE-002** (`assessPlatformPredictionCertification`).  
PRED-BASE-001 mantém inventário/baseline e `deferGateTo: PRED-BASE-002`.

## Explicitamente rejeitado

MVP preditivo isolado no Finance.
