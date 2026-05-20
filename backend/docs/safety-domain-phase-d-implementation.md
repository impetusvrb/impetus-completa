# Fase D — Safety Domain Isolation & EHS Governance

## Flags (rollback sem downtime)

| Variável | Default | Efeito |
|----------|---------|--------|
| `IMPETUS_SAFETY_DOMAIN_ISOLATION` | `on` | Bloqueia publicação ambiental para SST; perfis safety |
| `IMPETUS_RUNTIME_TECHNICAL_GUARD` | `on` | Middleware + sanitização JSON técnico |
| `IMPETUS_DOMAIN_INHERITANCE_GOVERNANCE` | `on` | `moduleInheritanceGuard` no resolver |
| `VITE_IMPETUS_RUNTIME_TECHNICAL_GUARD` | `on` | Guard espelho no frontend |

```bash
IMPETUS_SAFETY_DOMAIN_ISOLATION=off IMPETUS_RUNTIME_TECHNICAL_GUARD=off pm2 reload impetus-backend --update-env
```

## Matriz EHS (resumo)

| Eixo | Herda ambiental | Módulos exclusivos | Negados |
|------|-----------------|-------------------|---------|
| `safety` | não | `safety_intelligence`, SST ops | `environment_intelligence`, GEE/ESG corporativo |
| `environmental` | — | `environment_intelligence` | módulos SST exclusivos |
| `ehs_shared` | parcial | `operational`, `audit` | — |
| `quality` | não | `quality_intelligence` | ambiental corporativo |

## Exemplo JSON — Coordenador SST

```json
{
  "functional_axis": "safety",
  "profile_code": "coordinator_safety",
  "visible_modules": ["dashboard", "safety_intelligence", "operational", "audit", "..."],
  "domain_authority": { "domain_axis": "safety", "blocked_modules": [] }
}
```

## Exemplo JSON — Coordenador Ambiental

```json
{
  "functional_axis": "environmental",
  "profile_code": "coordinator_environmental",
  "visible_modules": ["environment_intelligence", "..."],
  "environment_publication": true
}
```

## Testes

```bash
cd backend && npm run test:safety-environmental-isolation
npm run test:domain-contextual-regression
```

Snapshot: `backend/tests/domainSnapshots/safety-coordinator-snapshot.json`

## Arquivos principais

- `backend/src/domainAuthority/registry/ehsModuleInheritance.js`
- `backend/src/domainAuthority/guards/moduleInheritanceGuard.js`
- `backend/src/domainAuthority/guards/technicalRuntimeAccessGuard.js`
- `backend/src/domainAuthority/resolvers/ehsPublicationGuard.js`
- `backend/src/middleware/technicalRuntimeAccess.js`
- `frontend/src/domainAuthority/technicalRuntimeAccessGuard.js`
- `backend/docs/safety-environmental-domain-audit.md`
