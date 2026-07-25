# WMS-002 — Operational Compatibility Layer (OCL)

**Programa:** Operational Completion — Logistics  
**Classificação:** Operational Completion Program · Fase 2  
**Data conclusão:** 2026-07-17  
**Pré-requisito:** WMS-001 ✅ · AUD-001 ✅ · ARC-002 ✅  
**Baseline preservado:** BASELINE-SYSTEM v1.4 · logistics_native LOCKED · ARC-001

---

## Conformidade ARC-002

| Campo | Valor |
|-------|-------|
| **Categoria** | Operational Completion Program (OCP) |
| **Objetivo** | Implementar OCL como única fronteira entre `warehouse_*` e Core Services |
| **Critérios de entrada** | AUD-001 CONCLUÍDA · WMS-001 CONCLUÍDA · ARC-002 APROVADA · BASELINE-SYSTEM v1.4 LOCKED |
| **Critérios de saída** | OCL + Legacy Adapter + routing + observabilidade + testes |
| **Impacto arquitetural** | Camadas `adapters/` e `compatibility/` em `logistics-operational/` |
| **Baselines afectadas** | Nenhuma — v1.4 preservada |
| **Justificativa de categoria** | OCP (não GF) — evolução operacional controlada sobre foundation WMS-001; EV seria prematuro antes de estabilizar OCL |

---

## 1. Arquitectura implementada

```
warehouse_* (legado)
        │
        ▼
warehouseLegacyAdapter.js          ← único acesso SQL warehouse_*
        │
        ▼
operationalCompatibilityLayer.js   ← routing legacy | wms | hybrid
        │
        ▼
operationalServices.js             ← 7 Core Services
        │
        ▼
/api/logistics-operational/*       → WMS-003 (APIs completas)
```

---

## 2. Componentes entregues

| Componente | Caminho | Estado |
|------------|---------|:------:|
| Legacy Adapter | `adapters/warehouseLegacyAdapter.js` | ✅ |
| OCL | `compatibility/operationalCompatibilityLayer.js` | ✅ |
| Routing Policy | `compatibility/routingPolicy.js` | ✅ |
| Contratos canónicos | `compatibility/contracts/canonicalContracts.js` | ✅ |
| Observabilidade OCL | `compatibility/oclObservability.js` | ✅ |
| Core Services | `services/operationalServices.js` | ✅ |

---

## 3. Routing strategy (documentada)

| Entidade | Estratégia default | Override env |
|----------|:------------------:|--------------|
| Warehouse | hybrid | `IMPETUS_WMS_ROUTE_WAREHOUSE` |
| WarehouseLocation | hybrid | `IMPETUS_WMS_ROUTE_WAREHOUSELOCATION` |
| StorageAddress | hybrid | `IMPETUS_WMS_ROUTE_STORAGEADDRESS` |
| InventoryItem | hybrid | `IMPETUS_WMS_ROUTE_INVENTORYITEM` |
| InventoryBalance | hybrid | `IMPETUS_WMS_ROUTE_INVENTORYBALANCE` |
| InventoryMovement | wms | `IMPETUS_WMS_ROUTE_INVENTORYMOVEMENT` |
| ReceivingOrder | wms | `IMPETUS_WMS_ROUTE_RECEIVINGORDER` |
| PickingOrder | wms | `IMPETUS_WMS_ROUTE_PICKINGORDER` |
| ShippingOrder | wms | `IMPETUS_WMS_ROUTE_SHIPPINGORDER` |
| TransferOrder | wms | `IMPETUS_WMS_ROUTE_TRANSFERORDER` |

Valores aceites: `wms` | `native` | `legacy` | `hybrid`

---

## 4. Observabilidade

Endpoint: `GET /api/logistics-operational/ocl/observability`

Campos registados (sem dados sensíveis):

- `entity` — entidade resolvida
- `strategy` — legacy | wms | hybrid
- `adapter` — `warehouseLegacyAdapter` | `wms_repository`
- `duration_ms` — tempo de resolução
- `fallback` — merge híbrido activou legado

Debug: `IMPETUS_WMS_OCL_DEBUG=true`

---

## 5. Integrações futuras (preparadas, inactivas)

Contratos em `shared/integrationContracts.js`: ERP · TMS · PLC · Colectores · MQTT · Etiquetadoras — `active: false`.

---

## 6. Testes

```bash
npm run test:wms-core-services
npm run test:wms-foundation
npm run test:architecture-conformance
```

Suite: `backend/tests/wms/runWmsCoreServicesTests.js`

---

## 7. Checklist encerramento

| Critério | Estado |
|----------|:------:|
| LEGACY_ADAPTER_CREATED | YES |
| OCL_CREATED | YES |
| ROUTING_STRATEGY_DEFINED | YES |
| CONTRACTS_UNIFIED | YES |
| OBSERVABILITY_ENABLED | YES |
| TEST_SUITE_CREATED | YES |
| WAREHOUSE_DIRECT_IMPORTS (Core Services) | NO |
| SQL_DIRECT_ACCESS (Core Services) | NO |
| LOGISTICS_NATIVE_MODIFIED | NO |
| BASELINE_SYSTEM_v1.4 | PRESERVED |
| ARC_001_CONFORMANCE | PRESERVED |
| ARC_002_CONFORMANCE | PRESERVED |

---

## 8. Evidências relacionadas

| Documento | Descrição |
|-----------|-----------|
| [WMS-002-CORE-SERVICES.md](./WMS-002-CORE-SERVICES.md) | Core Services |
| [WMS-MIGRATION-PROGRESS.md](./WMS-MIGRATION-PROGRESS.md) | Percentual migração |
| [WMS-LEGACY-WAREHOUSE-INVENTORY.md](./WMS-LEGACY-WAREHOUSE-INVENTORY.md) | Inventário legado |
| [WMS-ARCHITECTURE-v0.2.md](./WMS-ARCHITECTURE-v0.2.md) | §3 OCL · §4 Core Services |

---

## 9. Próxima fase

**EV-001 — Platform Stabilization Review** → **WMS-003 — Operational APIs**
