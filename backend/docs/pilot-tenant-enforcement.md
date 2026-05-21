# Phase Z.3 — Pilot Tenant Runtime Enforcement

## Objetivo

Primeiro rollout **real** em produção: tenant piloto, **menu only**, graceful stabilization.

## Fluxo de activação

```bash
# 1. Registar + activar (menu only)
POST /api/internal/pilot-tenants/activate/:tenant
{
  "execute": true,
  "approved_by": "ops@empresa",
  "visible_modules": ["dashboard","hr_intelligence","environment_intelligence"]
}

# 2. Validar /dashboard/me — leakage reduzido, dashboard preservado

# 3. Rollback se necessário
POST /api/internal/pilot-tenants/rollback/:tenant
{ "execute": true, "approved_by": "ops@empresa", "visible_modules_before": [...] }
```

## Flags (Etapa 8)

| Variável | Default |
|----------|---------|
| `IMPETUS_PILOT_TENANT_ENFORCEMENT` | off |
| `IMPETUS_MENU_RUNTIME_STABILIZATION` | off |
| `IMPETUS_UNDERDELIVERY_PROTECTION` | on* |
| `IMPETUS_DASHBOARD_GRACEFUL_STABILIZATION` | off |
| `IMPETUS_PILOT_RUNTIME_OBSERVABILITY` | on |

\* underdelivery recomendado ON em piloto; enforcement de protecção activa com flag.

Também requer Z.2 flags para canal menu: `IMPETUS_CONTEXTUAL_ENFORCEMENT_ACTIVATION`, `IMPETUS_TENANT_CONTEXTUAL_ENFORCEMENT`, `IMPETUS_SAFE_MENU_ENFORCEMENT`.

## Pipeline menu (Z.3)

1. Governed pruning (Z.2)
2. Graceful preservation
3. Minimum operational visibility
4. Fallback protection
5. Dashboard survival guard
6. Underdelivery protection

## Integração `/dashboard/me`

Bloco `pilot_runtime_enforcement` com `visible_modules_before`, observação e stabilização.

## Testes

```bash
npm run test:pilot-tenant-enforcement
```
