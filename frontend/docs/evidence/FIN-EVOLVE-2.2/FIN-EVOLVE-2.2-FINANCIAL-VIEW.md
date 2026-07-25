# FIN-EVOLVE-2.2 — Financial View

**View:** `FinanceTwinFinancialView` → `/app/finance/twin`  
**Hub card:** `FinanceTwinHubCard` no painel executivo

---

## Comportamento

1. Compõe estado financeiro via provider.  
2. Lista activos com overlay $.  
3. Detalhe do nó (custos, valuation, perdas, eficiência, risco).  
4. CTA “Abrir Twin industrial” → `/app/manutencao/manuia?tab=digital-twin&perspective=finance`  
5. Soft-load de `integrations.getDigitalTwinState` para join operacional (sem mutar layout).

Estrutura operacional do Twin industrial **permanece inalterada**.
