# FIN-PRED-READY-001 — Historical data assessment

**Fonte:** `history/financeHistoryAssessment.js`  
**Modo:** sem alterar fontes

Para cada fonte: período · frequência · completude · qualidade · estabilidade · readiness.

| ID | Fonte | Readiness |
|----|-------|-----------|
| hist-industrial-costs | dashboard.costs | PARTIAL |
| hist-leakage | financialLeakage | PARTIAL |
| hist-wms-valuation | wms_valuation + WMS | PARTIAL |
| hist-energy | energia / kWh | NOT_READY |
| hist-production | MES drivers | PARTIAL |
| hist-drivers-rates | driver_rate.v1 | READY |
| hist-twin-overlay | Twin 2.2 (compose) | NOT_READY (não é store) |
| hist-whatif | What-if 2.3 | NOT_READY (efémero) |
| hist-platform-forecasting | platform forecasting | NOT_READY |

Twin e What-if **não** devem ser usados como histórico de facto observado.
