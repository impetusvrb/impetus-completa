# GF-003 — PPAP Signal Loader (Runtime Integration)

**Data:** 2026-07-16  
**Tipo:** implementação controlada Z.20  
**Pré-requisitos:** [GF-002-PPAP-CORE-DOMAIN.md](GF-002-PPAP-CORE-DOMAIN.md) · [GF-001-PPAP-RUNTIME-FOUNDATION.md](GF-001-PPAP-RUNTIME-FOUNDATION.md) · [PPAP-ARCHITECTURE-v1.0.md](PPAP-ARCHITECTURE-v1.0.md)

---

## Gate de validação

| Flag | Valor |
|------|-------|
| `PPAP_SIGNAL_LOADER_EXISTS` | **YES** |
| `PPAP_SIGNAL_LOADER_REAL` | **YES** |
| `PPAP_SIGNAL_READINESS` | **HONEST** |
| `PPAP_RUNTIME_ACTIVE` | **NO** |
| `PPAP_PROMOTION` | **NO_CHANGE** |
| `PPAP_CONSOLIDATION` | **NO_CHANGE** |
| `NO_UI_CHANGED` | **YES** |
| `NO_CSS_CHANGED` | **YES** |
| `NO_ENGINE_DUPLICATION` | **YES** |
| `SEMANTICS_SOURCE` | `ppapCoreSemantics.js` |
| `NO_RUNTIME_REGRESSION` | **YES** |
| `BASELINE_SYSTEM_v1.1` | **PRESERVED** |
| `QUALITY_BASELINE_v1.1` | **PRESERVED** |
| `LOGISTICS_BASELINE_v1.1` | **PRESERVED** |

---

## Princípio obrigatório

**Fonte única de verdade:** `backend/src/domains/ppap/semantics/ppapCoreSemantics.js`

O Signal Loader **não decide** aprovação, rejeição, expiração ou transições de workflow. Apenas:

1. Consulta tabelas do Core Domain GF-002
2. Agrega contagens e estados **já persistidos**
3. Publica sinais Z.20 para o runtime `ppap_native`

Proibido no loader/bridge: enums próprios, workflow paralelo, `resolveTransition`, mocks, defaults sintéticos, padding.

**Auditoria automática:** teste `semantics audit: no workflow duplication in loader/bridge` em `runPpapSignalLoaderTests.js`.

---

## Arquitectura Z.20 (paridade Quality/Logistics)

```
ppapFoundationAttachment
  └── runPpapSignalBinding
        ├── loadPpapTenantSignals   ← queries reais ppap_*
        └── invokePpapBlockBridge   ← 12 blocos pilot
              └── buildBindingValidationReport()
```

| Componente | Path |
|------------|------|
| Tenant loader | `cognitiveRuntime/domains/ppap/bridge/ppapTenantSignalLoader.js` |
| Block bridge | `cognitiveRuntime/domains/ppap/bridge/ppapBlockBridge.js` |
| Binding runtime | `cognitiveRuntime/domains/ppap/bridge/ppapSignalBindingRuntime.js` |
| Foundation attach | `cognitiveRuntime/domains/ppap/runtime/ppapFoundationAttachment.js` |

---

## Datasets consumidos (Core Domain GF-002)

| Tabela | Uso observacional |
|--------|-------------------|
| `ppap_submissions` | Contagens por `status` / `workflow_stage` (leitura) |
| `ppap_psw_records` | Contagem PSW + flags `approved` persistidos |
| `ppap_dimensional_results` | Bloco dimensional |
| `ppap_material_certifications` | Bloco material |
| `ppap_capability_studies` | Bloco capacidade |
| `ppap_appearance_approvals` | Bloco aparência |
| `ppap_performance_tests` | Bloco desempenho |
| `ppap_engineering_changes` | Bloco ECN |
| `ppap_approval_history` | Bloco supplier_approval |
| `ppap_attached_documents` | Bloco document_package |
| `ppap_parts` / `ppap_suppliers` / `ppap_customers` | Contexto entidades |

Sem registos → `reason: NO_DATASET` (honesto). Sem mocks.

---

## Blocos pilot (12) — Z.20

