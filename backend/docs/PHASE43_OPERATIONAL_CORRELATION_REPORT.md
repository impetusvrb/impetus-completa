# FASE 43 — Operational Correlation Intelligence Report

**Data:** 2026-06-01  
**Modo:** Desenvolvimento controlado (aditivo, determinístico)

---

## Objetivo

Descobrir **associações estatísticas observáveis** entre sinais PLC (24h / 7d / 30d) — sem ML, sem causalidade, sem previsão.

---

## Entregas

| Etapa | Componente |
|-------|------------|
| 43-A/B | `plcCorrelationAnalysisService.js` — Pearson, Spearman, covariância, robusta (Spearman) |
| 43-C | Classificação: none → very_strong |
| 43-D | `buildCorrelationEvidence()` |
| 43-E | `correlation_supported_claim` + `forbidden_causality_claim` |
| 43-F | `interaction_score` (0–100) |
| 43-G | Dashboard chat + prompt |
| 43-H | Feed: `CORRELATION_OBSERVED`, `STRONG_SIGNAL_ASSOCIATION`, `SIGNAL_CLUSTER_DETECTED` |
| 43-I | Evidence binding `claim_categories` |
| 43-J | `phase43-correlation-certification.js` — **11/11 PASS** |

---

## Config

`backend/src/config/correlationBaselineConfig.js`

---

## Não alterado

Motor A, Engine V2, Workflow, governance, hallucination, truth core, Fases 40–42.

---

## Resultado narrativo

**Antes:** «Vibração elevada.»  
**Depois:** «Foi observada correlação forte entre temperatura e vibração na janela 7d (r=0,82, n=8400)» — **sem** afirmar que a temperatura *causa* a vibração.
