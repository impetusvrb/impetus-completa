# FIN-STAB-001 — Workspace Certification

**Princípio:** STABILIZE BEFORE EXPAND

## Validações

| Item | Critério | Estado |
|------|----------|--------|
| Hub Finance | `/app/finance` carrega `FinanceWorkspacePage` sob EOX | ✓ certificado |
| Landing perfil financeiro | `resolveDefaultAppPath` → `/app/finance` quando `isFinanceDashboardLayout` | ✓ |
| Identidade visual | DS Industrial 4.0 + displayName **Finance** | ✓ |
| Títulos | `workspaceName` = Finance Hub | ✓ |
| Breadcrumbs | Centro Cognitivo → Finance → Módulo | ✓ |
| EOX | `FINANCE_EOX_DOMAIN_ENTRY` activa | ✓ |
| Resolver | `buildFinanceEoxNavigationConfig` / workspace resolver | ✓ |

## Critério de aceite workspace

> O utilizador financeiro acede sempre ao Hub Finance quando aplicável (perfil `finance_management` / contexto financeiro).

## Estabilização aplicada

- Landing pós-login: perfil financeiro deixa de cair no dashboard genérico `/app`.
- Hub permanece no menu mesmo quando `visible_modules` traz `operational` sem `financial_intelligence` (fallback STAB).
