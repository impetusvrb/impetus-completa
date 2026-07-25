# OPM-002A — Reference Module Standard (WMS)

**Fase:** OPM-002A — Inventory Foundation & Operational Intelligence  
**Papel:** Reference Module (módulo de referência funcional)  
**Data:** 2026-07-19

---

## 1. Propósito

O OPM-002A não é apenas a evolução do módulo Inventário. É a **definição do padrão funcional, visual e arquitectural** que será reutilizado por:

| Módulo | Fase |
|--------|------|
| Receiving | OPM-003 |
| Picking | OPM-004 |
| Shipping | OPM-005 |
| Transfers | OPM-006 |
| Warehouse Intelligence | OPM-007 |

O Inventário passa a ser o **Reference Module** — primeira implementação completa da suíte operacional WMS sobre a baseline certificada (OPM-001D).

---

## 2. Architecture Freeze

Componentes congelados — **não modificar**:

- BASELINE-SYSTEM v1.4, ARC-001/002/003/003A
- NAV-001/002/002A, OPM-001D, EOX
- WMS-003 APIs, Runtime, RBAC, Feature Flags, Design System EOX

Toda implementação **consome** exclusivamente esta fundação.

---

## 3. Slots canónicos (Reference Module)

```
EOX Shell (EoxDomainNavLayout)
    ↓
InventoryOperationalModule (Reference Module)
    ↓
┌─────────────────────────────────────────────────┐
│ InventoryExport      (EoxActionBar)             │
│ InventoryDashboard   (KPIs operacionais)        │
│ InventorySearch + InventoryFilters              │
│ InventoryMetrics   (Operational Intelligence)   │
│ InventoryTimeline  (filtros período/user/wh/prod)│
│ InventoryGrid      (paginação · sort · select)  │
│ InventoryDetailsPanel                           │
└─────────────────────────────────────────────────┘
```

Implementação: `frontend/src/domains/logistics-operational/modules/inventory/components/`

Contrato declarativo: `wmsReferenceModulePattern.js`

---

## 4. Herança para OPM-003+

Cada módulo successor deve:

1. Reutilizar ou adaptar os componentes Inventory (renomear prefixo conforme domínio).
2. Manter slots idênticos (dashboard → export).
3. Consumir apenas APIs WMS-003 scoped por `company_id`.
4. Instrumentar observabilidade com prefixo de módulo (`RECEIVING_*`, etc.).
5. Declarar contratos de integração em ficheiro `*IntegrationContracts.js`.

---

## 5. Observabilidade (Inventário)

| Evento | Descrição |
|--------|-----------|
| `INVENTORY_LOADED` | Carga WMS-003 concluída |
| `INVENTORY_SEARCH` | Pesquisa incremental |
| `INVENTORY_FILTER` | Filtro de status |
| `INVENTORY_GRID_SORT` | Ordenação do grid |
| `INVENTORY_EXPORT` | CSV / Excel / PDF |
| `INVENTORY_TIMELINE` | Alteração de período |
| `INVENTORY_VIEW_CHANGED` | Mudança de vista |

---

## 6. Integrações futuras (contratos apenas)

`inventoryIntegrationContracts.js` — Receiving, Picking, Shipping, Transfers, Warehouse Intelligence.

**Sem implementação nesta fase.**

---

## 7. Readiness OPM-003

- [x] Biblioteca de componentes exportável
- [x] Padrão documentado
- [x] KPIs operacionais reais (WMS-003)
- [x] Exportação via EoxActionBar
- [x] Testes automatizados (`npm run test:opm002a`)
- [x] Zero alterações backend / architecture freeze respeitado

**Gate aberto para OPM-003 — Receiving Operations.**
