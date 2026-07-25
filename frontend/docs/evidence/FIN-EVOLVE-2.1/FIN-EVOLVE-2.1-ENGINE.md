# FIN-EVOLVE-2.1 — Economic Intelligence Engine

**Módulo:** `domains/finance/economic-engine/economicIntelligenceEngine.js`  
**Princípio:** CALCULATE FROM REGISTERED DATA

---

## Responsabilidade

Motor reutilizável que **compõe** indicadores económicos a partir de contratos oficiais. Não substitui o Industrial Cost Service.

```
APIs costs/leakage + READY contracts
            ↓
   runEconomicIntelligence()
            ↓
   smartCosting + performance + hubKpis
            ↓
   applyEconomicIntelligenceToView (Hub)
```

## Extensões (backlog HIGH)

```js
extensions: {
  plantRateProvider(mapping, context),  // GAP-FD-005
  impactApiProvider(input),             // GAP-FD-001
  kpiAliasNormalizer(raw)               // GAP-FD-002 (default incluído)
}
```

## Observabilidade

- `finance.smart_costing.calculated`  
- `finance.performance.updated`  
- `finance.cost_analysis.completed`
