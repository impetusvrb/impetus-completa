# FIN-READY-001 — WMS Financial Valuation (GAP-FD-003)

**Contrato:** `finance.wms_valuation.v1`  
**Módulo:** `platform/readiness/finance/valuation/wmsValuationReadiness.js`  
**mutatesWmsOperationalLogic:** `false`

---

## Objectivo

Disponibilizar valuation económico do inventário via **adapter Finance** que consome quantidades WMS — sem alterar a lógica operacional do WMS.

---

## Ownership

| Informação | Owner |
|------------|-------|
| Quantidade / movimentos | `wms_inventory` (inalterado) |
| Valor económico / custos médios / lote | `finance_wms_valuation` |

---

## Superfícies

- `economic_value`  
- `average_cost`  
- `lot_cost`  
- `unit_cost`  
- `financial_metadata`  

Métodos: `average_cost` · `lot_cost` · `standard_cost` · `last_cost`

---

## API de consulta

- `extractValuationFromWmsRow(row)` — projecta metadados financeiros opcionais do item/balance  
- `projectWmsValuation(rows)` — batch  
- `WMS_VALUATION_CAPABILITY` — declaração de disponibilidade  

Quando o WMS já traz `metadata.average_cost` / `lot_cost` / `unit_cost`, o adapter materializa `economic_value = qty × cost`. Sem metadados, devolve estrutura contract-ready com nulls (consumo futuro).

---

## Proibido

- Duplicar stock master WMS  
- UI de optimização financeira de estoque (2.3)  
- Alterar movimentos WMS  
- Cálculos Smart Costing  

## Aceite GAP-FD-003

Valuation **disponível** como contrato + capability `available: true`, com seed demonstrando valor económico.
