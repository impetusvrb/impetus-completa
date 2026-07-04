# SEC-04 — Observabilidade

## Métricas

| Métrica | Descrição |
|---------|-----------|
| `integrity_checks` | Verificações executadas |
| `baseline_matches` | Checks hash OK |
| `configuration_drifts` | Drifts de config |
| `runtime_drifts` | Drifts PM2/runtime |
| `filesystem_drifts` | Drifts filesystem |
| `network_drifts` | Drifts rede |
| `integrity_failures` | Erros internos |
| `integrity_score` | Último score 0–1 |

## Dashboard KPIs

Integrity Score, Critical Files, Configuration/Runtime/Filesystem/Network Drift, Process Health, Baseline Compliance

## Logs

Prefixo `[SEC-04]` — boot e erros apenas.
