# FIN-READY-001 — Asset ↔ Cost Map (GAP-FD-004)

**Contrato:** `finance.asset_cost_map.v1`  
**Módulo:** `platform/readiness/finance/asset-cost-map/assetCostMap.js`  
**implementsDigitalTwin:** `false`

---

## Objectivo

Camada de relacionamento estrutural entre activos industriais, centros de custo, equipamentos e linhas — **sem Twin financeiro**.

---

## Tipos de activo

`equipment` · `production_line` · `cell` · `cost_center` · `plant_node`

---

## Campos

`link_id`, `asset_id`, `asset_type`, `asset_label`, `twin_node_ref` (opcional), `cost_center_id`, `cost_origin_ref`, `cost_item_ref`, `driver_mapping_ids[]`, `line_id`, `equipment_id`, `owner`

---

## Registry seed (exemplos estruturais)

| link_id | Asset | Cost center / origin | Drivers |
|---------|-------|----------------------|---------|
| acm-line-a | line:A | cc-linha-a / linha-A | volume, util, downtime |
| acm-eq-press-01 | eq:press-01 | cc-linha-a / parada | downtime, energy |
| acm-cc-ops | cc:ops-plant | operacional | volume, material |
| acm-cell-pack | cell:pack | cc-pack | volume, leakage |
| acm-plant-node | plant:root | twin:layout:root | energy |

---

## Proibido

- financial_digital_twin_ui  
- what_if_engine  
- twin_dollar_attributes_mutation  
- scenario_fork  

## Owner

`finance_asset_cost_map` — layout/estado do twin continua em `digital_twin`; itens de custo em `industrial_cost_service`.
