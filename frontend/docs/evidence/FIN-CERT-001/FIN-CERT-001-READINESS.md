# FIN-CERT-001 — Operational Readiness

## Critérios consolidados

- **Observabilidade:** catálogo `finance.*`, incluindo Twin, What-if e Prediction.
- **Explainability:** cálculos econômicos, cenários e previsões possuem explicação obrigatória.
- **Confidence:** previsões exigem score, banda e método.
- **Trace:** trace econômico, `scenarioId` e `trace_id` preditivo.
- **Evidence:** `contractsUsed`, `evidenceConsumed` e `evidence_refs`.
- **Hub:** KPIs, Twin, What-if e previsões integrados.
- **Twin:** perspectiva econômica e lanes semânticas sem alterar o Twin industrial.
- **What-if:** composição temporária e comparação com previsão mantendo conceitos separados.

## Base de validação

FIN-VAL-001 permanece PASS e valida jornadas, coerência, desempenho, explicabilidade, observabilidade, resiliência e Twin. FIN-EVOLVE-2.4 adiciona o gate de exibição por confiança e explicação.

Validação: `validateFinanceOperationalReadiness()`.

