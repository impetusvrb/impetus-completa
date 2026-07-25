# FIN-STAB-001 — RBAC Certification

## Matriz

| Perfil | Hub Finance | Costs / Leakage | Billing |
|--------|-------------|-----------------|---------|
| CEO | ✓ | ✓ | ✓ |
| Diretor Financeiro (`finance_management`) | ✓ | ✓ | ✓ (diretor) |
| Diretor + `financial_intelligence` | ✓ | ✓ | conforme role |
| Utilizador sem permissão / sem módulo | ✗ | ✗ | ✗ |
| Diretor industrial (sem contexto financeiro) | ✗ | ✗ | ✗ |

## Fontes de política

- `financeAccess.js` — `canAccessFinanceDomain` / `canAccessFinanceDomainMenu` / `canAccessFinanceBilling`
- `FinanceOperationalLayout` — gate alinhado ao menu + cache de módulos
- `VIEW_FINANCIAL` + `isFinanceDashboardLayout`

## Estabilização

- Perfil `finance_management` inclui `financial_intelligence` em `visible_modules` (backend).
- Menu e rota alinhados para evitar falso negativo pós-001A.
