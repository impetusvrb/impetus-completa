# Quality — Rollout Publication

- **Backend:** `IMPETUS_QUALITY_PUBLICATION_SHADOW_MODE`, `IMPETUS_QUALITY_PUBLICATION_AUDIENCE_PREVIEW` expostos no contexto e no snapshot de flags.
- **Governança:** regras aditivas em `featureGovernanceService` (`QUALITY_NAVIGATION_WITHOUT_OPERATIONAL`, `QUALITY_PUBLICATION_WITHOUT_NAVIGATION`).
- **Verificação:** `npm run test:quality-publication-runtime` (backend + frontend).
