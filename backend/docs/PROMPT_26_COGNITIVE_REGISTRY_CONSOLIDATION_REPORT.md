# PROMPT 26 — Consolidação de Registries Cognitivos

**Data:** 2026-05-28  
**Fase:** T2 — Consolidação cognitiva  
**Estado:** `on` — SSOT + audit trail + redirect autoritativo em consumidores piloto (2026-05-28)

## Objetivo

Eliminar **cognitive sprawl**, **registries conflitantes**, **metadata divergence** e **runtime ambiguity** através de um **facade SSOT** aditivo, sem remover runtimes legados.

## Single Source of Truth (leitura)

| Aspecto | Autoridade canónica |
|---------|---------------------|
| Metadados de blocos | `cognitiveBlockRegistry` (metadata_catalog) |
| Política de domínio | `cognitiveDomainRegistry` |
| Entrypoints / flows | `cognitiveEntrypointRegistry` |
| Composição persona | `cockpitCompositionRegistry` |
| **Entrega real (widgets)** | `engine_v2_cockpit` (`cognitiveRuntimeFacade`) |
| **Resolução unificada** | `unifiedCognitiveRegistry` (facade) |

`delivery_active: false` no block registry é **intencional** — não é bug; a divergência é documentada e resolvida via `metadata_only` + `delivery_authority`.

## Flags

| Variável | Default | Função |
|----------|---------|--------|
| `IMPETUS_COGNITIVE_REGISTRY_CONSOLIDATION_MODE` | `on` | `off` \| `shadow` \| `audit` \| `on` |
| `IMPETUS_COGNITIVE_REGISTRY_SSOT_ENABLED` | `true` | Activa facade SSOT |
| `IMPETUS_COGNITIVE_REGISTRY_PILOT_TENANTS` | (opcional) | Rollout por tenant |

**Rollback:** `IMPETUS_COGNITIVE_REGISTRY_CONSOLIDATION_MODE=off` + `IMPETUS_COGNITIVE_REGISTRY_SSOT_ENABLED=false` + `pm2 reload`.

## Rotas API

| Método | Rota |
|--------|------|
| GET | `/api/cognitive-registry/health` |
| GET | `/api/cognitive-registry/snapshot` |
| GET | `/api/cognitive-registry/sources` |
| GET | `/api/cognitive-registry/divergence` |
| GET | `/api/cognitive-registry/blocks/:blockId` |
| GET | `/api/cognitive-registry/domains/:domainKey` |
| GET | `/api/cognitive-registry/domains/:domainKey/blocks` |
| POST | `/api/cognitive-registry/cache/invalidate` (hierarchy ≤ 2) |

## Módulos

- `cognitiveRegistry/consolidation/unifiedCognitiveRegistry.js` — SSOT facade
- `cognitiveRegistry/consolidation/registrySourceCatalog.js` — papéis por fonte
- `cognitiveRegistry/consolidation/metadataDivergenceDetector.js` — divergências
- `cognitiveRegistry/consolidation/cognitiveRegistryAuditService.js` — audit trail
- `routes/cognitiveRegistry.js`
- `cognitiveRegistry/consolidation/cognitiveRegistryBridge.js` — redirect autoritativo (modo `on`)

## BD

`cognitive_registry_consolidation_audit` — migração `cognitive_registry_consolidation_migration.sql`

## Integração aditiva

- `cognitiveBlockRegistry.getRegistryStats()` — campos `registry_role`, `ssot_read_facade`
- `cognitiveRuntimeFacade.getCognitiveRuntimeStatus()` — bloco `registry_consolidation`

## O que NÃO mudou (backward compatibility)

- Imports directos a `cognitiveBlockRegistry`, packs, domain registries
- Motor A, Engine V2, delivery pipelines
- `IMPETUS_COGNITIVE_BLOCK_REGISTRY` e flags Z.18–Z.29

## Testes

```bash
cd backend && node src/tests/waveCognitiveRegistryConsolidationScenarios.js
```

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Consumidores ignorarem SSOT | Facade opcional; legado intacto |
| Falso positivo em divergência | Severidades info/low/medium/high |
| Cache stale | TTL 60s + invalidate API |

## Promoção (2026-05-28)

| Passo | Estado |
|-------|--------|
| `shadow` — SSOT + divergência sem persistência BD | ✅ |
| `audit` — audit trail em `cognitive_registry_consolidation_audit` | ✅ |
| `on` — redirect via `cognitiveRegistryBridge` | ✅ |

Em **on** (tenants piloto): `domainBlockRegistry`, `cognitiveBlockResolver`, `compositionEligibilityResolver` leem blocos via SSOT com pesos de domínio. Delivery Engine V2 **inalterado**.

**Bridge:** `cognitiveRegistry/consolidation/cognitiveRegistryBridge.js`
