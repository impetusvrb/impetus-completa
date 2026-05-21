# Terminal Governance Lock (Phase Z.16)

## Objetivo

Etapa **terminal** canónica após governança Z.13–Z.15. Após o lock, o runtime não permite inject, merge, enrich, restore, augment, fallback nem contextualize tardio.

## Módulos

- `backend/src/terminalGovernance/terminalGovernanceLock.js` — `isTerminalGovernanceLocked()`, detecção de mutação pós-lock
- `backend/src/terminalGovernance/governanceTerminalStage.js` — `runGovernanceTerminalStage()`
- `backend/src/terminalGovernance/terminalGovernanceFacade.js` — integração dashboard/KPI/summary

## Payload canónico

```json
{
  "sidebar_governance_runtime": {
    "governance_applied": true,
    "final_governance_locked": true,
    "source_of_truth": "final_visible_modules",
    "post_governance_mutation_allowed": false
  },
  "governance_freeze_state": {
    "governance_locked": true,
    "reinjection_blocked": true,
    "legacy_pipeline_disabled": true,
    "terminal_resolution_applied": true
  }
}
```

## Flags (`.env`)

| Flag | Default |
|------|---------|
| `IMPETUS_TERMINAL_GOVERNANCE` | off |
| `IMPETUS_TERMINAL_SIDEBAR_LOCK` | off |
| `IMPETUS_TERMINAL_KPI_LOCK` | off |
| `IMPETUS_TERMINAL_SUMMARY_LOCK` | off |
| `IMPETUS_TERMINAL_REINJECTION_BLOCK` | off |
| `IMPETUS_TERMINAL_GOVERNANCE_OBSERVABILITY` | on |

Com flags off, o lock activa em piloto real quando `sidebar_governance_runtime.governance_applied` e observability on.

## API interna

`GET /api/internal/terminal-governance/{status,sidebar,kpis,summaries,cockpit,denied,mutations,reinjection,freeze-state,report}`

## Testes

```bash
npm run test:terminal-governance
npm run test:terminal-sidebar-lock
npm run test:terminal-kpi-lock
npm run test:terminal-summary-lock
npm run test:terminal-reinjection-block
```
