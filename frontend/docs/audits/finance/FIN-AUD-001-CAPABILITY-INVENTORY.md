# FIN-AUD-001 — Capability Inventory

**Fonte:** `frontend/src/platform/audit/finance/finAud001CapabilityInventory.js`

---

## Modelo de inventário

Para cada capacidade:

| Campo | Descrição |
|-------|-----------|
| capabilityId | Identificador audit |
| name | Nome legível |
| domain | Domínio proprietário |
| location | Path canónico |
| responsibility | O que faz |
| owner | Equipa/domínio responsável |
| dependencies | Dependências declaradas |
| contracts | Contratos associados |
| integrations | Stripe, Asaas, MES, etc. |
| status | active, partial, placeholder, broken |
| maturity | complete, partial, experimental, placeholder |
| reuse | required, conditional, planned, cross_reference |
| crossDomain | true se referência cruzada |

---

## Capacidades complete (reutilizar)

- `industrial_cost_service` — centros de custo industriais
- `dashboard_costs_api` — API /costs/*
- `centro_custos_executivo` / `centro_custos_admin`
- `nexus_billing_engine_v4` / `nexus_wallet_service`
- `view_financial_permission` — governança RBAC
- `ctx_financial_intelligence` / `ctx_cost_center`

---

## Capacidades partial (activar, não recriar)

- `financial_leakage_detector` — service OK, rotas HTTP gap
- `mapa_vazamento_financeiro` — UI OK, API gap
- `operational_forecasting` — impacto financeiro operacional
- `domain_authority_finance` — metadata pipelines budget/cashflow

---

## Capacidades placeholder (não assumir inexistente = gap real)

- `eox_finance_entry` — `/app/finance` PLANNED
- `finance_native` — GREENFIELD

---

## API

```javascript
import { FIN_CAPABILITY_INVENTORY, listInventoryByMaturity } from 'platform/audit/finance';
```
