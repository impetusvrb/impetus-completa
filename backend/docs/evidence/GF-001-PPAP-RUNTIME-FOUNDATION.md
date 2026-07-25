# GF-001 — PPAP Runtime Foundation (Infrastructure Only)

**Data:** 2026-07-16  
**Tipo:** implementação estrutural controlada  
**Pré-requisitos:** [GF-000-PPAP-DISCOVERY.md](GF-000-PPAP-DISCOVERY.md) · [PPAP-ARCHITECTURE-v1.0.md](PPAP-ARCHITECTURE-v1.0.md) · [BASELINE-SYSTEM-v1.1.md](BASELINE-SYSTEM-v1.1.md) (LOCKED)

---

## Gate de validação

| Flag | Valor |
|------|-------|
| `PPAP_RUNTIME_EXISTS` | **YES** |
| `PPAP_RUNTIME_ACTIVE` | **NO** |
| `PPAP_SIGNAL_LOADER_EXISTS` | **YES** (stub) |
| `PPAP_SIGNAL_LOADER_ACTIVE` | **NO** |
| `PPAP_PROMOTION_EXISTS` | **YES** (structural) |
| `PPAP_PROMOTION_ACTIVE` | **NO** |
| `PPAP_CONSOLIDATOR_EXISTS` | **YES** |
| `PPAP_CONSOLIDATION_ACTIVE` | **NO** |
| `PPAP_COGNITIVE_CENTERS_EXISTS` | **YES** (catálogo vazio) |
| `PPAP_COGNITIVE_CENTERS` | **[]** |
| `NO_UI_CHANGED` | **YES** (CC não montado) |
| `NO_CSS_CHANGED` | **YES** |
| `NO_DATABASE_CHANGED` | **YES** |
| `NO_API_CHANGED` | **YES** |
| `NO_RUNTIME_REGRESSION` | **YES** |
| `BASELINE_SYSTEM_v1.1` | **PRESERVED** |
| `QUALITY_BASELINE_v1.1` | **PRESERVED** |
| `LOGISTICS_BASELINE_v1.1` | **PRESERVED** |

---

## Escopo entregue

Fundação **`ppap_native`** aditiva e **inactiva** (default). Sem hubs, widgets, KPIs, schema BD, APIs, workflow PPAP ou mount no CentroComando.

### Runtime ID canónico

```
runtime_id   = ppap_native
runtime_name = ppap_native
cockpit_mode = off          (até homologação GF-005)
parent_axis  = quality
```

---

## Arquitectura criada

### Cadeia Z.19 → Z.23 (preparada, inactiva)

| Fase | Componente | Estado GF-001 |
|------|-----------|---------------|
| Z.19 | `ppapCockpitPilot.js` | Skip quando flags OFF |
| Z.19 | `ppapCognitiveBlockPack.js` | **12 blocos registados** (inactive) |
| Z.20 | `ppapTenantSignalLoader.js` | **Stub** — `NO_DATASET`, sem consultas |
| Z.22 | `ppapControlledRenderRuntime.js` | `promotion_applied: false` sempre |
| Z.23 | `ppapCockpitConsolidator.js` | `consolidation_applied: false` |
| Z.23 | `ppapCockpitConsolidationRuntime.js` | Gate flags OFF |
| — | `ppapFoundationAttachment.js` | **Sempre anexa descriptor inactivo** |

### Integração `/dashboard/me`

Via `cognitiveRuntimeFacade.applyCognitiveFoundationToDashboard` + merge `routes/dashboard.js`:

```json
{
  "ppap_cognitive_runtime": {
    "runtime_id": "ppap_native",
    "runtime_name": "ppap_native",
    "cockpit_mode": "off",
    "inactive": true,
    "promotion_applied": false,
    "consolidation_applied": false,
    "binding_ratio": 0,
    "pilot_blocks": [],
    "bound_blocks": [],
    "missing_blocks": [],
    "foundation_status": "registered_inactive",
    "foundation_inc": "GF-001"
  },
  "ppap_cognitive_centers": [],
  "ppap_signal_loader": {
    "inactive": true,
    "foundation_only": true,
    "binding_ratio": 0,
    "signal_readiness": "NO_DATASET",
    "pilot_blocks": [],
    "bound_blocks": [],
    "missing_blocks": []
  }
}
```

Report cognitivo inclui `ppap_runtime_foundation.registered: true`.

---

## Ficheiros adicionados

### Backend — cognitive runtime

