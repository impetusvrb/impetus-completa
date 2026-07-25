# FIN-EVOLVE-2.1 — Performance Económica

**Módulo:** `domains/finance/performance/economicPerformance.js`  
**Sem IA · Sem previsão**

---

## Indicadores

| ID | Label | Evidência |
|----|-------|-----------|
| cost_real | Custo real (dia) | operational.per_day |
| cost_expected | Custo esperado (baseline dia) | per_month/30 ou = real |
| cost_real_vs_expected | Δ real × esperado | real − expected |
| economic_efficiency | Eficiência económica % | (expected/real)×100 |
| economic_losses | Perdas económicas | top_loss + leakage + impact_24h |
| consolidated_operational_cost | Custo operacional consolidado | per_day + impact_24h |

## Integração Hub

Cards adicionais na mesma strip (sem novo layout): eficiência, perdas, consolidado.  
KPIs existentes actualizam hints/valores via `applyEconomicIntelligenceToView`.
