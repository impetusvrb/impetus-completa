# FIN-EVOLVE-001 — Workspace

**Path:** `/app/finance`  
**Shell:** EOX (FinanceNavLayout + EoxModuleShell)

---

## Hub Finance

O workspace apresenta cards de integração — cada card navega para rota que **reutiliza** página existente.

- Custos industriais
- Mapa de vazamentos
- Nexus billing (admin)
- Link Centro de Comando

---

## EOX

- Entrada `finance` activa em `eoxRegistry.js` (FIN-EVOLVE-001)
- Navegação: `resolveFinanceOperationalNavigation`
- Breadcrumb: IMPETUS → Finance → módulo

---

## RBAC

Política partilhada `financeAccess.js`:

- CEO · admin contextual · finance_management · VIEW_FINANCIAL · contexto financeiro funcional

Menu: `canAccessFinanceDomainMenu` + visible_modules financeiros
