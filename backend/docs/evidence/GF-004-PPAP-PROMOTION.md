# GF-004 — PPAP Promotion & Command Center (Gate-Driven)

**Data:** 2026-07-16  
**Tipo:** implementação controlada Z.22 → Z.23  
**Pré-requisitos:** [GF-003-PPAP-SIGNAL-LOADER.md](GF-003-PPAP-SIGNAL-LOADER.md) · [PPAP-ARCHITECTURE-v1.0.md](PPAP-ARCHITECTURE-v1.0.md)

---

## Gate de validação

| Flag | Valor |
|------|-------|
| `PPAP_PROMOTION_EXISTS` | **YES** |
| `PPAP_CONSOLIDATION_EXISTS` | **YES** |
| `PPAP_PROMOTION_GATE_DRIVEN` | **YES** |
| `PPAP_BINDING_RECALCULATED` | **NO** |
| `PPAP_RUNTIME_ACTIVE` | **ONLY_IF_GATE_PASS** → **NO** (Cenário A) |
| `NO_UI_REGRESSION` | **YES** |
| `NO_RUNTIME_REGRESSION` | **YES** |
| `BASELINE_SYSTEM_v1.1` | **PRESERVED** |
| `QUALITY_BASELINE_v1.1` | **PRESERVED** |
| `LOGISTICS_BASELINE_v1.1` | **PRESERVED** |

---

## Etapa 0 — Auditoria tenant piloto (obrigatória)

Diagnóstico executado antes de qualquer activação:

| Métrica | Valor observado |
|---------|-----------------|
| **PPAP_BINDING_RATIO** | `0` |
| **PPAP_BOUND_BLOCKS** | `[]` |
| **PPAP_DATASET_STATUS** | `NO_DATASET` |
| `pilot_blocks` | 12 |
| `missing_blocks` | 12 (todos `NO_DATASET`) |

**Classificação:** **Cenário A** — `binding_ratio == 0`

**Decisão:** Promotion **não activada**. Infraestrutura Z.22/Z.23 implementada; `promotion_applied=false`, `consolidation_applied=false`, `inactive=true`.

### Blocos que impedem promoção (tenant piloto)

Todos os 12 blocos pilot — ausência total de submissões PPAP e entidades relacionadas:

`ppap.submission_management` · `ppap.supplier_approval` · `ppap.dimensional_validation` · `ppap.material_certification` · `ppap.process_capability` · `ppap.appearance_approval` · `ppap.performance_validation` · `ppap.document_package` · `ppap.engineering_change` · `ppap.customer_requirements` · `ppap.contextual_ppap_ai` · `ppap.ppap_narrative`

---

## Gates homologados (sem bypass)

| Fase | Threshold | Fonte |
|------|-----------|-------|
| **Z.22** render promotion | `≥ 0.5` | `phaseZ22FeatureFlags.minBindingRatioForRender()` |
| **Z.23** consolidation | `≥ 0.35` | `Z23_MIN_BINDING_RATIO` (paridade Logistics) |

Nenhuma excepção. `force_ppap_render` / `force_ppap_consolidation` **não** contornam binding.

| Cenário | Condição | Acção |
|---------|----------|-------|
| **A** | `binding_ratio == 0` | Promotion OFF · `gate_scenario: A_NO_DATASET` |
| **B** | `0 < ratio < threshold` | Promotion OFF · `gate_scenario: B_BELOW_THRESHOLD` |
| **C** | `ratio ≥ threshold` | Promotion permitida · `gate_scenario: C_GATE_PASS` |

---

## Arquitectura Z.22 → Z.23

```
runPpapCockpitPilot (Z.19)
  └── engine_bridge.binding_ratio  ← consumidor passivo GF-003
applyPpapControlledRenderPromotion (Z.22)
  └── evaluatePpapRenderPromotionEligibility (sem BD)
applyPpapCockpitConsolidation (Z.23)
  └── consolidatePpapCockpit → ppap_cognitive_centers
attachPpapRuntimeFoundation
  └── ppap_signal_loader (inalterado pela promotion)
```

**Regra:** Promotion/Consolidation **nunca** recalculam binding nem alteram `ppap_signal_loader`.

---

## Backend

| Componente | Path |
|------------|------|
| Z.22 supervisor | `renderPromotion/ppap/ppapRenderPromotionSupervisor.js` |
| Z.22 runtime | `renderPromotion/ppap/ppapControlledRenderRuntime.js` |
| Widget resolver | `renderPromotion/ppap/ppapWidgetPromotionResolver.js` |
| Z.23 supervisor | `domains/ppap/cockpit/ppapConsolidationSupervisor.js` |
| Z.23 consolidator | `domains/ppap/cockpit/ppapCockpitConsolidator.js` |
| Z.23 runtime | `domains/ppap/runtime/ppapCockpitConsolidationRuntime.js` |
| Centers + hubs | `domains/ppap/cockpit/ppapCenters.js` |
| Pilot Z.19 | `pilot/ppapCockpitPilot.js` |

### Hubs estruturais (registry)

| hub_key | Componente |
|---------|------------|
| `submission_governance` | `SubmissionGovernanceHub` |
| `supplier_approval` | `SupplierApprovalHub` |
| `dimensional` | `DimensionalHub` |
| `capability` | `CapabilityHub` |
| `engineering` | `EngineeringHub` |
| `cognitive` | `CognitivePpapHub` |

Estado honesto quando sem dados: **Sem dados suficientes**.

---

## Frontend

| Artefacto | Path |
|-----------|------|
| Promotion mount | `centroComando/PpapNativeCockpitPromotion.jsx` |
| Registry | `cognitiveRuntime/cockpit/ppapNativeCockpitRegistry.js` |
| Hubs | `domains/ppap/cockpit/*Hub.jsx` |
| CentroComando | mount condicional `ppapNativeActive` (suprime widget `qualidade` quando runtime ON) |

**Runtime OFF:** não monta hubs · mantém widgets actuais.  
**Runtime ON:** suprime placeholder · monta hubs PPAP (só quando `consolidation_applied=true`).

---

## Payload actual (Cenário A)

```json
{
  "ppap_cognitive_runtime": {
    "runtime_id": "ppap_native",
    "inactive": true,
    "cockpit_mode": "off",
    "promotion_applied": false,
    "consolidation_applied": false,
    "binding_ratio": 0,
    "gate_scenario": "A_NO_DATASET"
  },
  "ppap_signal_loader": {
    "binding_ratio": 0,
    "signal_readiness": "NO_DATASET",
    "bound_blocks": []
  }
}
```

---

## Testes

```bash
npm run test:ppap-promotion-chain     # 7/7
npm run test:ppap-signal-loader       # 9/9
npm run test:ppap-runtime-foundation  # 9/9
npm run test:logistics-promotion-chain
npm run test:quality-native-cockpit
# + Production · Maintenance · Executive · Environment · SST
```

`NO_RUNTIME_REGRESSION = YES`

---

## Próximo passo

**Massa piloto PPAP:** criar submissões reais no tenant piloto para elevar `binding_ratio` acima dos thresholds — só então activar flags `IMPETUS_PPAP_RENDER_PROMOTION=controlled` e `IMPETUS_PPAP_NATIVE_COCKPIT=on` em produção.

Alternativa: **GF-005** homologação read-only + `BASELINE-PPAP-v1.0.md`.
