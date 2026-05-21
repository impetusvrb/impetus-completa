# Phase Z.14 — Sidebar Governance Runtime

Consolidação do delivery canónico de módulos no `/dashboard/me` e protecção contra re-injeção legada no frontend.

## Pipeline (ordem)

1. Identidade governada (Z.13)
2. Hierarquia / domínio / authority
3. Matriz canónica (`canonicalModuleMatrix`)
4. `sidebarGovernanceResolver`
5. Filtro `contextual_modules`
6. `visible_modules` final + `sidebar_governance_runtime`

## Activação

- **Automática** quando enforcement real Z.13 está activo no tenant piloto.
- **Manual** com flags:
  - `IMPETUS_CANONICAL_MODULE_GOVERNANCE=on`
  - `IMPETUS_SIDEBAR_GOVERNANCE_RUNTIME=on`
  - `IMPETUS_LEGACY_MODULE_PROTECTION=on`
  - `IMPETUS_CONTEXTUAL_MODULE_HARDENING=on`

Observabilidade: `IMPETUS_SIDEBAR_OBSERVABILITY=on` (default).

## API

`/api/internal/sidebar-governance/` — `status`, `distribution`, `leakage`, `health`, `timeline`, `report`

## Frontend (sem alterar CSS)

`frontend/src/runtimeGovernance/` — adaptador usado em `Layout.jsx` e `useVisibleModules.js`.

## Testes

```bash
npm run test:sidebar-governance
```

## Deploy

```bash
pm2 reload impetus-backend --update-env
```
