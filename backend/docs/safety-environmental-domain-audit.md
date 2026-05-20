# Auditoria — Isolamento Safety / Environmental (Fase D)

**Data:** 2026-05-18

## [CRITICAL]

| Arquivo | Função | Risco | Contaminação | Mitigação Fase D |
|---------|--------|-------|--------------|------------------|
| `frontend/.../environmentAudienceNavigation.js` | `resolveEnvironmentAudienceBand` | Qualquer `coordenador` → band `coordinator` com ESG/telemetria/cognitive | environmental em perfil SST | `shouldPublishEnvironmentNavigation` + dept SST |
| `backend/.../environmentAudienceResolver.js` | `resolveEnvironmentAudienceBand` | Mesma heurística `role.includes('coordenador')` | environmental | Guard EHS + área semântica |
| `domainRegistry.js` (antes) | `safety` | Sem `environment_intelligence` em `denied_modules` | environmental via visible_modules | `denied_modules` + inheritance |
| `environment/telemetry/EnvironmentRealtimeTelemetryHub.jsx` | UI | `JSON.stringify(health\|snap)` exposto a operadores | runtime técnico | `technicalRuntimeAccessGuard` (UI) |

## [HIGH]

| Arquivo | Função | Risco | Mitigação |
|---------|--------|-------|-----------|
| `ROLE_AREA` EHS | `environmental_health_safety` → `coordinator_environmental` | EHS misturado com ambiental corporativo | → `coordinator_safety` |
| `environmentMenuPublicationEngine.js` | merge menu | Injeta itens manifest sem checar domínio | `environmentVisibilityResolver` bloqueia |
| `moduleRegistry` | orchestrator | `compatible_areas` vazio = universal | `domainIsolationGuard` + inheritance |
| `environmentTelemetry.js` | `/connectors/status` | Expõe mqtt/modbus/opcua JSON | `technicalRuntimeAccess` middleware |

## [MEDIUM]

| Arquivo | Função | Risco | Mitigação |
|---------|--------|-------|-----------|
| `environmentOperationalWorkspace.jsx` | views | Governance/ESG views por query `?view=` | Audience band `production` para SST |
| `operationalLearningService.js` | keywords | `amostra` → quality | Fora do escopo menu; guard domain no learning (futuro) |
| `gerente` safety → `director_operations` (antes) | perfil | Dashboard operacional genérico | `director_safety` |

## [LOW]

| Arquivo | Nota |
|---------|------|
| `Layout.jsx` | Merge safety + environment publication independente — OK se guards activos |
| `useVisibleModules.js` | Path `/app/environment/*` requer `environment_intelligence` — SST sem módulo não acede |

## Causa raiz confirmada

1. **Audiência ambiental por cargo genérico**, não por domínio funcional.
2. **`environment_intelligence`** não estava em `denied_modules` do eixo `safety`.
3. **Runtime técnico** renderizado em componentes React sem gate de perfil.

## Flags (rollback)

```bash
IMPETUS_SAFETY_DOMAIN_ISOLATION=off
IMPETUS_RUNTIME_TECHNICAL_GUARD=off
IMPETUS_DOMAIN_INHERITANCE_GOVERNANCE=off
pm2 reload impetus-backend --update-env
```

## Testes

```bash
npm run test:safety-environmental-isolation
npm run test:domain-contextual-regression
```
