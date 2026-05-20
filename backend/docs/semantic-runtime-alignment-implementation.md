# Fase K — Semantic Runtime Alignment — Implementação

## Arquitectura

```
semanticGovernance/          runtimeAlignment/           dashboardGovernance/
├── publication resolver     ├── orphan detectors        ├── card resolver
├── menu composition         ├── KPI/summary alignment   ├── widget exposure
├── inheritance guard        ├── dependency map          └── card composition
├── publication isolation    ├── fallback sanitizer
└── governedSharedModules    └── semantic telemetry
         │                            │
         └──────── semanticRuntimeAlignmentFacade ──────┘
                              │
                    dashboard.js (additive hooks)
```

## Runtime flow (shadow-first)

```
GET /dashboard/me
  → legacy Motor A response
  → policyEngine.resolveContentExposure (Fase E)
  → semanticRuntimeAlignmentFacade.enrichDashboardMe (Fase K)
       → DENY (failsafe sections)
       → DOMAIN AUTHORITY (moduleInheritanceGuard)
       → SEMANTIC INHERITANCE (safety↔quality isolation)
       → ENVELOPE (content_exposure)
       → GOVERNED SHARED MODULES
       → OPTIONAL UX (no auto-hide)
  → response + semantic_alignment block (additive JSON)
```

**Default:** `shadow_only: true` — módulos **não** removidos até flag de enforcement.

## Publication governance

Precedência implementada em `semanticModulePublicationResolver.js`:

1. DENY (safe minimal / failsafe)
2. DOMAIN AUTHORITY (`domainAuthority.moduleInheritanceGuard`)
3. SEMANTIC AUTHORITY (`semanticModuleInheritanceGuard`)
4. ENVELOPE (`cognitive_envelope` / `content_exposure`)
5. GOVERNED SHARED (`governedSharedModules`)
6. OPTIONAL UX

## Semantic authority — governed shared modules

Classificações: `exclusive`, `shared_governed`, `cross_domain_safe`, `operational_only`, `executive_only`, `technical_only`, `tenant_optional`.

## Orphan detection

| Módulo | Log |
|--------|-----|
| `orphanPipelineDetector` | `ORPHAN_PIPELINE_DETECTED` |
| `orphanEnricherDetector` | `LEGACY_ENRICHER_DETECTED` |
| `duplicatedPipelineDetector` | `DUPLICATED_CONTEXT_BUILDER` |

## Governed cards

Cada card: `semantic_scope`, `governance_scope`, `domain_compatibility`.  
Shadow: observa misalignment; `auto_hidden: false` por defeito.

## KPI / Summary / Insight alignment

Quando sem dados reais:

- `contextual_insufficiency: true`
- `do_not_invent: true`
- `corporate_aggregation_blocked: true`
- scores: `contextual_integrity_score`, `semantic_alignment_score`, `governance_confidence`

## Feature flags

| Flag | Default |
|------|---------|
| `IMPETUS_SEMANTIC_PUBLICATION_GOVERNANCE` | off |
| `IMPETUS_RUNTIME_ALIGNMENT_AUDIT` | off |
| `IMPETUS_ORPHAN_PIPELINE_DETECTION` | off |
| `IMPETUS_GOVERNED_CARD_ORCHESTRATION` | off |
| `IMPETUS_CONTEXTUAL_FALLBACK_SANITIZATION` | off |
| `IMPETUS_SEMANTIC_RUNTIME_OBSERVABILITY` | **on** |

## API interna

| GET | Path |
|-----|------|
| Publication | `/api/internal/governance/runtime-alignment/publication` |
| Orphans | `.../orphans` |
| Dependencies | `.../dependencies` |
| Cards | `.../cards` |
| Leakage | `.../leakage` |
| Health | `.../semantic-health` |
| Report | `.../report` |

## Testes

```bash
npm run test:semantic-runtime-alignment
```

Snapshots: `tests/semantic-runtime-alignment/snapshots/` (safety, environmental, quality, hr, executive, operational, shared_modules).

## Rollout guidance

1. **Semana 1:** observability ON apenas; rever `semantic_alignment` em `/dashboard/me`
2. **Semana 2:** `IMPETUS_ORPHAN_PIPELINE_DETECTION=on` em staging
3. **Semana 3:** `IMPETUS_SEMANTIC_PUBLICATION_GOVERNANCE=on` em staging (enforcement)
4. **Semana 4+:** cards e fallback sanitization se métricas estáveis

## Rollback

```bash
IMPETUS_SEMANTIC_PUBLICATION_GOVERNANCE=off
IMPETUS_GOVERNED_CARD_ORCHESTRATION=off
IMPETUS_CONTEXTUAL_FALLBACK_SANITIZATION=off
# Manter ou desligar observability conforme necessidade
IMPETUS_SEMANTIC_RUNTIME_OBSERVABILITY=on
pm2 reload impetus-backend --update-env
```

Remover blocos `semantic_alignment` da resposta não é necessário — frontend ignora chaves desconhecidas.

## Observability guidance

- Métricas: `semantic_publication_integrity`, `publication_leakage_count`, `runtime_semantic_health`
- Audit: `semanticPublicationAudit` → `cognitiveGovernanceAuditFeed`
- Relatório: `GET .../runtime-alignment/report`

## Compatibilidade

- Fases E→J: intactas
- Bootstrap shadow: preservado
- Motor A/B: não alterado
- UX/CSS: sem alteração visual; apenas metadados JSON aditivos