| Ficheiro | Função |
|----------|--------|
| `config/phasePpapNativeFeatureFlags.js` | Flags (default OFF; foundation ON) |
| `registry/ppapCognitiveBlockPack.js` | PPAP_PILOT_BLOCK_IDS (12) |
| `pilot/ppapCockpitPilot.js` | Z.19 pilot stub |
| `domains/ppap/bridge/ppapTenantSignalLoader.js` | Loader stub |
| `domains/ppap/runtime/ppapRuntimeDescriptor.js` | Descriptor + isPpapProfile |
| `domains/ppap/runtime/ppapFoundationAttachment.js` | Anexo payload |
| `domains/ppap/runtime/ppapCockpitConsolidationRuntime.js` | Z.23 runtime gate |
| `domains/ppap/cockpit/ppapCenters.js` | 7 center_ids (render_ready: false) |
| `domains/ppap/cockpit/ppapCockpitConsolidator.js` | Consolidator structure |
| `domains/ppap/cockpit/ppapConsolidationSupervisor.js` | Supervisor passivo |
| `renderPromotion/ppap/ppapControlledRenderRuntime.js` | Z.22 stub |
| `renderPromotion/ppap/ppapRenderPromotionSupervisor.js` | Supervisor passivo |
| `tests/cognitive-runtime/runPpapRuntimeFoundationTests.js` | Testes GF-001 |

### Backend — alterações aditivas

| Ficheiro | Alteração |
|----------|-----------|
| `registry/cognitiveBlockRegistry.js` | Merge PPAP_PILOT_BLOCKS + stats |
| `domainFoundation/registry/cognitiveDomainRegistry.js` | Domínio `ppap` (maturity: foundation) |
| `facade/cognitiveRuntimeFacade.js` | Branch PPAP-Z.19→Z.23 + foundation attach |
| `routes/dashboard.js` | Merge campos `ppap_*` (já preparado) |
| `package.json` | Script `test:ppap-runtime-foundation` |

### Frontend — structure only (sem mount CC)

| Ficheiro | Função |
|----------|--------|
| `cognitiveRuntime/cockpit/ppapNativeCockpitRegistry.js` | runtime/center/hub registries |
| `features/dashboard/centroComando/PpapNativeCockpitPromotion.jsx` | **return null** |
| `cognitiveRuntime/cockpit/specializedCockpitResolver.js` | + `resolvePpapCockpitRuntime` |
| `cognitiveRuntime/cockpit/index.js` | Export resolver ppap |

**Não alterados:** `CentroComando.jsx`, CSS, layouts homologados, Quality/Logistics promotion.

---

## Registries

### PPAP_PILOT_BLOCK_IDS (12 — inactive)

```
ppap.submission_management
ppap.supplier_approval
ppap.dimensional_validation
ppap.material_certification
ppap.process_capability
ppap.appearance_approval
ppap.performance_validation
ppap.document_package
ppap.engineering_change
ppap.customer_requirements
ppap.contextual_ppap_ai
ppap.ppap_narrative
```

### Center catalog (7 — render_ready: false)

`ppap_submission_center`, `ppap_elements_tracker`, `ppap_supplier_package`, `ppap_dimensional_evidence`, `ppap_psw_gate`, `ppap_narrative`, `ppap_decision_support`

### Hub registry (7 — ready: false)

submission, elements, supplier, dimensional, psw, narrative, decision

---

## Flags (default — runtime inactivo)

| Env | Fase | Default |
|-----|------|---------|
| `IMPETUS_PPAP_COGNITIVE_RUNTIME_ENABLED` | Z.19 | `off` |
| `IMPETUS_PPAP_RENDER_PROMOTION` | Z.22 | `off` |
| `IMPETUS_PPAP_NATIVE_COCKPIT` | Z.23 / CC | `off` |
| `IMPETUS_PPAP_RUNTIME_FOUNDATION` | Foundation attach | `on` (metadados) |

---

## Testes

```bash
npm run test:ppap-runtime-foundation          # 9/9
npm run test:logistics-runtime-foundation   # 8/8
npm run test:logistics-promotion-chain        # 5/5
npm run test:specialized-cockpit-runtime      # 16/16 (Quality Z.23)
npm run test:executive-boardroom              # 14/14
npm run test:production-native-cockpit        # 21/21
npm run test:maintenance-native-cockpit       # 29/29
npm run test:environmental-native-cockpit     # 15/15
npm run test:hr-native-cockpit                # 11/11
npm run test:sst-native-cockpit               # 15/15
```

`NO_RUNTIME_REGRESSION = YES`

---

## Sequência Greenfield actualizada (pós GF-001)

| GF | Entrega |
|----|---------|
| **GF-000** | Discovery ✅ |
| **GF-001** | Runtime Foundation ✅ |
| **GF-002** | **Modelo de domínio** (schema, entidades, APIs, workflow) — **antes** do Signal Loader |
| **GF-003** | Signal Loader (dados reais do novo domínio) |
| **GF-004** | Promotion + Centro de Comando |
| **GF-005** | Homologação + `BASELINE-PPAP-v1.0` |

> Ajuste estratégico: PPAP não tinha ecossistema pré-existente — o loader (GF-003) deve consumir schema/APIs criados em GF-002, evitando runtime «oco» e reescrita do loader.

---

## Próximo passo

**GF-002 — PPAP Domain Model** (schema, entidades, APIs, workflow). **Não** activar flags PPAP em produção até GF-005.
