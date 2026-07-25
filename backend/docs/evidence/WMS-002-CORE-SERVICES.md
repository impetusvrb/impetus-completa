# WMS-002 — Core Operational Services

**Programa:** Operational Completion — Logistics  
**Classificação:** Operational Completion Program · Fase 2  
**Data conclusão:** 2026-07-17  
**Norma:** [ARC-002-GREENFIELD-DELIVERY-STANDARD.md](../architecture/ARC-002-GREENFIELD-DELIVERY-STANDARD.md)

---

## Conformidade ARC-002

| Campo | Valor |
|-------|-------|
| **Categoria** | Operational Completion Program (OCP) |
| **Objetivo** | Implementar 7 Core Operational Services consumindo exclusivamente o OCL |
| **Critérios de entrada** | AUD-001 ✅ · WMS-001 ✅ · ARC-002 ✅ · BASELINE-SYSTEM v1.4 LOCKED |
| **Critérios de saída** | Serviços operacionais via OCL; zero import directo `warehouse_*`; testes `test:wms-core-services` |
| **Impacto arquitetural** | Nova camada `services/operationalServices.js`; rotas `/api/logistics-operational/*` evoluídas |
| **Baselines afectadas** | Nenhuma alteração a BASELINE-SYSTEM v1.4 |
| **Justificativa de categoria** | OCP — completar capacidade operacional WMS sem Greenfield; fronteira OCL obrigatória |

---

## Serviços implementados

| Serviço | Ficheiro | Contrato | Consumo |
|---------|----------|----------|---------|
| `WarehouseService` | `operationalServices.js` | `WarehouseService` | `ocl.warehouses` |
| `InventoryService` | `operationalServices.js` | `InventoryService` | `ocl.inventory` |
| `MovementService` | `operationalServices.js` | `MovementService` | `ocl.movements` |
| `ReceivingService` | `operationalServices.js` | `ReceivingService` | `ocl.receiving` |
| `PickingService` | `operationalServices.js` | `PickingService` | `ocl.picking` |
| `ShippingService` | `operationalServices.js` | `ShippingService` | `ocl.shipping` |
| `TransferService` | `operationalServices.js` | `TransferService` | `ocl.transfers` |

**Local canónico:** `backend/src/domains/logistics-operational/services/operationalServices.js`

---

## Regras de dependência (verificadas)

```
✅ CoreService → OCL
❌ CoreService → warehouseService
❌ CoreService → SQL directo warehouse_*
❌ CoreService → cognitiveRuntime/domains/logistics/*
```

Teste de enforcement: `backend/tests/wms/runWmsCoreServicesTests.js` — `forbidden: services do not import warehouseService`.

---

## Eventos emitidos (pós-commit)

| Evento | Serviço |
|--------|---------|
| `wms.warehouse.created` | Warehouse |
| `wms.inventory.balance_changed` | Inventory |
| `wms.movement.posted` | Movement |
| `wms.receiving.order_created` | Receiving |
| `wms.picking.order_created` | Picking |
| `wms.shipping.order_created` | Shipping |
| `wms.transfer.order_created` | Transfer |

---

## APIs (stubs operacionais WMS-002 → WMS-003)

Base: `/api/logistics-operational`

| Subgrupo | GET `/` | GET `/list` | POST `/` |
|----------|---------|-------------|----------|
| `/warehouses` | contract | lista via OCL | create via OCL |
| `/inventory` | contract | lista items | create item |
| `/movements` | contract | lista | create movement |
| `/receiving` | contract | lista | create order |
| `/picking` | contract | lista | create order |
| `/shipping` | contract | lista | create order |
| `/transfers` | contract | lista | create order |

Flags permanecem **OFF** — `production_enabled: false`.

---

## Checklist encerramento

| Critério | Estado |
|----------|:------:|
| CORE_SERVICES_IMPLEMENTED | YES |
| WAREHOUSE_DIRECT_IMPORTS | NO |
| SQL_DIRECT_ACCESS (services) | NO |
| LOGISTICS_NATIVE_MODIFIED | NO |
| TEST_SUITE_CREATED | YES |

---

*Referência cruzada:* [WMS-002-OPERATIONAL-COMPATIBILITY-LAYER.md](./WMS-002-OPERATIONAL-COMPATIBILITY-LAYER.md) · [WMS-ARCHITECTURE-v0.2.md](./WMS-ARCHITECTURE-v0.2.md)
