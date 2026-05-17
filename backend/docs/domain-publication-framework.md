# Domain Publication Framework

Local: **`/shared/domain-publication/*.cjs`** (lógica pura, CommonJS).

| Módulo | Função |
|--------|--------|
| `domainPublicationFramework.cjs` | `evaluatePublicationReadiness`, `pathBelongsToDomain` |
| `domainAudienceResolver.cjs` | `resolveDomainAudienceBand` |
| `domainPublicationGuard.cjs` | `assertPublicationPathAllowed` |
| `domainVisibilityEngine.cjs` | `filterManifestByAudience` |
| `domainMenuPublicationEngine.cjs` | `mergeDomainMenuItems` |
| `domainPublicationMetrics.cjs` | nomes canónicos de métricas |
| `domainPublicationAudit.cjs` | `makePublicationAuditEntry` |

**Frontend bridge:** `frontend/src/shared/domain-publication/frameworkBridge.js` (ESM + `createRequire`).

Próximos domínios (SST, Ambiental, Logística) devem declarar manifesto, prefixo de rota e consumir as mesmas primitivas sem duplicar governo de permissões.
