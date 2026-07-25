# ENT-001 — Evolution Candidates

**Fase:** ENT-001  
**Princípio:** CONSOLIDATE BEFORE EVOLVE  
**Gerado:** 2026-07-20  
**Fonte canónica:** `frontend/src/platform/knowledge/ent001EvolutionCandidates.js`

---

## Perguntas respondidas

Para cada domínio, a baseline permite responder:

1. **O que já existe?** — catálogos ENT-001 + fontes CPL/FIN-AUD/REG
2. **O que está operacional?** — heatmap mature/certified
3. **O que está desconectado?** — discovered + REG recovery matrix
4. **O que necessita integração?** — partial + recoveryPending
5. **O que precisa ser desenvolvido?** — not_started + FIN gap whatMustBeDeveloped

---

## Priorização sugerida (pós reunião de arquitectura)

| Rank | Domínio | Abordagem | Rationale |
|------|---------|-----------|-----------|
| 1 | finance | integrate_then_develop | FIN-AUD completo; maior reutilização |
| 2 | supply | integrate | Consumidor EOX parcial OPM-008 |
| 3 | production | audit_first | Referências MES/ERP antes GREENFIELD |
| 4 | ppap | integrate | Cockpit maduro desconectado |
| 5 | maintenance | develop | Sem evidência significativa |

> **Nota:** Finance pode continuar como próximo domínio funcional — mas agora com baseline, não hipóteses.

---

## Finance — candidatos específicos

### Reutilizar (não recriar)
- industrialCostService + `/costs/*`
- financialLeakageDetectorService (remontado REG-002)
- contextualModules finance category
- VIEW_FINANCIAL + dashboard profiles
- Nexus billing engine v4

### Integrar
- Endpoints forecasting em falta (centro_previsao)
- CPL finance_adapter (quando domínio existir)

### Desenvolver (GREENFIELD)
- finance_native — AP/AR, tesouraria, reconciliação
- accountingRuntime / ERP statutory GL
- Pipelines budget/cashflow (metadata only hoje)

---

## REG — recuperações concluídas (REG-002)

- R1 financial-leakage routes
- R2 industrial routes
- R3 guard unification
- R4/R5 insights + cérebro deep-links
- R6 dead-click matrix (KPI industrial, CenterWidget)

---

## REG — pendentes

- **centro_previsao_forecasting_gap** — endpoints forecasting parciais
- Validar estado actual de contratos pós-R1/R2 (artefacto FIN-AUD preservado como evidência histórica)

---

## CPL — adapters planeados

- finance_adapter
- command_center_adapter

Activar apenas quando domínios respectivos evoluírem com escopo explícito.

---

## Consulta

```javascript
import { getEvolutionCandidates } from '../src/platform/knowledge/index.js';
```
