# WMS-007 — Modular Workspace Navigation

**Programa:** IMPETUS WMS  
**Tipo:** Workspace Evolution (Presentation + Workspace only)  
**Data:** 2026-07-18  
**Branch:** feature/wms-007-modular-navigation  
**Parecer:** READY

---

## Módulos independentes

| Módulo | Hook | API v1 |
| --- | --- | --- |
| Armazéns | useWarehouseModule | listWarehouses |
| Inventário | useInventoryModule | listItems |
| Recebimento | useReceivingModule | listReceiving |
| Picking | usePickingModule | listPicking |
| Expedição | useShippingModule | listShipping |
| Transferências | useTransferModule | listTransfers |

## Estados industriais

Loading · Empty · Permission denied · Operational error · API unavailable (`WmsModuleStates.jsx`)
