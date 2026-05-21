# Governance Freeze State (Z.16)

## Payload

```json
{
  "governance_locked": true,
  "reinjection_blocked": true,
  "legacy_pipeline_disabled": true,
  "terminal_resolution_applied": true,
  "mutation_after_lock_detected": false
}
```

## Semântica

| Campo | Significado |
|-------|-------------|
| `governance_locked` | Runtime terminal activo |
| `reinjection_blocked` | `denied_publications` imutáveis |
| `legacy_pipeline_disabled` | Injectors legacy não executam |
| `terminal_resolution_applied` | `resolveFinalDelivery` concluído |
| `mutation_after_lock_detected` | Diff pós-lock (observability) |

## Consumo

- Backend: `isTerminalGovernanceLocked({ governance_freeze_state })`
- Frontend: `terminalGovernanceGuard.isTerminalGovernanceLocked(dashboardMe)`
- API: `GET /api/internal/terminal-governance/freeze-state`

## Rollback

Flags Z.16 em `off` + desactivar piloto Z.13 restaura pipeline legacy sem remover código.
