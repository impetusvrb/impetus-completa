# GF-002 — PPAP Core Domain (Schema + Workflow + APIs)

**Data:** 2026-07-16  
**Tipo:** implementação estrutural do domínio  
**Pré-requisitos:** [GF-001-PPAP-RUNTIME-FOUNDATION.md](GF-001-PPAP-RUNTIME-FOUNDATION.md) · [PPAP-ARCHITECTURE-v1.0.md](PPAP-ARCHITECTURE-v1.0.md)

---

## Gate de validação

| Flag | Valor |
|------|-------|
| `PPAP_SCHEMA_EXISTS` | **YES** |
| `PPAP_DOMAIN_EXISTS` | **YES** |
| `PPAP_WORKFLOW_EXISTS` | **YES** |
| `PPAP_API_EXISTS` | **YES** |
| `PPAP_RUNTIME_ACTIVE` | **NO** |
| `PPAP_SIGNAL_LOADER` | **NO_CHANGE** (stub GF-001) |
| `PPAP_PROMOTION` | **NO_CHANGE** |
| `NO_UI_CHANGED` | **YES** |
| `NO_CSS_CHANGED` | **YES** |
| `NO_RUNTIME_REGRESSION` | **YES** |
| `BASELINE_SYSTEM_v1.1` | **PRESERVED** |

---

## Princípio de engenharia

O domínio PPAP criado nesta fase é a **fonte única de verdade** para o processo de aprovação de peças (AIAG/VDA). GF-003+ **consomem** este modelo — nunca duplicam estados, entidades ou regras em loaders, adapters ou hubs.

**Semântica congelada:** `backend/src/domains/ppap/semantics/ppapCoreSemantics.js`

---

## Modelo canónico

### PPAPSubmission — estados

| Estado | Descrição |
|--------|-----------|
| `DRAFT` | Rascunho editável |
| `UNDER_REVIEW` | Em revisão técnica/qualidade |
| `PENDING_APPROVAL` | Aguardando aprovação formal |
| `APPROVED` | Aprovado e libertado |
| `REJECTED` | Rejeitado (reenvio permitido) |
| `EXPIRED` | Expirado |
| `SUPERSEDED` | Substituído por submissão posterior |

### Workflow normativo

```
DRAFT
  ↓ submit
SUBMISSION
  ↓ advance_technical
TECHNICAL_REVIEW
  ↓ advance_quality
QUALITY_REVIEW
  ↓ request_approval
APPROVAL
  ↓ approve
RELEASE (status APPROVED)
```

Rejeição: `reject` em SUBMISSION / TECHNICAL_REVIEW / QUALITY_REVIEW / APPROVAL → `REJECTED`  
Reenvio: `resubmit` → `DRAFT` → novo ciclo `submit`

### Níveis AIAG (catálogo)

| Level | Nome |
|-------|------|
| 1 | Warrant only |
| 2 | Warrant + product/sample |
| 3 | Warrant + limited data |
| 4 | Customer-defined subset |
| 5 | Full 18-element package |

---

## Schema (migration)

**Ficheiro:** `backend/migrations/ppap_core_domain_migration.sql`

14 tabelas normalizadas com FKs, índices e CHECK constraints — **sem JSON genérico** para campos estruturais.

| Entidade | Tabela |
|----------|--------|
| Part | `ppap_parts` |
| Supplier | `ppap_suppliers` |
| Customer | `ppap_customers` |
| Submission Level | `ppap_submission_level_catalog` |
| PPAPSubmission | `ppap_submissions` |
| PSW | `ppap_psw_records` |
| Dimensional Results | `ppap_dimensional_results` |
| Material Certification | `ppap_material_certifications` |
| Capability Study | `ppap_capability_studies` |
| Appearance Approval | `ppap_appearance_approvals` |
| Performance Test | `ppap_performance_tests` |
| Engineering Change | `ppap_engineering_changes` |
| Approval History | `ppap_approval_history` |
| Attached Documents | `ppap_attached_documents` |

### Integração futura (nullable — GF-003)

Colunas em `ppap_submissions`:

- `quality_inspection_id`
- `raw_material_lot_id`
- `raw_material_receipt_id`
- `fmea_study_ref`
- `ishikawa_analysis_ref`
- `supplier_scorecard_ref`

---

## Camada de domínio

| Módulo | Path |
|--------|------|
| Semântica AIAG/VDA | `domains/ppap/semantics/ppapCoreSemantics.js` |
| Workflow engine | `domains/ppap/workflow/ppapWorkflowEngine.js` |
| Serviço submissões | `domains/ppap/services/ppapSubmissionService.js` |
| API REST | `routes/ppap.js` → `/api/ppap/*` |

---

## APIs estruturais

| Método | Endpoint | Função |
|--------|----------|--------|
| GET | `/api/ppap/submissions` | Listar (filtro `?status=`) |
| GET | `/api/ppap/submissions/:id` | Detalhe + entidades relacionadas |
| POST | `/api/ppap/submissions` | Criar (DRAFT) |
| PUT | `/api/ppap/submissions/:id` | Actualizar (DRAFT/REJECTED) |
| POST | `/api/ppap/submissions/:id/submit` | Iniciar submissão |
| POST | `/api/ppap/submissions/:id/approve` | Aprovar (chain automática se em QUALITY_REVIEW) |
| POST | `/api/ppap/submissions/:id/reject` | Rejeitar |
| GET | `/api/ppap/semantics` | Estados e acções canónicas |

**Sem lógica cognitiva.** Auth: `requireAuth` + perfil quality/engineering.

---

## Runtime (inalterado GF-001)

```
ppap_cognitive_runtime.inactive = true
promotion_applied = false
consolidation_applied = false
binding_ratio = 0
ppap_signal_loader.signal_readiness = NO_DATASET
```

---

## Testes

```bash
npm run test:ppap-core-domain           # 9/9
npm run test:ppap-runtime-foundation    # 9/9
npm run test:logistics-runtime-foundation
npm run test:specialized-cockpit-runtime  # Quality Z.23
```

Cobertura GF-002:

- Migration / tabelas
- Catálogo AIAG 1–5
- Semântica e transições
- CRUD submissão
- Workflow completo → APPROVED + histórico
- Reject + resubmit
- Runtime inactivo preservado

---

## Ficheiros criados / alterados

| Ficheiro | Acção |
|----------|-------|
| `migrations/ppap_core_domain_migration.sql` | **NOVO** |
| `domains/ppap/semantics/ppapCoreSemantics.js` | **NOVO** |
| `domains/ppap/workflow/ppapWorkflowEngine.js` | **NOVO** |
| `domains/ppap/services/ppapSubmissionService.js` | **NOVO** |
| `routes/ppap.js` | **NOVO** |
| `tests/ppap/runPpapCoreDomainTests.js` | **NOVO** |
| `server.js` | Registo `/api/ppap` |
| `package.json` | `test:ppap-core-domain` |

**Não alterados:** Signal loader, promotion, Z.22/Z.23 activos, CentroComando, CSS, cognitive runtime flags.

---

## Próximo passo

**GF-003 — PPAP Signal Loader:** consumir `ppap_submissions` e entidades relacionadas via queries reais; bridges read-only para Quality/Logistics — **sem redefinir semântica** (importar `ppapCoreSemantics.js`).
