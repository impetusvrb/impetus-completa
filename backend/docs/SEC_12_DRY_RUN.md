# SEC-12 — Dry Run

## Comportamento

- `SECURITY_DRY_RUN_ONLY=true` (obrigatório em SEC-12)
- Cada acção simulada produz:
  - `expected_changes` (logical_plan_only)
  - `affected_services`
  - `estimated_duration_minutes`
  - `estimated_risk`
  - `rollback_time_minutes`
  - `executed: false`

## Verdictos bloqueados

Acções `BLOCKED` ou `INVALID` → dry-run `skipped: true`

---

*Nenhuma alteração em PM2, nginx, firewall ou runtime.*
