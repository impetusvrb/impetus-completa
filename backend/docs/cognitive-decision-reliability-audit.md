# Fase R — Cognitive Decision Reliability Audit

**Data:** 2026-05-19  
**Escopo:** Confiabilidade operacional de decisões e recomendações cognitivas  
**Modo:** Shadow-first (`IMPETUS_DECISION_RELIABILITY_OBSERVABILITY=on`)

---

## Resumo executivo

Com runtime E→Q consistente e contextualmente estabilizado, o gap passa a ser **qualidade e confiança da decisão cognitiva** (recomendações, chat, summaries, orientação operacional).

A Fase R mede trust, qualidade, ambiguidade, estabilidade e necessidade de supervisão humana — **sem auto-correcção**.

---

## Achados classificados

| ID | Achado | Severidade | Operacional | Cognitivo | Trustworthiness | ISO 42001 | Decisório | Supervisão humana | Runtime reliability |
|----|--------|------------|-------------|-----------|-----------------|-----------|-----------|-------------------|---------------------|
| R-A01 | Recomendação vaga / curta | **HIGH** | Alto | Alto | Baixa | Explicabilidade | Alto | Revisão | Média |
| R-A02 | Baixa confiança contextual (axis general) | **HIGH** | Médio | Alto | Baixa | Controlo AI | Alto | Sim | Melhora |
| R-A03 | Guidance degradado (fallback GPT) | **CRITICAL** | Alto | Alto | Baixa | Transparência | Alto | Obrigatória | Baixa |
| R-A04 | Oscilação de recomendação entre requests | **MEDIUM** | Médio | Alto | Média | — | Médio | Alerta | Melhora |
| R-A05 | Interchannel divergence + baixo trust | **HIGH** | Alto | Alto | Baixa | — | Alto | Sim | Melhora |
| R-A06 | Múltiplas interpretações no texto | **MEDIUM** | Baixo | Alto | Média | — | Médio | Opcional | OK |
| R-A07 | KPI/summary sem provenance | **HIGH** | Alto | Médio | Baixa | Proveniência | Médio | — | Melhora |
| R-A08 | Conflicting recommendations | **HIGH** | Alto | Alto | Baixa | — | Alto | Sim | Shadow |
| R-A09 | Contextual uncertainty residual | **MEDIUM** | Médio | Alto | Média | — | Médio | Recomendada | OK |
| R-A10 | Weak runtime confidence | **MEDIUM** | Médio | Médio | Média | Métricas | Baixo | — | Telemetria R |

---

## Recomendações

1. Exibir `decision_reliability.human_oversight` apenas em painéis internos inicialmente.
2. Correlacionar `LOW_DECISION_TRUST_DETECTED` com HITL existente (sem auto-escalar).
3. Piloto: `RECOMMENDATION_QUALITY_ANALYSIS=on` em staging.

---

## Referências

- `cognitive-decision-reliability-implementation.md`
- API: `/api/internal/decision-reliability/*`