| block_id | dataset_used | binding quando |
|----------|--------------|----------------|
| `ppap.submission_management` | `ppap_submissions` | total > 0 |
| `ppap.supplier_approval` | `ppap_approval_history` | histórico > 0 |
| `ppap.dimensional_validation` | `ppap_dimensional_results` | rows > 0 |
| `ppap.material_certification` | `ppap_material_certifications` | rows > 0 |
| `ppap.process_capability` | `ppap_capability_studies` | rows > 0 |
| `ppap.appearance_approval` | `ppap_appearance_approvals` | rows > 0 |
| `ppap.performance_validation` | `ppap_performance_tests` | rows > 0 |
| `ppap.document_package` | `ppap_attached_documents,ppap_psw_records` | docs+psw > 0 |
| `ppap.engineering_change` | `ppap_engineering_changes` | rows > 0 |
| `ppap.customer_requirements` | `ppap_customers,ppap_submissions` | clientes ou FK > 0 |
| `ppap.contextual_ppap_ai` | `bound_block_signals` | blocos bound > 0 |
| `ppap.ppap_narrative` | `bound_block_summaries` | summaries > 0 |

Cada bloco expõe: `engine_ok`, `binding_ok`, `dataset_used`, `signal_count`, `reason`.

---

## Payload dashboard (inactivo preservado)

```json
{
  "ppap_cognitive_runtime": {
    "runtime_id": "ppap_native",
    "inactive": true,
    "cockpit_mode": "off",
    "promotion_applied": false,
    "consolidation_applied": false,
    "binding_ratio": 0,
    "foundation_status": "signal_loader_active"
  },
  "ppap_signal_loader": {
    "inactive": true,
    "binding_ratio": 0,
    "pilot_blocks": ["ppap.submission_management", "..."],
    "bound_blocks": [],
    "missing_blocks": [{ "block_id": "...", "reason": "NO_DATASET" }],
    "signal_readiness": "NO_DATASET"
  }
}
```

`binding_ratio` reflecte dados reais do tenant (0 quando vazio). Runtime **não activado** nesta GF.

---

## Testes executados

```bash
npm run test:ppap-signal-loader        # 9/9
npm run test:ppap-runtime-foundation   # 9/9
npm run test:ppap-core-domain          # 9/9
npm run test:logistics-signal-loader   # 7/7
npm run test:logistics-runtime-foundation  # 8/8
npm run test:quality-native-cockpit    # 16/16
npm run test:production-native-cockpit # 21/21
npm run test:maintenance-native-cockpit # 29/29
npm run test:executive-boardroom       # 14/14
npm run test:environmental-native-cockpit # 15/15
npm run test:sst-native-cockpit        # 15/15
```

`NO_RUNTIME_REGRESSION = YES`

---

## Ficheiros criados / alterados

| Ficheiro | Acção |
|----------|-------|
| `cognitiveRuntime/domains/ppap/bridge/ppapTenantSignalLoader.js` | **SUBSTITUÍDO** (stub → real) |
| `cognitiveRuntime/domains/ppap/bridge/ppapBlockBridge.js` | **NOVO** |
| `cognitiveRuntime/domains/ppap/bridge/ppapSignalBindingRuntime.js` | **NOVO** |
| `cognitiveRuntime/domains/ppap/bridge/ppapSignalLoaderLogger.js` | **NOVO** |
| `cognitiveRuntime/domains/ppap/runtime/ppapFoundationAttachment.js` | **ATUALIZADO** |
| `tests/cognitive-runtime/runPpapSignalLoaderTests.js` | **NOVO** |
| `tests/cognitive-runtime/runPpapRuntimeFoundationTests.js` | **ATUALIZADO** |
| `tests/ppap/runPpapCoreDomainTests.js` | **ATUALIZADO** |
| `package.json` | `test:ppap-signal-loader` |

**Não alterados:** Promotion Z.22/Z.23, CentroComando, hubs, widgets, KPIs, CSS, IA adapters, APIs workflow, flags activas.

---

## Próximo passo

**GF-004 — Promotion + Centro de Comando:** activar render promotion controlada e hubs PPAP sobre sinais reais — apenas após validação explícita de `binding_ratio` e massa de dados piloto.
