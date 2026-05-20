# Fase V — Summary Governance Rollout — Auditoria

**Data:** 2026-05-19  
**Escopo:** Segundo rollout cognitivo real — canal SUMMARY  
**Classificação:** CRITICAL | HIGH | MEDIUM | LOW

---

## Resumo executivo

| Área | Severidade | Estado |
|------|------------|--------|
| Summary leakage | HIGH | executive/operational narrative markers |
| Summary underdelivery | MEDIUM | `summaryUnderdeliveryDetector` |
| Hierarchy mismatch | HIGH | `hierarchySummaryValidator` |
| Executive narrative leakage | CRITICAL | operator + diretoria/EBITDA |
| Contextual ambiguity | MEDIUM | regex + narrative validator |
| Weak summaries | MEDIUM | length + usefulness |
| Narrative conflicts | HIGH | `narrative_conflict` flag |
| Cross-domain exposure | HIGH | domain patterns in text |
| Stale contextual summaries | LOW | `stale` meta flag |

**Veredicto:** **APTO** para rollout supervisionado após KPI (Phase T/U).

---

## Pré-requisitos

- KPI governance observável (T/U)  
- Canal KPI activado na sequência S (`kpi` antes de `summary`)  
- Readiness score ≥ **0.75**  

---

## Checklist

- [ ] `IMPETUS_SUMMARY_GOVERNANCE_OBSERVABILITY=on`
- [ ] Enforcement V → `off`
- [ ] `npm run test:summary-governance-rollout` verde
- [ ] `POST /activate` com `execute` + `approved_by`
- [ ] PM2: `IMPETUS_SUMMARY_GOVERNANCE=on`

---

## Rollback

1. `POST /api/internal/summary-rollout/deactivate`  
2. Flags summary → `off`  
3. `pm2 reload impetus-backend --update-env`
