# Safety Runtime Balancing (Z.25)

## Domain weighting

| Perfil | Operacional | Governança | Estratégico |
|--------|-------------|------------|-------------|
| `safety_technician` | 80% | 15% | 5% |
| `coordinator_safety` | 65% | 25% | 10% |

Fontes: `phaseZ25FeatureFlags.getProfileWeights`, `cockpitCompositionRegistry.getPersonaWeights`.

## Density

`IMPETUS_SAFETY_DENSITY_GOVERNOR=on` — reutiliza `cockpitDensityGovernor` com max 6 centros / 8 widgets.

## Fallback

`cockpitFallbackSupervisor` preserva legacy e rollback; `global_replace: false`.
