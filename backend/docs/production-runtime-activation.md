# Phase Z.12 — Production Runtime Activation

## Objectivo

Primeiro ciclo de activação supervisionada em produção: KPI + summary com `execute=true` e `approved_by`, sem auto-activação.

## Fluxo

1. `GET /api/internal/production-runtime-activation/readiness`
2. `GET /api/internal/production-runtime-activation/status`
3. Simulação: `{ "simulate_only": true, "execute": true, "approved_by": "..." }`
4. Activar: `POST /api/internal/production-runtime-activation/activate/:tenant`

```json
{
  "execute": true,
  "approved_by": "ops@empresa",
  "activate_kpi": true,
  "activate_summary": false
}
```

## Flags

| Flag | Defeito |
|------|---------|
| `IMPETUS_PRODUCTION_RUNTIME_ACTIVATION` | OFF |
| `IMPETUS_RUNTIME_STABILIZATION` | OFF |
| `IMPETUS_RUNTIME_ACTIVATION_SAFETY` | OFF |
| `IMPETUS_PILOT_HEALTH_SUPERVISION` | OFF |
| `IMPETUS_RUNTIME_OBSERVATION_CONSOLIDATION` | ON |

## Deploy (PM2)

```bash
pm2 reload impetus-backend --update-env
```

Proibido: `pm2 restart all`, restart bruto, auto-reload.

## Integração

`GET /dashboard/me` → `production_runtime_activation`

## Testes

```bash
npm run test:production-runtime-activation
```
