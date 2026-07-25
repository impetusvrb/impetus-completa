# ARCH-PLAN-001 — Domain Analysis

**Fase:** ARCH-PLAN-001 · Enterprise Evolution Planning  
**Princípio:** PLAN BEFORE BUILD  
**Baseline:** ENT-001  
**Gerado:** 2026-07-20  
**Fonte canónica:** `frontend/src/platform/planning/archPlan001DomainAnalysis.js`

---

## Objetivo

Análise comparativa dos 20 domínios catalogados na baseline ENT-001, respondendo:

- Qual possui maior maturidade?
- Qual possui maior reaproveitamento?
- Qual entrega maior valor com menor risco?

**Sem nova auditoria** — scores derivados de heatmap, matriz cross-domain e evolution candidates.

---

## Top 5 — Valor / Risco (score composto)

| Rank | Domínio | Maturidade | Módulos | Runtimes | Cognitive | Score |
|------|---------|------------|---------|----------|-----------|-------|
| 1 | logistics_wms | certified | 9 | 4+ | 8+ | ~220 |
| 2 | quality | mature | 3+ | 1+ | 6+ | ~146 |
| 3 | command_center | mature | 1+ | 3+ | 5+ | ~144 |
| 4 | environment | mature | 3+ | 1+ | 8+ | ~142 |
| 5 | safety | mature | 2+ | 1+ | 4+ | ~134 |

---

## Domínios evolutivos (candidatos a programas)

| Domínio | Maturidade | Reuse % | ENT recommendation |
|---------|------------|---------|-------------------|
| finance | partial | ~100 | integrate_then_develop |
| supply | partial | ~20 | integrate |
| ppap / msa / ishikawa | discovered | ~15 | integrate (cockpit) |
| production | not_started | ~10 | develop → greenfield |
| maintenance / hr | not_started | 0 | develop → greenfield |

---

## Domínios de preservação (fora roadmap evolutivo)

logistics_wms · quality · safety · environment · command_center · cognitive_center · nexus_ia · operational · audit

Estes domínios encontram-se **certificados ou maduros**. Estratégia: `maintenance_only`.

---

## Metodologia de scoring

```
valueRiskRatio = maturityScore + reuseScore + infraScore - gapPenalty
```

- **maturityScore:** certified=100, mature=80, partial=55, discovered=40, not_started=10
- **reuseScore:** módulos×8 + runtimes×6 + cognitive×4 (cap 100)
- **gapPenalty:** gaps de desenvolvimento×5

---

## Consulta

```javascript
import { getDomainAnalysisReport, listDomainsByValueRisk } from '../src/platform/planning/index.js';
```
