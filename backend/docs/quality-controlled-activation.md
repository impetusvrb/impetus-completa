# Quality — Ativação controlada

## Flags canónicas

**Frontend (Vite)**  
- `VITE_IMPETUS_QUALITY_NAVIGATION_ENABLED=true`  
- `VITE_IMPETUS_QUALITY_PUBLICATION_RUNTIME_ENABLED=true`  
- Sub-flags de visibilidade (governance / executive / operational) conforme rollout.

**Backend**  
- `IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED=true`  
- `IMPETUS_QUALITY_NAVIGATION_RUNTIME_ENABLED=true`  
- `IMPETUS_QUALITY_PUBLICATION_RUNTIME_ENABLED=true`  
- `IMPETUS_QUALITY_ACTIVATION_STAGE` — `shadow` \| `pilot` \| `canary` \| `staged` \| `partial` \| `full` (default `shadow`).

## API

- `GET /api/quality-activation/safe-checks` — validações seguras antes de escalar publicação.  
- `POST /api/quality-activation/shadow-preview` — dry-run de audiências (sem efeitos permanentes).  
- `GET /api/quality-activation/orchestrate` — snapshot de orquestração por tenant.

## Shadow

- `IMPETUS_QUALITY_PUBLICATION_SHADOW_MODE=true` — bloqueia publicação definitiva no motor de rollout backend (`qualityActivationRolloutEngine`).

## Compatibilidade

Alterações são **aditivas**; runtime QUALITY existente, guards de navegação e `App.jsx` não são reestruturados.
