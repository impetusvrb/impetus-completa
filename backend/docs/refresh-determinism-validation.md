# Refresh Determinism Validation (Z.17)

Simula ciclos: refresh, logout/login, troca hierarchy/perfil.

Detecta:

- `oscillation_detected`
- `mutation_after_lock`
- `reinjection_after_refresh`
- `stale_merge_resurrection`
- `contextual_race_condition`

Endpoint: `GET /api/internal/operational-validation/determinism`

Flag: `IMPETUS_REFRESH_DETERMINISM_VALIDATION=on` (opcional; observability corre sempre em modo report).
