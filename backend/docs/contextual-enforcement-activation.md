# Phase Z.2 — Controlled Contextual Enforcement Activation

## Transição

**Z.0** observação → **Z.1** preparação → **Z.2** enforcement tenant-supervised (primeiro enforcement REAL controlado).

## Módulos

`backend/src/contextualActivation/`

| Supervisor | Função |
|------------|--------|
| `tenantContextualEnforcementSupervisor` | Activação progressiva por canal |
| `tenantVisibilityCoordinator` | Coordena menu + flags |
| `tenantModuleIsolationRuntime` | Isolamento por domínio |
| `tenantDashboardGovernanceRuntime` | Densidade dashboard (graceful) |
| `tenantEnforcementRollbackReadiness` | Plano rollback |
| `safeMenuVisibilityRuntime` | Menu enforcement real |
| `governedMenuPruningRuntime` | Pruning graceful |
| `hierarchyVisibilityEnforcer` | Hierarquia |
| `domainIsolationRuntime` | Domínio |

## Activação progressiva (canais)

`menu` → `dashboard` → `kpi` → `summary`

```bash
POST /api/internal/contextual-activation/activate/:tenant
{
  "execute": true,
  "approved_by": "ops@empresa",
  "channel": "menu"
}
```

Pré-requisitos (Z.1):

- `tenant_readiness.enforcement_ready`
- `visibility.readiness_score >= 0.75`

## Flags

| Variável | Default |
|----------|---------|
| `IMPETUS_CONTEXTUAL_ENFORCEMENT_ACTIVATION` | **off** |
| `IMPETUS_TENANT_CONTEXTUAL_ENFORCEMENT` | **off** |
| `IMPETUS_SAFE_MENU_ENFORCEMENT` | **off** |
| `IMPETUS_CONTEXTUAL_ENFORCEMENT_OBSERVABILITY` | **on** |

## Integração `/dashboard/me`

Quando tenant + flags activos: `visible_modules` filtrados com **graceful degradation**; meta em `contextual_enforcement_activation`.

## Rollback

```bash
POST /api/internal/contextual-activation/deactivate/:tenant
{ "execute": true, "approved_by": "ops@empresa" }
```

Restaura módulos via estado pré-enforcement em meta do bloco.

## Testes

```bash
npm run test:contextual-activation
```
