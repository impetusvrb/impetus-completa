# Phase Z.0 — Menu Governance Analysis

## Objetivo

Detectar overdelivery, leakage e exposição executiva/operacional indevida — **sem esconder módulos**.

## Módulos

`backend/src/menuGovernance/`

- `governedMenuDeliveryAnalyzer.js`
- `sharedModuleLeakageAnalyzer.js`
- `executiveModuleIsolationAnalyzer.js`
- `operationalModuleIsolationAnalyzer.js`
- `contextualMenuCompositionValidator.js`

## API

`/api/internal/menu-governance/{status,leakage,targeting,tenants,report}`

## Flag

`IMPETUS_MENU_GOVERNANCE_ANALYSIS=off` (default)

## Validação bundle

```bash
cd backend && npm run phase-z0:validate
```

Inclui testes E→Y, dry deploys, backup supervisionado e readiness PM2 (sem execute).
