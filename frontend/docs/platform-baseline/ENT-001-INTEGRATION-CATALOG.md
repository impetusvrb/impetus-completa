# ENT-001 — Integration Catalog

**Fase:** ENT-001  
**Gerado:** 2026-07-20  
**Fonte canónica:** `frontend/src/platform/knowledge/ent001IntegrationCatalog.js`

---

## Resumo

**35 integrações** consolidadas: contratos FIN-AUD, órfãos REG-001, cadeias UI→API e regras de governance.

---

## Contratos API (FIN-AUD-001)

| contractId | Status audit | Pós REG-002 |
|------------|--------------|-------------|
| dashboard.costs | active | — |
| dashboard.financialLeakage | broken → **recovered R1** | Rotas montadas |
| nexusWallet.admin | active | — |
| dashboard.operationalBrain | active | R5 guards |
| contextualModules unlock | active | — |

---

## Cadeias de recuperação (REG-001)

| Feature | Break point | Prioridade | REG-002 |
|---------|-------------|------------|---------|
| mapa_vazamentos | api_to_http | 1 | R1 ✓ |
| mapa_industrial | api_to_http | 1 | R2 ✓ |
| operational_insights | rbac_guard_mismatch | 2 | R4 ✓ |
| cerebro_operacional | rbac_guard_mismatch | 2 | R5 ✓ |
| centro_previsao_forecasting | api_to_http_partial | 2 | pendente |
| kpi_route_industrial_orphan | dead_click | 3 | R6 ✓ |
| center_widget_dead_ids | dead_click | 3 | R6 ✓ |

---

## Órfãos api.js (REG-001)

Documentados em `REG_ORPHAN_API_CLIENTS`. Críticos remontados em REG-002; forecasting parcial permanece.

---

## Regras de governance (FIN-AUD rules)

- `view_financial_rbac` — VIEW_FINANCIAL
- `can_see_costs` — gate custos dashboard
- `prompt_firewall_financial` — firewall IA
- `domain_isolation_finance` — domain authority
- `module_capabilities_unlock` — contextual modules

---

## Feature flags relevantes

- `NEXUS_BILLING_ENGINE_V4`
- `IMPETUS_CONTEXTUAL_MODULES` (off em produção → menu híbrido)

---

## Consulta

```javascript
import { getIntegrationCatalog, listReg002Resolved } from '../src/platform/knowledge/index.js';
```
