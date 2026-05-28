# PROMPT 27 — Depreciação Segura de Runtimes Legados

**Data:** 2026-05-28  
**Fase:** Governança de dívida técnica (D3–D8)  
**Estado:** `on` — governança activa + audit trail + redirect semântico (fallback legado preservado) — promovido 2026-05-28

## Objetivo

Deprecar runtimes legados com **governança**, **compatibilidade**, **fallback** e **observabilidade**, sem remoção abrupta de Motor A, Engine V2, chat legado ou registries definicionais.

## Princípios aplicados

| Princípio | Implementação |
|-----------|---------------|
| Additive-only | Nova camada `legacyDeprecation/`; código legado intacto |
| Shadow-first | Modo default `shadow` — só logs estruturados |
| Rollout governance | Pilot tenants + modos `off\|shadow\|audit\|on` |
| Tenant isolation | `recordLegacyInvocation` filtra por pilot quando lista definida |
| Auditabilidade | Tabela `legacy_deprecation_audit` em `audit`/`on` |
| Backward compatibility | `resolveWithFallback` sempre cai para legado se redirect falhar |
| Motor A / Engine V2 | Entrada `motor_a_runtime` com `enforcement: none`, `removal_allowed: false` |

## Flags

| Variável | Default | Função |
|----------|---------|--------|
| `IMPETUS_LEGACY_DEPRECATION_MODE` | `on` | `off` \| `shadow` \| `audit` \| `on` |
| `IMPETUS_LEGACY_DEPRECATION_ENABLED` | `true` | Activa governança quando mode≠off |
| `IMPETUS_LEGACY_DEPRECATION_PILOT_TENANTS` | (3 UUIDs) | Rollout por tenant |

**Rollback:** `IMPETUS_LEGACY_DEPRECATION_MODE=off` + `IMPETUS_LEGACY_DEPRECATION_ENABLED=false` + `pm2 reload impetus-backend --update-env`.

**Promoção sugerida:** `shadow` → `audit` (validar inserts) → `on` (redirect WARN→REDIRECT em chat legado, ainda com fallback).

## Catálogo legado (SSOT governança)

| ID | Debt | Lifecycle | Replacement | Remoção |
|----|------|-----------|-------------|---------|
| `chat_ai_service_legacy` | D4 | deprecated | consolidated + loader | ❌ |
| `chat_ai_direct_import` | D4 | deprecated | loader | ❌ |
| `impetus_chat_operational_context` | D5 | deprecated | SZ5 injector | ❌ |
| `cognitive_block_registry_direct_delivery` | D3 | frozen | unifiedCognitiveRegistry | ❌ |
| `motor_a_runtime` | D8 | active | engine_v2 (estratégico) | ❌ |

## Rotas API

| Método | Rota | RBAC |
|--------|------|------|
| GET | `/api/deprecation-governance/health` | auth |
| GET | `/api/deprecation-governance/catalog` | auth |
| GET | `/api/deprecation-governance/usage` | hierarchy ≤ 3 |
| GET | `/api/deprecation-governance/audit` | hierarchy ≤ 3 |
| POST | `/api/deprecation-governance/report` | hierarchy ≤ 3 |

## Módulos

- `legacyDeprecation/config/deprecationGovernanceFlags.js`
- `legacyDeprecation/governance/legacyDeprecationRegistry.js`
- `legacyDeprecation/governance/legacyCompatibilityRouter.js`
- `legacyDeprecation/observability/deprecationAuditService.js`
- `routes/deprecationGovernance.js`

## Integrações

- `services/chatAIService.loader.js` — `_recordLegacyUsage()` em paths legacy/failover
- `services/chatAIService.js` — cabeçalho `@deprecated` (documentação)
- `server.js` — rota + boot `[LEGACY_DEPRECATION_BOOT]`

## Migração

`backend/migrations/legacy_deprecation_governance_migration.sql` → tabela `legacy_deprecation_audit`.

## Testes

```bash
cd backend && node src/tests/waveLegacyDeprecationScenarios.js
```

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Redirect em `on` quebra chat | Fallback obrigatório para legacy; BLOCK nunca remove módulo |
| Ruído de audit em hot path | Pilot tenants + shadow default |
| Falso positivo em imports | Catálogo explícito por `legacy_id` |

## Dependências

- PROMPT 26 (cognitive registry SSOT) — entrada D3 alinhada
- `chatAIService.loader.js` rollout existente (`CHAT_ENABLE_CONSOLIDATED`)
- PostgreSQL para audit trail

## Serviços afetados

- Chat IA (observabilidade apenas em shadow)
- Admin API deprecation-governance
- PM2 boot log

## Observabilidade

- Logs estruturados: `[LEGACY_DEPRECATION]` + `[LEGACY_DEPRECATION_BOOT]`
- Contadores in-memory `getUsageSnapshot()`
- Persistência BD em `audit`/`on`

## Validação produção

1. `pm2 reload impetus-backend --update-env`
2. Confirmar log `[LEGACY_DEPRECATION_BOOT]` com `mode: shadow`
3. `GET /api/deprecation-governance/health` (token admin piloto)
4. Promover para `audit` após migração SQL aplicada
