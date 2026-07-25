# OPM-GOV-001 — Compatibility Matrix

## Módulo × Contrato

| Módulo | Contratos | Movements |
|--------|-----------|-----------|
| Receiving | Lifecycle + Receipt | receipt |
| Inventory | Lifecycle + Movements | receipt, pick, issue |
| Picking | Lifecycle + Pick | pick |
| Shipping | Lifecycle + Issue | issue |

## Dimensões

```
Module → State Machine → Movement → Observability → Timeline
```

## Cadeia E2E (4 passos)

1. receiving + receipt → handoff-receiving-inventory  
2. inventory → handoff-inventory-picking  
3. picking + pick → handoff-picking-shipping  
4. shipping + issue → handoff-shipping-inventory  

Fonte: `opmGov001CompatibilityMatrix.js`
