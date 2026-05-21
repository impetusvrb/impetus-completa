# Cockpit Operational Validation (Z.17)

Métricas:

- `cockpit_integrity` (0–1)
- `operational_usefulness` (0–1)

Detecta: drift, bleed, duplication, overload.

Reutiliza `assessCockpitGovernanceConsistency` (Z.16).

Endpoint: `GET /api/internal/operational-validation/cockpit`
