# FIN-EVOLVE-2.1 — Hub Integration

**Hook:** `useFinanceExecutiveDashboard.js`  
**Overlay:** `applyEconomicIntelligenceToView.js`

---

## Comportamento

1. Carrega APIs existentes (costs + leakage + billing soft-fail) — inalterado.  
2. Corre `runEconomicIntelligence` sobre os mesmos payloads + contratos READY.  
3. Aplica overlay aos KPIs da strip R2.0 — **mesmo layout / UX**.  
4. Emite eventos de observabilidade 2.1.

## Proibido neste passo

- Novos dashboards  
- Redesign de cards  
- Twin / What-if / Predição
