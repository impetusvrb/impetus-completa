# FIN-EVOLVE-001A — Workspace

**Resolver:** `financeWorkspaceResolver.js`  
**Página:** `FinanceWorkspacePage.jsx`

## Hierarquia apresentada

```
Finance
├── Custos Industriais      → /app/finance/costs
├── Mapa de Vazamentos      → /app/finance/leakage
├── Billing                 → /app/finance/billing
├── Ledger                  → composição billing
└── Wallet                  → composição billing
```

## Comportamento

- O hub Finance deixa de parecer uma lista técnica de integrações.
- Cada módulo continua a reutilizar a página/serviço existente (FIN-EVOLVE-001).
- Billing, Ledger e Wallet são apresentados como módulos do domínio; Ledger e Wallet apontam para a rota billing (composição Nexus — sem engine novo).

## Observabilidade

Eventos existentes (`trackFinanceWorkspaceView`, `trackFinanceCapabilityNavigate`) preservados.
