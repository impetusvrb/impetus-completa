# GF-017 — Ishikawa Signal Loader (Read-Only Binding)

**Data:** 2026-07-17  
**Modo:** Implementação da camada de observação  
**Runtime:** `ishikawa_native` permanece **totalmente inactivo** (promotion/consolidation OFF)

---

## Objetivo

Conectar o runtime `ishikawa_native` ao **Core Domain SSOT (GF-016)** via Signal Loader **estritamente read-only**, transformando dados persistidos em sinais cognitivos estruturais — **sem regras de negócio novas**.

---

## Entregáveis

| Artefacto | Localização |
|-----------|-------------|
| Tenant loader | `backend/src/cognitiveRuntime/domains/ishikawa/bridge/ishikawaTenantSignalLoader.js` |
| Binding runtime | `backend/src/cognitiveRuntime/domains/ishikawa/bridge/ishikawaSignalBindingRuntime.js` |
| Block bridge | `backend/src/cognitiveRuntime/domains/ishikawa/bridge/ishikawaBlockBridge.js` |
| Logger | `backend/src/cognitiveRuntime/domains/ishikawa/bridge/ishikawaSignalLoaderLogger.js` |
| Foundation (actualizado) | `backend/src/cognitiveRuntime/domains/ishikawa/runtime/ishikawaFoundationAttachment.js` |
| Testes | `backend/tests/cognitive-runtime/runIshikawaSignalLoaderTests.js` |

---

## Princípios

| Regra | Estado |
|-------|--------|
| SSOT via `domains/ishikawa/semantics/` | **YES** |
| Sem duplicação de workflow | **YES** |
| Sem mutações BD/API | **YES** |
| Sem inferências cognitivas | **YES** |
| Paridade MSA GF-010 / PPAP GF-003 | **YES** |

---

## Observação (14 tabelas GF-016)

- Investigações + estados/workflow (lidos, não recalculados)
- Fishbone 6M + causas
- Five Whys + passos
- Acções corretivas / preventivas
- Evidências + documentos
- Aprovações + histórico
- Verificações (recurrence)

**Integrações futuras:** `quality_inspection_id`, `ncr_workflow_instance_id`, `capa_workflow_instance_id`, `ppap_submission_id`, `msa_study_id`, `supplier_ref`, `part_ref` — observadas; ausência registada sem falha.

---

## Blocos pilot (12)

| Bloco | Dataset observado |
|-------|-------------------|
| `ishikawa.investigation_registry` | `ishikawa_root_cause_investigations` |
| `ishikawa.root_cause_repository` | investigações com causa raiz definida |
| `ishikawa.fishbone_analysis` | diagramas + causas |
| `ishikawa.five_whys` | análises + passos |
| `ishikawa.corrective_actions` | acções corretivas |
| `ishikawa.preventive_actions` | acções preventivas |
| `ishikawa.evidence_repository` | evidências + documentos |
| `ishikawa.investigation_workflow` | histórico + aprovações |
| `ishikawa.recurrence_monitor` | verificações + encerradas |
| `ishikawa.organizational_learning` | histórico + concluídas |
| `ishikawa.contextual_root_cause_ai` | meta · blocos upstream |
| `ishikawa.ishikawa_narrative` | meta · sumários upstream |

**binding_ratio** = `bound_blocks.length / pilot_blocks.length` via `buildBindingValidationReport` — cobertura estrutural apenas.

---

## Restrições preservadas

| Restrição | Estado |
|-----------|--------|
| Promotion (Z.22) | NO_CHANGE |
| Consolidação (Z.23) | NO_CHANGE |
| Centro de Comando | NO_CHANGE |
| Registries | NO_CHANGE |
| cognitiveRuntimeFacade | NO_CHANGE |
| ARC-001 | PRESERVED |
| UI / CSS | NO_CHANGE |
| BASELINE-SYSTEM v1.3 | PRESERVED |

---

## Critérios obrigatórios

```
ISHIKAWA_SIGNAL_LOADER_EXISTS       = YES
ISHIKAWA_SIGNAL_LOADER_ACTIVE       = YES
ISHIKAWA_SIGNAL_LOADER_READONLY     = YES
ISHIKAWA_RUNTIME_ACTIVE             = NO
ISHIKAWA_PROMOTION                  = NO_CHANGE
ISHIKAWA_CONSOLIDATION              = NO_CHANGE
ISHIKAWA_SSOT_USED                  = YES
SEMANTICS_DUPLICATED                = NO
WORKFLOW_DUPLICATED                 = NO
DATABASE_MUTATIONS                  = NO
API_MUTATIONS                       = NO
UI_CHANGED                          = NO
CSS_CHANGED                         = NO
BASELINE_SYSTEM_v1.3                = PRESERVED
ARC_001_CONFORMANCE                 = PRESERVED
```

---

## Testes executados

| Suite | Resultado |
|-------|-----------|
| `npm run test:ishikawa-signal-loader` | **10/10** |
| `npm run test:ishikawa-core-domain` | **10/10** |
| `npm run test:ishikawa-runtime-foundation` | **11/11** |
| `npm run test:architecture-conformance` | **79/79** |

Regressão dos 10 runtimes homologados confirmada via foundation + architecture suites.

---

## Próxima etapa

**GF-018** — Promotion & Centro de Comando, condicionada ao `binding_ratio` validado pelo Signal Loader.
