# ARCH-PLAN-001 — Dependency Map

**Fase:** ARCH-PLAN-001  
**Baseline:** ENT-001  
**Gerado:** 2026-07-20  
**Fonte canónica:** `frontend/src/platform/planning/archPlan001DependencyMap.js`

---

## Tipos de dependência

| Tipo | Descrição |
|------|-----------|
| **technical** | Infra, EOX, registries, hubs |
| **functional** | Fluxos de negócio cross-domain |
| **cognitive** | Adapters CPL, capabilities |
| **operational** | OPM phases, contratos, serviços |

---

## Mapa crítico

### Finance
| Tipo | Dependências |
|------|--------------|
| technical | command_center, nexus_ia, contextual_modules |
| functional | logistics_wms, production |
| cognitive | smart_panel, finance_adapter (planned) |
| operational | industrial_cost_service, financial_leakage_detector |
| **blockedBy** | command_center, nexus_ia |

### Supply
| Tipo | Dependências |
|------|--------------|
| technical | logistics_wms, EOX |
| functional | logistics_wms, purchasing |
| cognitive | logistics_adapter, OPM-008 |
| **blocks** | purchasing |

### PPAP / MSA / Ishikawa
| Tipo | Dependências |
|------|--------------|
| technical | quality, command_center |
| functional | quality |
| cognitive | cockpit_runtime, specialized_cockpit_resolver |

### Production
| Tipo | Dependências |
|------|--------------|
| technical | operational, MES/ERP refs |
| functional | logistics_wms, quality |
| cognitive | cognitive_economics |
| **blockedBy** | supply (recomendado), finance fase A |

### Maintenance / HR
Sem dependências declaradas na baseline — GREENFIELD isolado.

---

## Cadeia de dependências do roadmap

```
logistics_wms (certified)
    ↓
supply (recover) → purchasing (recover)
    ↓
finance (integrate_then_develop) ← nexus_ia, command_center
    ↓
executive (integrate)
    ↓
production (greenfield) → maintenance (greenfield)

quality (mature) → ppap → msa → ishikawa (recover chain)
```

---

## Implicação

Nenhum domínio evolutivo pode ignorar dependências certificadas. **OPM/WMS/CPL permanecem congelados** — consumidos, não modificados.

---

## Consulta

```javascript
import { getDependencyMap, getDependencyEntry } from '../src/platform/planning/index.js';
getDependencyEntry('finance');
```
