# GF-016 — Ishikawa Core Domain (Schema + Workflow + APIs)

**Data:** 2026-07-17  
**Modo:** Implementação estrutural do domínio  
**Runtime:** `ishikawa_native` permanece **totalmente inactivo**

---

## Objetivo

Estabelecer a **fonte única de verdade (SSOT)** para Root Cause Analysis / Ishikawa, preparada para integração futura com Quality, NCR, CAPA, PPAP e MSA — **sem activação cognitiva**.

---

## Entregáveis

| Artefacto | Localização |
|-----------|-------------|
| Migration SQL | `backend/migrations/ishikawa_core_domain_migration.sql` |
| Semantics SSOT | `backend/src/domains/ishikawa/semantics/ishikawaCoreSemantics.js` |
| Algoritmos migrados | `backend/src/domains/ishikawa/core/ishikawaRootCauseAlgorithms.js` |
| Workflow engine | `backend/src/domains/ishikawa/workflow/ishikawaWorkflowEngine.js` |
| Services | `backend/src/domains/ishikawa/services/` |
| API REST | `backend/src/routes/ishikawa.js` → `/api/ishikawa` |
| Testes | `backend/tests/ishikawa/runIshikawaCoreDomainTests.js` |

---

## Modelo de domínio

### Entidade principal: RootCauseInvestigation

Estados: `DRAFT` → `UNDER_INVESTIGATION` → `ROOT_CAUSE_DEFINED` → `ACTIONS_DEFINED` → `UNDER_APPROVAL` → `APPROVED` → `CLOSED` → `ARCHIVED` (+ `REJECTED` com reabertura).

### Entidades normalizadas (14 tabelas)

- RootCauseInvestigation  
- InvestigationTeam  
- InvestigationEvidence  
- FishboneDiagram  
- FishboneCategory (6M fixas)  
- FishboneCause  
- FiveWhyAnalysis + FiveWhyStep  
- CorrectiveAction  
- PreventiveAction  
- VerificationResult  
- InvestigationApproval  
- AttachedDocument  
- InvestigationHistory  

### Categorias Ishikawa (6M)

`MAN` · `MACHINE` · `METHOD` · `MATERIAL` · `MEASUREMENT` · `MOTHER_NATURE`

---

## Tratamento do legado

| Regra | Estado |
|-------|--------|
| `qualityRootCauseEngine.js` importado | **NO** |
| `buildIshikawaTemplate()` migrado | **YES** |
| `fiveWhysChain()` migrado | **YES** |
| Ficheiro legado alterado | **NO** |

Novo proprietário: `domains/ishikawa/core/ishikawaRootCauseAlgorithms.js`

---

## APIs estruturais

```
GET    /api/ishikawa/investigations
GET    /api/ishikawa/investigations/:id
POST   /api/ishikawa/investigations
PUT    /api/ishikawa/investigations/:id
POST   /api/ishikawa/investigations/:id/start
POST   /api/ishikawa/investigations/:id/approve
POST   /api/ishikawa/investigations/:id/reject
POST   /api/ishikawa/investigations/:id/archive
```

Sub-recursos: team, evidence, fishbone/causes, five-whys, corrective/preventive actions, verification, documents.

---

## Integrações futuras (FK nullable, sem consumo)

- `quality_inspection_id`  
- `ncr_workflow_instance_id`  
- `capa_workflow_instance_id`  
- `ppap_submission_id`  
- `msa_study_id`  
- `supplier_ref`  
- `part_ref`  

---

## Restrições preservadas

| Restrição | Estado |
|-----------|--------|
| Signal Loader Ishikawa | NO_CHANGE |
| Promotion / Consolidação | NO_CHANGE |
| cognitiveRuntimeFacade | NO_CHANGE |
| Registries | NO_CHANGE |
| ARC-001 | PRESERVED |
| thresholds | NO_CHANGE |
| UI / CSS | NO_CHANGE |
| BASELINE-SYSTEM v1.3 | PRESERVED |

---

## Critérios obrigatórios

```
ISHIKAWA_SCHEMA_EXISTS          = YES
ISHIKAWA_DOMAIN_EXISTS          = YES
ISHIKAWA_WORKFLOW_EXISTS        = YES
ISHIKAWA_API_EXISTS             = YES
ISHIKAWA_RUNTIME_ACTIVE         = NO
ISHIKAWA_SIGNAL_LOADER          = NO_CHANGE
ISHIKAWA_PROMOTION              = NO_CHANGE
LEGACY_ALGORITHMS_MIGRATED      = YES
LEGACY_ENGINE_IMPORTED          = NO
NO_UI_CHANGED                   = YES
NO_CSS_CHANGED                  = YES
BASELINE_SYSTEM_v1.3            = PRESERVED
ARC_001_CONFORMANCE             = PRESERVED
```

---

## Testes executados

| Suite | Resultado |
|-------|-----------|
| `npm run test:ishikawa-core-domain` | **10/10** |
| `npm run test:ishikawa-runtime-foundation` | **11/11** |
| `npm run test:architecture-conformance` | **79/79** |

Regressão dos 10 runtimes homologados confirmada via foundation test (`10 LOCKED runtimes + ishikawa foundation`).

---

## Próxima etapa

**GF-017** — Signal Loader read-only consumindo este domínio SSOT, sem duplicar regras ou semântica.
