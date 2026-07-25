# ARCH-PLAN-001 — Corporate Roadmap

**Fase:** ARCH-PLAN-001  
**Princípio:** PLAN BEFORE BUILD  
**Baseline:** ENT-001  
**Gerado:** 2026-07-20  
**Fonte canónica:** `frontend/src/platform/planning/archPlan001Roadmap.js`

---

## Regra fundamental

**Não abrir novos programas horizontais** (OPM, CPL, REG, ENT).  
Programas congelados: BASELINE · ARC · GF · NAV · EOX · WMS-REF · OPM · OPM-GOV · OPM-E2E · CPL · FIN-AUD · REG · ENT-001

---

## Sequência de implementação (11 domínios evolutivos)

| Rank | Domínio | Estratégia | Programa placeholder | Horizonte | Pré-requisitos |
|------|---------|------------|---------------------|-----------|----------------|
| 1 | **finance** | integrate_then_develop | FIN-EVOLVE-001 | Q3-Q4 | ENT-001, REG-002, FIN-AUD |
| 2 | supply | recover_then_expand | SUP-RECOVER-001 | Q4 | logistics_wms, OPM-008 |
| 3 | ppap | recover_then_expand | QTY-PPAP-RECOVER-001 | Q4 | quality, command_center |
| 4 | msa | recover_then_expand | QTY-MSA-RECOVER-001 | Q4-Q1 | quality, ppap pattern |
| 5 | ishikawa | recover_then_expand | QTY-ISHI-RECOVER-001 | Q1 | quality |
| 6 | purchasing | recover_then_expand | PROC-RECOVER-001 | Q1 | supply recover |
| 7 | executive | integrate_then_develop | EXEC-INTEGRATE-001 | Q1-Q2 | finance fase A |
| 8 | production | greenfield | PRD-GREENFIELD-001 | Q2+ | supply, finance fase A |
| 9 | maintenance | greenfield | MNT-GREENFIELD-001 | Q3+ | production |
| 10 | hr | greenfield | HR-GREENFIELD-001 | Q4+ | — |
| 11 | compliance | integrate_then_develop | COMP-INTEGRATE-001 | Paralelo Q4 | Q/S/E |

---

## Rank 1 — Finance (detalhe)

| Campo | Valor |
|-------|-------|
| Estratégia | integrate_then_develop |
| **NÃO** | FIN-001 greenfield directo |
| Reuse esperado | industrialCostService, leakage, contextualModules, Nexus, VIEW_FINANCIAL |
| Riscos | Recriar leakage; confundir Nexus com ERP |
| Entregável | Integração fase A + roadmap finance_native scoped |

---

## Domínios de preservação (fora sequência)

logistics_wms · quality · safety · environment · command_center · cognitive_center · nexus_ia · operational · audit

Estratégia: `maintenance_only` — correcções scoped apenas.

---

## Gaps residuais da plataforma (pré-implementação)

- **centro_previsao_forecasting_gap** — endpoints forecasting parciais (REG-001)
- **finance_adapter** — CPL planned (activar com domínio)
- **command_center_adapter** — CPL planned

---

## Próxima acção

1. Reunião de arquitectura — validar ranks 1-3
2. Aprovar **FIN-EVOLVE-001** (não FIN-001) com estratégia integrate_then_develop
3. Manter protocolo: zero alteração fora de escopo

---

## Consulta

```javascript
import { getCorporateRoadmap, getRoadmapItem } from '../src/platform/planning/index.js';
getRoadmapItem(1); // finance
```
