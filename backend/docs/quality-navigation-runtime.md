# Quality — Navigation Runtime

- **Manifesto:** `qualityNavigationManifest.js` — rotas canónicas via `/app/quality/operational` e query `view=` (compatível com rotas WAVE6 sem novos segmentos em `App.jsx`).
- **Engine:** `qualityMenuPublicationEngine.js` — merge aditivo no menu híbrido.
- **Flags Vite:** `qualityPublicationFeatureFlags.js` (default off).
- **API:** `GET /api/quality-navigation/context` — `publication_allowed`, `rollout_shadow`, `flags`.
