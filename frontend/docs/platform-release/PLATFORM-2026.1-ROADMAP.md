# PLATFORM-2026.1 — Official Roadmap

**Release:** PLATFORM-2026.1  
**Aprovado:** 2026-07-20  
**Fonte:** ARCH-PLAN-001 → formalizado nesta release

---

## Roadmap aprovado — Top 5

| Rank | Programa | Domínio | Estratégia |
|------|----------|---------|------------|
| 1 | **FIN-EVOLVE-001** | Finance | integrate_then_develop |
| 2 | **SUP-EVOLVE-001** | Supply | recover_then_expand |
| 3 | **PPAP-EVOLVE-001** | PPAP | recover_then_expand |
| 4 | **MSA-EVOLVE-001** | MSA | recover_then_expand |
| 5 | **ISH-EVOLVE-001** | Ishikawa | recover_then_expand |

---

## Rank 1 — FIN-EVOLVE-001

| Campo | Valor |
|-------|-------|
| Estratégia | integrate_then_develop |
| **NÃO aprovado** | FIN-001 greenfield directo |
| Reuse | industrialCostService, leakage, contextualModules, Nexus, VIEW_FINANCIAL |
| Pré-requisitos | ENT-001, REG-002, FIN-AUD-001 |
| Horizonte | Q3-Q4 |

---

## Sequência estendida (pós top-5)

| Rank | Programa | Domínio | Estratégia |
|------|----------|---------|------------|
| 6 | PROC-EVOLVE-001 | Purchasing | recover_then_expand |
| 7 | EXEC-EVOLVE-001 | Executive | integrate_then_develop |
| 8 | PRD-EVOLVE-001 | Production | greenfield |
| 9 | MNT-EVOLVE-001 | Maintenance | greenfield |
| 10 | HR-EVOLVE-001 | HR | greenfield |
| 11 | COMP-EVOLVE-001 | Compliance | integrate_then_develop |

Activar ranks 6+ após conclusão ou validação dos ranks 1-5.

---

## Domínios de preservação (fora roadmap evolutivo)

logistics_wms · quality · safety · environment · command_center · cognitive_center · nexus_ia · operational · audit

Estratégia: **maintenance_only**

---

## Próximo programa autorizado

**FIN-EVOLVE-001** — pronto para iniciar **após** publicação desta release.

---

## Consulta

```javascript
import { getReleaseRoadmap, getApprovedProgram } from '../src/platform/release/index.js';
getApprovedProgram(1); // FIN-EVOLVE-001
```
