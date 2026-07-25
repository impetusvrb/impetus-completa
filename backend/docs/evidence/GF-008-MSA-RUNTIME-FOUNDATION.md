# GF-008 — MSA Runtime Foundation (Infrastructure Only)

**Data:** 2026-07-16  
**Tipo:** implementação estrutural controlada  
**Pré-requisitos:** [GF-007-MSA-DISCOVERY.md](GF-007-MSA-DISCOVERY.md) · [MSA-ARCHITECTURE-v1.0.md](MSA-ARCHITECTURE-v1.0.md) · [BASELINE-SYSTEM-v1.2.md](BASELINE-SYSTEM-v1.2.md) (LOCKED) · [ARC-001-ARCHITECTURE-CONFORMANCE.md](ARC-001-ARCHITECTURE-CONFORMANCE.md)

---

## Gate de validação

| Flag | Valor |
|------|-------|
| `MSA_RUNTIME_EXISTS` | **YES** |
| `MSA_RUNTIME_ACTIVE` | **NO** |
| `MSA_SIGNAL_LOADER_EXISTS` | **YES** (stub) |
| `MSA_SIGNAL_LOADER_ACTIVE` | **NO** |
| `MSA_PROMOTION_EXISTS` | **YES** (structural) |
| `MSA_PROMOTION_ACTIVE` | **NO** |
| `MSA_CONSOLIDATOR_EXISTS` | **YES** |
| `MSA_CONSOLIDATION_ACTIVE` | **NO** |
| `MSA_COGNITIVE_CENTERS` | **[]** |
| `NO_UI_CHANGED` | **YES** (CentroComando não montado) |
| `NO_CSS_CHANGED` | **YES** |
| `NO_DATABASE_CHANGED` | **YES** |
| `NO_API_CHANGED` | **YES** |
| `NO_RUNTIME_REGRESSION` | **YES** |
| `BASELINE_SYSTEM_v1.2` | **PRESERVED** |
| `ARC_001_CONFORMANCE` | **PRESERVED** |

---

## Escopo entregue

Fundação **`msa_native`** aditiva e **inactiva** (default). Sem workflow MSA, GRR, cálculos estatísticos, schema BD, migrations, APIs, promotion activa, hubs funcionais, CSS, IA, KPIs ou mount no Centro de Comando.

### Runtime ID canónico

```
runtime_id   = msa_native
runtime_name = msa_native
cockpit_mode = off          (até homologação GF-013)
parent_axis  = quality
```

---

## Arquitectura criada

### Cadeia Z.19 → Z.23 (preparada, inactiva)

| Fase | Componente | Estado GF-008 |
|------|-----------|---------------|
| Z.19 | `msaCockpitPilot.js` | Skip quando flags OFF |
| Z.19 | `msaCognitiveBlockPack.js` | **12 blocos registados** (inactive) |
| Z.20 | `msaTenantSignalLoader.js` | **Stub** — `NO_DATASET`, sem consultas BD |
| Z.22 | `msaControlledRenderRuntime.js` | `promotion_applied: false` sempre |
| Z.23 | `msaCockpitConsolidationRuntime.js` | `consolidation_applied: false` |
| — | `msaFoundationAttachment.js` | **Sempre anexa descriptor inactivo** |
| — | `msaRuntimeDescriptor.js` | Descriptor canónico |
| — | `phaseMsaNativeFeatureFlags.js` | Flags default OFF |

### Blocos estruturais (Z.19 — registry only)

| block_id | semantic_category |
|----------|-------------------|
| `msa.measurement_system_registry` | measurement_system_registry |
| `msa.gauge_inventory` | gauge_inventory |
| `msa.variable_grr` | variable_grr |
| `msa.attribute_agreement` | attribute_agreement |
| `msa.bias_analysis` | bias_analysis |
| `msa.linearity_analysis` | linearity_analysis |
| `msa.stability_analysis` | stability_analysis |
| `msa.measurement_capability` | measurement_capability |
| `msa.calibration_monitoring` | calibration_monitoring |
| `msa.study_governance` | study_governance |
| `msa.contextual_msa_ai` | contextual_msa_ai |
| `msa.msa_narrative` | msa_narrative |

### Integração `/dashboard/me`

Via `cognitiveRuntimeFacade.applyCognitiveFoundationToDashboard`:

```json
{
  "msa_cognitive_runtime": {
    "runtime_id": "msa_native",
    "cockpit_mode": "off",
    "inactive": true,
    "promotion_applied": false,
    "consolidation_applied": false,
    "binding_ratio": 0,
    "pilot_blocks": [],
    "bound_blocks": [],
    "missing_blocks": []
  },
  "msa_signal_loader": {
    "inactive": true,
    "signal_readiness": "NO_DATASET",
    "binding_ratio": 0
  },
  "msa_cognitive_centers": []
}
```

Sem valores sintéticos.

---

## Frontend (registries only)

| Ficheiro | Comportamento |
|----------|---------------|
| `msaNativeCockpitRegistry.js` | Runtime / cockpit / promotion / center / dashboard registries — **OFF** |
| `MsaNativeCockpitPromotion.jsx` | `return null` |
| `CentroComando.jsx` | **Sem alteração** |

---

## Registos arquitecturais

| Registry | Entrada |
|----------|---------|
| `cognitiveDomainRegistry` | domínio `msa` · `maturity: foundation` · `cockpit_ready: false` |
| `cognitiveBlockRegistry` | 12 blocos MSA |
| `HOMOLOGATED_RUNTIMES` (ARC-001) | **Inalterado — 9 runtimes LOCKED** |
| `FOUNDATION_RUNTIMES` (ARC-001) | `msa_native` foundation-only |

---

## Testes

```bash
npm run test:msa-runtime-foundation
npm run test:architecture-conformance
npm run test:ppap-runtime-foundation   # regressão sibling quality axis
```

---

## Próximo passo

**GF-009 — MSA Core Domain:** schema, entidades AIAG, workflow de estudos, APIs scoped por `company_id` — sem activar runtime até gates subsequentes.

---

## Evidência de encerramento

```
GF-008_STATUS              = COMPLETE
MSA_FOUNDATION_REGISTERED  = YES
MSA_FOUNDATION_ACTIVE      = NO
HOMOLOGATED_RUNTIMES       = 9 (unchanged)
BASELINE_SYSTEM_v1.2       = PRESERVED
```
