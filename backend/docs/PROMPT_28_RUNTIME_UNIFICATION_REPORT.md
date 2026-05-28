# PROMPT 28 — Unificação de Runtimes (SZ5)

**Data:** 2026-05-28  
**Fase:** T2.12 — D5 unificação voice/panel/text  
**Estado:** `on` — contexto SZ5 + legado fundido em tenants piloto (promovido 2026-05-28)

## Objetivo

Unificar runtimes **voice**, **panel**, **text**, **memory** e **orchestration** sob facade SZ5, com governança, explainability, isolamento por tenant e fallback legado (`impetusChatOperationalContextService`).

## Princípios

| Princípio | Implementação |
|-----------|---------------|
| Additive-only | Nova pasta `runtimeUnification/`; serviços legados intactos |
| Shadow-first | Default `shadow` — output = legado; logs + compare |
| Tenant isolation | Pilot tenants + RBAC nas rotas admin |
| Explainability | `unifiedRuntimeExplainer` em cada build |
| Motor A / Engine V2 | Invariantes documentados; sem remoção |
| Orchestration | Canal `observe-only` — não substitui `unifiedOrchestrator` |

## Flags

| Variável | Default | Função |
|----------|---------|--------|
| `IMPETUS_RUNTIME_UNIFICATION_MODE` | `on` | `off` \| `shadow` \| `audit` \| `on` |
| `IMPETUS_RUNTIME_UNIFICATION_ENABLED` | `true` | Activa camada |
| `IMPETUS_RUNTIME_UNIFICATION_PILOT_TENANTS` | 3 UUIDs | Rollout |

**Rollback:** `IMPETUS_RUNTIME_UNIFICATION_MODE=off` + `ENABLED=false` + `pm2 reload impetus-backend --update-env`.

**Promoção concluída (2026-05-28):** `shadow` → `audit` → `on` via `scripts/runtime-unification-promotion-pipeline.sh`.

| Etapa | Evidência |
|-------|-----------|
| shadow | `shadow_compare` voice/panel — divergência esperada (SZ5 ≠ legado); output utilizador = legado |
| audit | inserts em `runtime_unification_audit` validados |
| on | `source: merged` em pilotos; boot `[RUNTIME_UNIFICATION_BOOT] mode:on` |

## Canais

| Canal | SZ5 adapter | Legado | Consumidores integrados |
|-------|-------------|--------|-------------------------|
| `voice` | voice | impetusChatOperationalContext | `voiceRealtimeContextService` |
| `panel` | panel | impetusChatOperationalContext | `claudePanelService`, `smartPanelCommandService` |
| `text` | text | zUnifiedConversationalContextInjector | chat consolidado (já SZ5 nativo) |
| `memory` | memory | zSz5UnifiedMemoryFacade | facade |
| `orchestration` | orchestration | unifiedOrchestrator (observe) | sem bypass de execução |

## Rotas API

| Método | Rota | RBAC |
|--------|------|------|
| GET | `/api/runtime-unification/health` | auth |
| GET | `/api/runtime-unification/channels` | auth |
| GET | `/api/runtime-unification/audit` | hierarchy ≤ 3 |
| POST | `/api/runtime-unification/context/preview` | hierarchy ≤ 3 |

## Módulos

- `runtimeUnification/facade/unifiedSz5RuntimeFacade.js`
- `runtimeUnification/bridge/chatContextBridge.js`
- `runtimeUnification/governance/channelRegistry.js`
- `runtimeUnification/shadow/runtimeShadowComparator.js`
- `runtimeUnification/observability/runtimeUnificationAuditService.js`
- `runtimeUnification/explainability/unifiedRuntimeExplainer.js`

## Migração

`backend/migrations/runtime_unification_wave_migration.sql` → `runtime_unification_audit`.

## Testes

```bash
cd backend && node src/tests/waveRuntimeUnificationScenarios.js
```

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Dupla query SZ5 em on | Mesma query que injector; cache futuro opcional |
| Painel perde tabelas | `legacy_snapshot` + `tables` preservados |
| Orchestration bypass | Canal observe-only |
| Regressão voz | Shadow devolve 100% legado até promoção |

## Dependências

- SZ5 flags (`IMPETUS_SZ5_*`)
- PROMPT 27 (D5 deprecated → SZ5)
- `impetusChatOperationalContextService` (fallback)

## Serviços afetados

- `voiceRealtimeContextService.js`
- `claudePanelService.js`
- `smartPanelCommandService.js`
- PM2 boot `[RUNTIME_UNIFICATION_BOOT]`

## Rollback

1. `IMPETUS_RUNTIME_UNIFICATION_MODE=off`
2. `pm2 reload impetus-backend --update-env`
3. Integrações bridge caem em `_legacyOnly` automático
