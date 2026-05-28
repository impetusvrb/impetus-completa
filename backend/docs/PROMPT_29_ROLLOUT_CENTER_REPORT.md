# PROMPT 29 — Rollout Center Unificado

**Data:** 2026-05-28  
**Fase:** T3 — Enterprise Maturity Final  
**Estado:** `on` — painel operacional + API + audit trail

## Objetivo

Painel central unificado para **flags efetivas**, **estados de governança**, **promotion gates** e **observabilidade de rollout**, sem mutar `.env` em runtime.

## Princípios

| Princípio | Implementação |
|-----------|---------------|
| Additive-only | `rolloutCenter/` + rota API + página admin |
| Shadow-first | Capacidades individuais mantêm ladder off→shadow→audit→on |
| Promotion safety | Gates advisory; deploy via `.env` + `pm2 reload` |
| Tenant isolation | Dashboard scoped; audit por `company_id` |
| Auditabilidade | `rollout_center_audit` |
| Explainability | Checks por gate em payload JSON |
| No bypass | Não altera flags nem remove runtimes legados |

## Flags (Rollout Center)

| Variável | Default | Função |
|----------|---------|--------|
| `IMPETUS_ROLLOUT_CENTER_MODE` | `on` | `off` \| `shadow` \| `audit` \| `on` |
| `IMPETUS_ROLLOUT_CENTER_ENABLED` | `true` | Activa API/painel |

**Rollback:** `IMPETUS_ROLLOUT_CENTER_MODE=off` + `pm2 reload --update-env`.

## Capacidades catalogadas (SSOT)

P23 Industrial Backbone · P24 Action Runtime · P25 Workflow · P26 Cognitive Registry · P27 Legacy Deprecation · P28 Runtime Unification · SZ5 Anonymization · APM · RLS · MFA.

## Rotas API

| Método | Rota | RBAC |
|--------|------|------|
| GET | `/api/rollout-center/health` | auth |
| GET | `/api/rollout-center/dashboard` | hierarchy ≤ 3 |
| GET | `/api/rollout-center/capabilities` | hierarchy ≤ 3 |
| GET | `/api/rollout-center/flags/effective` | hierarchy ≤ 3 |
| GET | `/api/rollout-center/gates` | hierarchy ≤ 3 |
| POST | `/api/rollout-center/gates/evaluate` | hierarchy ≤ 2 |
| GET | `/api/rollout-center/audit` | hierarchy ≤ 2 |

## Frontend

- `/app/admin/rollout-center` — `RolloutCenterHub.jsx` (StrictAdmin)
- Menu: **Rollout Center** na barra admin

## Migração

`backend/migrations/rollout_center_governance_migration.sql`

## Testes

```bash
cd backend && node src/tests/waveRolloutCenterScenarios.js
```

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Falsa sensação de promoção automática | UI + API declaram deploy manual |
| Drift env vs PM2 | Integração `flagReconcilerRuntime` no dashboard |
| Sobrecarga dashboard | Read-only; cache desactivado (`no-store`) |

## Dependências

- `flagReconcilerRuntime`
- Waves P23–P28 health facades
- PM2 + `.env` para mudanças reais de modo

## Serviços afetados

- Novo: `rolloutCenter/*`, `routes/rolloutCenter.js`
- Boot: `[ROLLOUT_CENTER_BOOT]`
- Frontend: `App.jsx`, `Layout.jsx`, `api.js`

## Rollback

1. `IMPETUS_ROLLOUT_CENTER_MODE=off`
2. Remover entrada menu (opcional)
3. `pm2 reload impetus-backend --update-env`
