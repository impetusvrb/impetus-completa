# FIN-TWIN-READY-001 — Relationship Map

**Fonte:** `relationshipMap/twinRelationshipMap.js`  
**Sem alteração de código de produto.**

---

## Cadeia canónica

```
Ativo
  ↓
Linha
  ↓
Centro de custo
  ↓
Custo operacional
  ↓
Performance económica
```

| From → To | Via | Status | Compose? |
|-----------|-----|--------|----------|
| asset → production_line | asset_cost_map line_id | READY | não |
| production_line → cost_center | cost_center_id | READY | não |
| cost_center → industrial_cost | cost_origin_ref ↔ by-origin | READY | sim |
| industrial_cost → economic_performance | FIN-EVOLVE-2.1 | READY | sim |
| asset → smart_costing | map + drivers | READY | sim |
| driver_rate → industrial_cost | cost_origin_ref | READY | sim |
| energy → driver_rate | drv-energy | PARTIAL | sim |
| inventory_stock → valuation | wms_valuation.v1 | READY | sim |
| valuation → smart_costing | lot/material | READY | sim |
| leakage → performance | economic_losses | READY | sim |
| twin_node → asset | twin_node_ref | PARTIAL | sim |
| work_order → asset | MES/ManuIA | PARTIAL | sim |
| production_signal → driver_rate | volume/util/downtime | PARTIAL | sim |
| billing → wallet → ledger | Nexus | READY | — |
| equipment → asset | asset_type=equipment | READY | não |

Relações PARTIAL resolvem-se por **composição** no 2.2, não por novos serviços.
