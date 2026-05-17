# Quality — Publication Runtime (plano)

## Objectivo

Publicar o domínio **QUALITY** no menu e no runtime de navegação sob **flags**, **visible_modules** (`quality_intelligence`), **audiência derivada** (sem `if(role)` no Layout) e API **`/api/quality-navigation/context`**.

## Componentes

| Camada | Ficheiro(s) |
|--------|-------------|
| Frontend | `frontend/src/domains/quality/navigation/*` |
| Menu | `mergeQualityPublicationIntoMenu` injectado após `buildHybridMenu` em `Layout.jsx` |
| Guard | `QualityRuntimePublicationGate` em `QualityOperationalLayout.jsx` |
| Backend | `backend/src/routes/qualityNavigation.js`, `domains/quality/navigation/*` |

## Rollout

1. Activar `IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED` + módulo `quality_intelligence` (existente).
2. Activar `VITE_IMPETUS_QUALITY_*_VISIBILITY` conforme camadas desejadas.
3. Activar `VITE_IMPETUS_QUALITY_NAVIGATION_ENABLED` + `VITE_IMPETUS_QUALITY_PUBLICATION_RUNTIME_ENABLED` + envs backend espelhados.
4. Opcional: `IMPETUS_QUALITY_PUBLICATION_SHADOW_MODE` para métricas sem alterar UX crítica.

## Não-objectivos

Sem alteração a `App.jsx`, backbone, authority router, observability core WAVE2; apenas extensões aditivas.
