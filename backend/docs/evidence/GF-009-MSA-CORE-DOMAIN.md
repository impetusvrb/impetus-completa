# GF-009 — MSA Core Domain (Schema + Workflow + APIs)

**Data:** 2026-07-17  
**Tipo:** implementação estrutural do domínio  
**Pré-requisitos:** [GF-008-MSA-RUNTIME-FOUNDATION.md](GF-008-MSA-RUNTIME-FOUNDATION.md) · [MSA-ARCHITECTURE-v1.0.md](MSA-ARCHITECTURE-v1.0.md) · [BASELINE-SYSTEM-v1.2.md](BASELINE-SYSTEM-v1.2.md) (LOCKED)

---

## Gate de validação

| Flag | Valor |
|------|-------|
| `MSA_SCHEMA_EXISTS` | **YES** |
| `MSA_DOMAIN_EXISTS` | **YES** |
| `MSA_WORKFLOW_EXISTS` | **YES** |
| `MSA_API_EXISTS` | **YES** |
| `MSA_RUNTIME_ACTIVE` | **NO** |
| `MSA_SIGNAL_LOADER` | **NO_CHANGE** (stub GF-008) |
| `MSA_PROMOTION` | **NO_CHANGE** |
| `NO_UI_CHANGED` | **YES** |
| `NO_CSS_CHANGED` | **YES** |
| `NO_RUNTIME_REGRESSION` | **YES** |
| `BASELINE_SYSTEM_v1.2` | **PRESERVED** |
| `ARC_001_CONFORMANCE` | **PRESERVED** (sem alteração à suíte) |

---

## Escopo entregue

Core Domain MSA aditivo sobre GF-008. **Sem** Signal Loader, Promotion, Consolidação, Centro de Comando, widgets, hubs, CSS, IA, KPIs ou runtime activo.

### Princípio

`msaCoreSemantics.js` + schema SQL = **fonte única de verdade**. GF-010+ consome via loader — **proibido** duplicar estados em adapters/hubs.

---

## Modelo de domínio

### Entidade principal — MeasurementStudy

Tabela: `msa_measurement_studies`

| Campo | Descrição |
|-------|-----------|
| `study_number` | Identificador único por tenant |
| `status` | DRAFT · PLANNED · IN_PROGRESS · UNDER_REVIEW · APPROVED · REJECTED · ARCHIVED |
| `workflow_stage` | DRAFT · PLANNING · EXECUTION · TECHNICAL_REVIEW · APPROVAL · ARCHIVE |

### Tipos de estudo (tabelas dedicadas 1:1)

| Entidade | Tabela |
|----------|--------|
| VariableGrrStudy | `msa_variable_grr_studies` |
| AttributeAgreementStudy | `msa_attribute_agreement_studies` |
| BiasStudy | `msa_bias_studies` |
| LinearityStudy | `msa_linearity_studies` |
| StabilityStudy | `msa_stability_studies` |

Discriminante `study_kind` na API aponta para a tabela correcta — **sem** coluna JSON para dados permanentes.

### Entidades de suporte

| Entidade | Tabela |
|----------|--------|
| Gauge | `msa_gauges` |
| Instrument | `msa_instruments` |
| Operator | `msa_operators` |
| Part | `msa_parts` |
| MeasurementSample | `msa_measurement_samples` |
| CalibrationReference | `msa_calibration_references` |
| StudyApproval | `msa_study_approvals` |
| AttachedDocument | `msa_attached_documents` |
| Audit trail | `msa_study_history` |

Junction: `msa_study_operators`, `msa_study_parts`

### Integrações futuras (FK nullable — sem consumo GF-009)

`quality_inspection_id`, `ppap_submission_id`, `ppap_capability_study_id`, `supplier_ref`, `production_order_ref`, `spc_chart_ref`, `capability_study_ref`

---

## Workflow canónico

```
DRAFT ──plan──► PLANNING (PLANNED)
         start
PLANNING ──────► EXECUTION (IN_PROGRESS)
         review
EXECUTION ─────► TECHNICAL_REVIEW (UNDER_REVIEW)
         advance_approval
TECHNICAL_REVIEW ► APPROVAL (UNDER_REVIEW)
         approve
APPROVAL ──────► APPROVED
         archive
APPROVED ──────► ARCHIVED

reject (EXECUTION | TECHNICAL_REVIEW | APPROVAL) → REJECTED
reopen (REJECTED) → DRAFT
```

Implementação: `msaWorkflowEngine.js` + transacções em `msaStudyService.runWorkflowAction()`.

---

## APIs estruturais (`/api/msa`)

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/semantics` | Estados, stages, kinds, acções |
| GET/POST | `/studies` | Listar / criar (DRAFT) |
| GET/PUT | `/studies/:id` | Detalhe / actualizar |
| POST | `/studies/:id/plan` | DRAFT → PLANNED |
| POST | `/studies/:id/start` | PLANNED → IN_PROGRESS |
| POST | `/studies/:id/review` | IN_PROGRESS → UNDER_REVIEW |
| POST | `/studies/:id/approve` | APPROVAL → APPROVED |
| POST | `/studies/:id/reject` | Rejeitar |
| POST | `/studies/:id/reopen` | Reabrir |
| POST | `/studies/:id/archive` | APPROVED → ARCHIVED |
| POST | `/gauges`, `/parts`, `/operators` | Master data |
| POST | `/studies/:id/samples` | MeasurementSample |
| POST | `/studies/:id/documents` | AttachedDocument |
| POST | `/studies/:id/approvals` | StudyApproval |

Registo: `server.js` → `useRoute('/api/msa', …)` (stack auth + tenant igual PPAP).

---

## Ficheiros criados

```
migrations/msa_core_domain_migration.sql
src/domains/msa/semantics/msaCoreSemantics.js
src/domains/msa/workflow/msaWorkflowEngine.js
src/domains/msa/services/msaStudyService.js
src/domains/msa/services/msaMasterDataService.js
src/domains/msa/services/msaStudyEvidenceService.js
src/routes/msa.js
tests/msa/runMsaCoreDomainTests.js
```

**Não alterados:** `cognitiveRuntimeFacade.js`, registries cognitivos, ARC-001 manifest, `CentroComando.jsx`, runtimes homologados.

---

## Testes

```bash
npm run test:msa-core-domain
npm run test:msa-runtime-foundation   # regressão GF-008
npm run test:architecture-conformance # quando ambiente BD disponível
```

Cobertura GF-009: migration, semântica, CRUD, workflow completo, tipos separados, runtime inactivo preservado.

---

## Próximo passo

**GF-010 — MSA Signal Loader:** consumir `msa_measurement_studies` + extensões via bridge read-only — sem redefinir workflow/status inline.

---

## Evidência de encerramento

```
GF-009_STATUS           = COMPLETE
MSA_CORE_DOMAIN_SSOT    = YES
MSA_RUNTIME_FOUNDATION  = UNCHANGED (inactive)
HOMOLOGATED_RUNTIMES    = 9 (unchanged)
```
