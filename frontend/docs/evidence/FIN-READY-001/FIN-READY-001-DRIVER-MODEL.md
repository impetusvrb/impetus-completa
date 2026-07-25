# FIN-READY-001 — Driver Model (GAP-FD-011)

**Contrato:** `finance.driver_rate.v1`  
**Módulo:** `platform/readiness/finance/driver-model/driverRateModel.js`  
**computesCosts:** `false`

---

## Objectivo

Publicar a infraestrutura de mapeamento entre drivers industriais, rates financeiros e categorias de custo — **sem calcular custos**.

---

## Enums

| Driver kinds | Rate units | Cost categories |
|--------------|------------|-----------------|
| volume, utilization, energy, time, material, labor, loss | per_unit, per_hour, per_kwh, per_kg, per_event, fixed_period | operational, energy, material, labor, maintenance, loss_leakage, overhead |

---

## Campos do contrato

`mapping_id`, `driver_kind`, `driver_source_id`, `driver_metric`, `rate_value`, `rate_unit`, `currency`, `cost_category`, `cost_origin_ref`, `plant_id`, `valid_from/to`, `owner`

`rate_value` pode ser `null` nesta fase — a estrutura está pronta; o preenchimento operacional ocorre no FIN-EVOLVE-2.1.

---

## Registry seed

| mapping_id | Driver | Source | Category |
|------------|--------|--------|----------|
| drv-volume-ops | volume | production_mes | operational |
| drv-util-ops | utilization | production_mes | operational |
| drv-energy | energy | iot_energy | energy |
| drv-time-downtime | time | production_mes | loss_leakage |
| drv-material | material | wms_inventory | material |
| drv-loss-leakage | loss | financial_leakage | loss_leakage |

---

## Proibido

- unit_cost_calculation  
- smart_costing_algorithm  
- runtime_cost_engine  
- dashboard_widgets  

## Owner

`finance_driver_model` — não substitui `industrial_cost_service`.
