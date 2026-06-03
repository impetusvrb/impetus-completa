# COGNITIVE_OBSERVABILITY_CERTIFICATION — FASE 47-C

**Data:** 2026-06-03  
**Baseline oficial** para certificação industrial (Etapa 6)  
**Fonte:** PostgreSQL read-only + flags `.env`

---

## Flags runtime (referência)

| Flag | Valor |
|------|--------|
| `IMPETUS_INDUSTRIAL_TRUTH_MODE` | enforce |
| `IMPETUS_HALLUCINATION_BLOCK` | on |
| `IMPETUS_VOICE_TRUTH_ORAL_ENFORCE` | true |
| `IMPETUS_C2_SYNTHETIC_EVENTS_WHEN_SPARSE` | off |

---

## Métricas medidas

| Métrica | Valor | Janela |
|---------|-------|--------|
| **total_responses** (traces) | **944** | 30 dias (`ai_interaction_traces`) |
| **truth_enforced_responses** | **202** | 30d — output contém `industrial_truth` |
| **evidence_supported_responses** | ~202 (proxy) | mesmo critério |
| **responses_without_truth_meta** | **742** (~78,6%) | 30d |
| **hallucination_assessment** (total) | **257** | all-time `ai_hallucination_assessments` |
| **hallucination_assessment** (30d) | **257** | all-time ≈ 30d |
| **review_pending** | **5** | fila humana |
| **false_positives_marked** | **0** | |
| **avg_confidence** (hallucination) | **0,807** | |
| **oral_corrections** (proxy voice shadow) | **4** | 30d `voice_truth_shadow` |
| **would_replace** (voz) | **4** (100% do volume voz 30d) | |
| **would_block** (voz) | **4** | |
| **blocked_responses** (trace safety_blocked) | **0** | 30d (proxy SQL) |
| **unsupported_claim** (agregado SQL dedicado) | Não agregado globalmente | ver audits por canal |
| **fallback_responses** | Não medido (sem coluna única) | inferir de `FALLBACK:` em traces manual |

---

## Percentuais (baseline 03/06/2026)

| Indicador | % |
|-----------|---|
| Traces com `industrial_truth` / total traces 30d | **21,4%** |
| Traces sem meta truth explícita | **78,6%** |
| Voz shadow → would_replace | **100%** (n=4, amostra pequena) |
| Hallucination review pending / total assessments | **1,9%** |

---

## Interpretação

1. **Truth enforcement está activo** mas **não todas as respostas** passam por trace com `industrial_truth` (~21%).
2. **Voz:** observabilidade existe; volume **insuficiente** para estatística industrial (4 eventos/30d).
3. **0% inventado** — **não demonstrado** por este baseline (falta Etapa 7 stress 100).
4. Hallucination detection em modo **enforce** com **block_enabled: true** (phase37/smoke alinhado).

---

## Scripts de revalidação

```bash
cd /var/www/impetus-completa/backend
node scripts/phase37-real-factory-audit.js
node scripts/industrial-truth-enforcement-smoke.js
```

---

## Critério Etapa 6 (plano original)

| Requisito | Atendido? |
|-----------|-----------|
| Relatório observabilidade | **SIM** (este documento + `COGNITIVE_OBSERVABILITY_REPORT.md`) |
| Métricas contínuas | **PARCIAL** — snapshot único |
| Prova obediência longitudinal | **NÃO** |

---

*FASE 47-C — baseline oficial. Reexecutar semanalmente.*
