# Quality — Validação de audiência

- **Backend:** `qualityAudienceActivationEngine.js` — `previewAudienceMatrix`, catálogo de audiências estendidas (inspector, laboratory, third_party, maintenance, …).  
- **Frontend:** `qualityAudienceNavigation.js` permanece a fonte única de banda para menu; matrizes em `qualityRolloutAudienceMatrix.js` amarram estágio → audiências elegíveis.  
- **Framework genérico:** `shared/domain-publication/domainAudienceResolver.cjs` para reutilização inter-domínio.
