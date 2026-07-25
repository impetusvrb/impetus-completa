# WMS — Inventário Formal `warehouse_*` (Legado)

**Programa:** WMS-002 — Core Operational Services  
**Data:** 2026-07-17  
**Origem:** AUD-001 · WMS-001 · varredura código  
**Classificação por item:** **Migrar** · **Reaproveitar** · **Descontinuar** · **Substituir**

---

## Regra arquitectural WMS-002

> **Proibido:** novos serviços WMS acedem directamente a tabelas/APIs `warehouse_*`.  
> **Obrigatório:** todo acesso passa pelo **Legacy Adapter** → **Operational Compatibility Layer**.

---

## 1. Tabelas (`backend/src/models/`)

| Tabela | Utilização actual | Classificação | Destino SSOT `wms_*` |
|--------|-------------------|:-------------:|----------------------|
| `warehouse_material_categories` | Admin CRUD activo | **Migrar** | metadata em `wms_inventory_items.item_class` + lookup futuro |
| `warehouse_suppliers` | Admin + intelligence | **Reaproveitar** | bridge read-only; supply domain futuro |
| `warehouse_locations` | Admin; signal loader NO_RECORDS | **Substituir** | `wms_storage_addresses` + `wms_warehouse_locations` |
| `warehouse_materials` | Admin CRUD; cognitive bridge parcial | **Migrar** | `wms_inventory_items` |
| `warehouse_params` | Admin tenant config | **Reaproveitar** | config layer WMS (não entidade core) |
| `warehouse_balances` | Admin list; loader 0 rows | **Substituir** | `wms_inventory_balances` |
| `warehouse_movements` | Admin POST; loader NO_RECORDS | **Substituir** | `wms_inventory_movements` |
| `warehouse_material_process_links` | Admin vínculos MES/manutenção | **Reaproveitar** | cross-domain links (não duplicar em WMS core) |
| `warehouse_alerts` | Intelligence dashboard | **Reaproveitar** | alertas via adapter até WMS-004 |
| `warehouse_predictions` | Intelligence | **Reaproveitar** | analytics layer |
| `warehouse_snapshots` | Intelligence histórico | **Reaproveitar** | read-only |
| `warehouse_idle_detection` | Intelligence | **Reaproveitar** | read-only |

---

## 2. Backend — serviços e rotas

| Componente | Caminho | Classificação | Notas |
|------------|---------|:-------------:|-------|
| `warehouseService.js` | `backend/src/services/` | **Substituir** | Lógica absorvida por WMS Core via adapter |
| `warehouseIntelligenceService.js` | `backend/src/services/` | **Reaproveitar** | Dashboard legacy até redirect WMS-004 |
| `routes/admin/warehouse.js` | CRUD completo | **Reaproveitar** | Admin coexistência; writes eventualmente via adapter |
| `routes/warehouseIntelligence.js` | Dashboard operacional | **Reaproveitar** | FE `AlmoxarifadoInteligente.jsx` |
| `logisticsFoundationService.js` | M1.2 `logistics_*` | **Reaproveitar** | Bridge read-only; não expandir writes directos |
| `logisticsBlockBridge.js` | Cognitive runtime | **Reaproveitar** | **Não alterar** (LOCKED); lê via counts existentes |
| `logisticsTenantSignalLoader.js` | Cognitive runtime | **Reaproveitar** | Futuro: dados via Compatibility Layer export |

---

## 3. Frontend

| Componente | Rota / path | Classificação | Notas |
|------------|-------------|:-------------:|-------|
| `AlmoxarifadoInteligente.jsx` | `/app/almoxarifado-inteligente` | **Reaproveitar** | Redirect gradual WMS-004 |
| `AdminWarehouse.jsx` | `/app/admin/warehouse` | **Reaproveitar** | Admin até paridade WMS admin |
| `LogisticsOperationalWorkspace.jsx` | `/app/logistics/operational` | **Substituir** | Workspace canónico → `logistics-operational` WMS-004 |
| `warehouseIntelligence` api.js | `/admin/warehouse/intelligence/*` | **Reaproveitar** | Path correcto |
| `adminWarehouse` api.js | `/admin/warehouse/*` | **Reaproveitar** | CRUD admin |

---

## 4. Integrações e side-effects

| Componente | Classificação | Notas |
|------------|:-------------:|-------|
| `manuiaEventDispatchService.js` (warehouse_alerts) | **Reaproveitar** | Manutenção consome alertas |
| `centralIndustryAIService.js` (sector warehouse) | **Reaproveitar** | IA transversal |
| `ecosystemMiddleware.js` (almoxarifado paths) | **Reaproveitar** | Pulse compliance |
| `m1OperationalAdoptionEnablementService.js` | **Substituir** | Métricas adoption → WMS SSOT |
| `retentionPolicyRegistry.js` (warehouse refs) | **Migrar** | Políticas apontam para `wms_*` |

---

## 5. Itens candidatos a **Descontinuar** (pós WMS-004)

| Item | Condição de descontinuação |
|------|---------------------------|
| Writes directos `warehouse_movements` via admin sem adapter | Quando WMS Core assumir movimentações |
| Dual write `logistics_inventory` + `warehouse_balances` | Quando sync documentado e único SSOT |
| Mock KPIs `LogisticsOperationalWorkspace` | WMS-003/004 (G-LOG-002 AUD-001) |
| `LogisticsPlaceholder.jsx` / `domainLazyLoader` chunk | WMS-004 |

**Nenhum item descontinuado na WMS-002** — apenas fronteira adapter.

---

## 6. Mapa de substituição SSOT

```
warehouse_materials      ──► wms_inventory_items
warehouse_balances       ──► wms_inventory_balances
warehouse_movements      ──► wms_inventory_movements
warehouse_locations      ──► wms_storage_addresses + wms_warehouse_locations
(n/a legacy)             ──► wms_receiving_orders | wms_picking_orders | wms_shipping_orders
```

---

## 7. Resumo quantitativo (WMS-002 encerrado)

| Classificação | Contagem | Estado WMS-002 |
|---------------|:--------:|----------------|
| Migrar | 2 | **Em migração** (híbrido OCL) |
| Substituir | 5 | **Parcial** — novos writes em wms_* |
| Reaproveitar | 14 | **Activo** — fora do path Core Services |
| Descontinuar | 0 | Nenhum em WMS-002 |

**Percentual migração items:** exposto em `GET /api/logistics-operational/migration/stats` e documentado em [WMS-MIGRATION-PROGRESS.md](./WMS-MIGRATION-PROGRESS.md).

---

*Inventário vivo — actualizado no encerramento WMS-002 (2026-07-17).*
