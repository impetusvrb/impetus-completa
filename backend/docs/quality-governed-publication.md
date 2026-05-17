# Quality — Governed Publication

- **Capability:** entrada no menu com `_quality_publication: true` filtrada por `visible_modules` (`quality_intelligence`) em `useVisibleModules.js`.
- **Guard:** URL `/app/quality/*` validada por `assertQualityPublicationAccess` — módulo obrigatório; modo estrito (nav+pub Vite) exige também contexto servidor quando `publication_allowed === false`.
- **IA:** não altera publicação; apenas assiste dentro dos hubs existentes.
