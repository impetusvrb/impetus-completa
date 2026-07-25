# GF-010 — MSA Signal Loader (Runtime Integration)

**Data:** 2026-07-17  
**Tipo:** implementação controlada  
**Pré-requisitos:** [GF-009-MSA-CORE-DOMAIN.md](GF-009-MSA-CORE-DOMAIN.md) · [GF-008-MSA-RUNTIME-FOUNDATION.md](GF-008-MSA-RUNTIME-FOUNDATION.md) · [BASELINE-SYSTEM-v1.2.md](BASELINE-SYSTEM-v1.2.md) (LOCKED)

---

## Gate de validação

| Flag | Valor |
|------|-------|
| `MSA_SIGNAL_LOADER_EXISTS` | **YES** |
| `MSA_SIGNAL_LOADER_REAL` | **YES** |
| `MSA_SIGNAL_READINESS` | **HONEST** (NO_DATASET sem dados) |
| `MSA_RUNTIME_ACTIVE` | **NO** |
| `MSA_PROMOTION` | **NO_CHANGE** |
| `MSA_CONSOLIDATION` | **NO_CHANGE** |
| `NO_ENGINE_DUPLICATION` | **YES** |
| `SEMANTICS_SOURCE` | **msaCoreSemantics.js** |
| `NO_RUNTIME_REGRESSION` | **YES** |
| `BASELINE_SYSTEM_v1.2` | **PRESERVED** |
| `ARC_001_CONFORMANCE` | **PRESERVED** |

---

## Princípio

O Signal Loader **observa** o Core Domain GF-009 — **não decide** workflow, aprovação ou estatísticas.

SSOT: `backend/src/domains/msa/semantics/msaCoreSemantics.js`

Proibido no loader/bridge:
- `resolveTransition` / `applyWorkflowAction`
- enums paralelos de workflow
- recálculo GRR / %GRR
- dados sintéticos

---

## Implementação Z.20

| Ficheiro | Função |
|----------|--------|
| `msaTenantSignalLoader.js` | Lê tabelas MSA + agrega observações |
| `msaBlockBridge.js` | 12 blocos → `engine_ok`, `binding_ok`, `dataset_used`, `signal_count`, `reason` |
| `msaSignalBindingRuntime.js` | `runMsaSignalBinding()` + `buildBindingValidationReport` |
| `msaSignalLoaderLogger.js` | Diagnóstico opt-in (`IMPETUS_MSA_SIGNAL_DIAGNOSTICS=on`) |
| `msaFoundationAttachment.js` | Payload `msa_signal_loader` + `binding_ratio` no runtime |
| `msaCockpitPilot.js` | Consumidor passivo Z.20 quando flags activas |

### Mapeamento blocos → datasets

| Bloco | Datasets observados |
|-------|---------------------|
| `measurement_system_registry` | `msa_measurement_studies` |
| `gauge_inventory` | `msa_gauges`, `msa_instruments` |
| `variable_grr` | `msa_variable_grr_studies` |
| `attribute_agreement` | `msa_attribute_agreement_studies` |
| `bias_analysis` | `msa_bias_studies` |
| `linearity_analysis` | `msa_linearity_studies` |
| `stability_analysis` | `msa_stability_studies` |
| `measurement_capability` | `msa_measurement_samples`, estudos |
| `calibration_monitoring` | `msa_calibration_references`, gages |
| `study_governance` | `msa_study_history`, `msa_study_approvals` |
| `contextual_msa_ai` | blocos bound upstream |
| `msa_narrative` | sumários factuais upstream |

---

## Payload `/dashboard/me`

Actualiza **apenas** `msa_signal_loader` e `msa_cognitive_runtime`:

- `inactive: true`
- `promotion_applied: false`
- `consolidation_applied: false`
- `foundation_status: signal_loader_active`
- `pilot_blocks`: 12 IDs canónicos
- `binding_ratio`: calculado via `buildBindingValidationReport`

Sem promotion, consolidação, hubs ou widgets.

---

## Não implementado (GF-010)

Promotion · Consolidação · CentroComando · Hubs · Widgets · IA · KPIs · APIs novas · alterações workflow/core

---

## Testes

```bash
npm run test:msa-signal-loader
npm run test:msa-core-domain
npm run test:msa-runtime-foundation
npm run test:architecture-conformance
```

Auditoria estática: bridge/loader **não** contém lógica de workflow duplicada.

---

## Próximo passo

**GF-011 — Promotion + Centro de Comando:** Z.22/Z.23 gate-driven — apenas após `binding_ratio` homologado.

---

## Evidência de encerramento

```
GF-010_STATUS              = COMPLETE
MSA_SIGNAL_LOADER          = REAL (Z.20)
MSA_RUNTIME_PROMOTION      = OFF
PARITY_TARGET              = PPAP GF-003
HOMOLOGATED_RUNTIMES       = 9 (unchanged)
```
