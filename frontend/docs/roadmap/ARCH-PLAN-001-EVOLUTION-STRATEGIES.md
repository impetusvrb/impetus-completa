# ARCH-PLAN-001 — Evolution Strategies

**Fase:** ARCH-PLAN-001  
**Princípio:** PLAN BEFORE BUILD  
**Gerado:** 2026-07-20  
**Fonte canónica:** `frontend/src/platform/planning/archPlan001EvolutionStrategies.js`

---

## Mudança de pergunta

> De: *"Qual domínio faremos agora?"*  
> Para: *"Qual é a forma correta de evoluir cada domínio?"*

---

## Estratégias permitidas

| Estratégia | Significado | Quando aplicar |
|------------|-------------|----------------|
| **maintenance_only** | Preservar baseline certificada | certified / mature |
| **integrate_then_develop** | Reutilizar existente → depois GREENFIELD scoped | partial + alto reuse |
| **recover_then_expand** | Ligar capacidades desconectadas → expandir | discovered / REG pattern |
| **greenfield** | Desenvolvimento novo confirmado | not_started + baixo reuse |

---

## Classificação por domínio (20)

### maintenance_only (9)
logistics_wms · quality · safety · environment · command_center · cognitive_center · nexus_ia · operational · audit

### integrate_then_develop (3)
| Domínio | Rationale |
|---------|-----------|
| **finance** | Custos, leakage, Nexus existem; finance_native é GREENFIELD |
| executive | AIOI parcial — consolidar widgets |
| compliance | Views Q/S/E — integrar governance |

### recover_then_expand (5)
| Domínio | Rationale |
|---------|-----------|
| supply | OPM-008 consumer parcial |
| ppap / msa / ishikawa | Cockpits CC maduros, EOX inactive |
| purchasing | Depende supply + BudgetReference |

### greenfield (3)
production · maintenance · hr

---

## Finance — estratégia detalhada

**NÃO é greenfield total. É `integrate_then_develop`.**

| Fase | Acção | Proibido |
|------|-------|----------|
| A | Integrar forecasting gap + consolidar widgets CC | Recriar leakage/custos |
| B | Activar EOX finance + contextual unlock | Novo billing engine |
| C | finance_native scoped (AP/AR, tesouraria) | Assumir ausência de infra |

---

## Acções proibidas por estratégia

| Estratégia | Proibido |
|------------|----------|
| maintenance_only | greenfield rebuild, novos programas horizontais |
| integrate_then_develop | recriar capacidades existentes, FIN-001 directo |
| recover_then_expand | reimplementar cockpits existentes |
| greenfield | assumir ausência total sem validar ENT baseline |

---

## Distribuição

- maintenance_only: **9**
- integrate_then_develop: **3**
- recover_then_expand: **5**
- greenfield: **3**

---

## Consulta

```javascript
import { getEvolutionStrategiesReport, getEvolutionStrategy } from '../src/platform/planning/index.js';
getEvolutionStrategy('finance'); // integrate_then_develop
```
