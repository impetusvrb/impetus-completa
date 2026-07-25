# BASELINE — PPAP v1.0

**GF:** GF-006 (homologação)  
**Data congelamento:** 2026-07-16  
**Estado:** `PPAP_BASELINE_v1.0 = LOCKED`  
**Pré-requisitos homologados:** GF-000 → GF-005  
**Parent domain:** [BASELINE-QUALITY-v1.1.md](BASELINE-QUALITY-v1.1.md) (LOCKED — não alterado)  
**Índice sistémico:** [BASELINE-SYSTEM-v1.2.md](BASELINE-SYSTEM-v1.2.md) (registo **INC-045**)

---

## Declaração de congelamento

A partir de **2026-07-16**, o sub-runtime **`ppap_native`** está **homologado e congelado** como **Baseline PPAP v1.0**.

Toda evolução posterior (APQP, MSA dedicado, novos hubs, extensão de perfis) é **funcionalidade incremental** — não correção de baseline.

---

## Regra de engenharia (LOCKED)

> **Nenhuma alteração futura poderá modificar componentes, loaders, supervisors ou resolvers já homologados do domínio PPAP sem uma nova GF/INC explícita.**  
> Novas funcionalidades devem ser adicionadas de forma incremental, preservando o Baseline PPAP v1.0 e garantindo compatibilidade retroativa com Quality v1.1 LOCKED.

### Superfícies congeladas (alteração proibida sem GF/INC)

| Camada | Artefactos |
|--------|------------|
| **Semântica** | `ppapCoreSemantics.js` — estados, workflow, níveis AIAG |
| **Domínio** | `ppapSubmissionService.js`, `ppapEvidenceService.js`, schema `ppap_*` |
| **Runtime Z.20** | `ppapTenantSignalLoader.js`, `ppapBlockBridge.js`, `ppapSignalBindingRuntime.js` |
| **Runtime Z.22–Z.23** | `ppapRenderPromotionSupervisor.js`, `ppapConsolidationSupervisor.js`, `ppapCockpitConsolidator.js` |
| **Foundation** | `ppapFoundationAttachment.js`, `ppapCockpitPilot.js` |
| **Promoção CC** | `PpapNativeCockpitPromotion.jsx`, `ppapNativeCockpitRegistry.js` |
| **Hubs baseline** | 6 hubs estruturais GF-004 |
| **APIs homologadas** | `/api/ppap/*` (GF-002 + GF-005) |

---

## Estado global pós GF-006

| Gate | Valor |
|------|-------|
| `PPAP_RUNTIME` | **LOCKED** |
| `PPAP_SIGNAL_LOADER` | **LOCKED** |
| `PPAP_PROMOTION` | **LOCKED** |
| `PPAP_COMMAND_CENTER` | **LOCKED** |
| `PPAP_BASELINE_v1.0` | **LOCKED** |
| `ZERO_FAKE_DATA` | **YES** |
| `ZERO_RUNTIME_REGRESSION` | **YES** |
| `NO_CROSS_DOMAIN_REGRESSION` | **YES** |
| `BASELINE_QUALITY_v1.1` | **PRESERVED** |
| `BASELINE_LOGISTICS_v1.1` | **PRESERVED** |
| `BASELINE_SYSTEM_v1.2` | **REGISTERED** (INC-045) |

---

## Eixo e perfis

| Campo | Valor |
|-------|-------|
| **PARENT_AXIS** | `quality` / `eixo_qualidade` |
| **RUNTIME_ID** | `ppap_native` |
| **COCKPIT_MODE** | `ppap_native` |
| **FUNCTIONAL_AREA** | `quality` (sem novo eixo cadastral v1.0) |
| **BINDING_RATIO** | **1.0** (12/12) — tenant piloto GF-005 |
| **PROMOTION** | `promotion_applied: true`, `consolidation_applied: true` (quando gate + flags ON) |

### Perfis elegíveis

| PROFILE_CODE | SURFACE | RUNTIME (quando gate satisfeito) |
|--------------|---------|----------------------------------|
| `manager_quality` | CentroComando | `ppap_native` (+ `quality_native` coexistência) |
| `coordinator_quality` | CentroComando | `ppap_native` |
| `supervisor_quality` | CentroComando | `ppap_native` |
| `inspector_quality` | CentroComando | `ppap_native` (piloto parcial) |

---

## Cadeia arquitectural homologada

```
Cadastro Estrutural (perfil quality + functional_area)
  ↓
/dashboard/me  [cognitiveRuntimeFacade Z.19–Z.23]
  ↓
Z.19 runPpapCockpitPilot
  ↓
Z.20 ppapTenantSignalLoader  [GF-003 — sinais reais BD ppap_*]
  ↓
Z.22 applyPpapControlledRenderPromotion  [GF-004 — gate ≥ 0.5]
  ↓
Z.23 applyPpapCockpitConsolidation  [GF-004 — gate ≥ 0.35 + Z.22 ppap_native]
  ↓
ppapFoundationAttachment  [preserva estado GF-006]
  ↓
PpapNativeCockpitPromotion  [CentroComando]
  ↓
6 hubs estruturais ppap_native
  ↓
APIs /api/ppap/* (submissions, evidências, workflow)
```

---

## Block pack homologado (12 blocos pilot)

| block_id | Center Z.23 |
|----------|-------------|
| `ppap.submission_management` | `ppap_submission_governance` |
| `ppap.supplier_approval` | `ppap_supplier_approval_ops` |
| `ppap.customer_requirements` | `ppap_supplier_approval_ops` |
| `ppap.dimensional_validation` | `ppap_dimensional_ops` |
| `ppap.material_certification` | `ppap_dimensional_ops` |
| `ppap.appearance_approval` | `ppap_dimensional_ops` |
| `ppap.performance_validation` | `ppap_dimensional_ops` |
| `ppap.process_capability` | `ppap_capability_ops` |
| `ppap.document_package` | `ppap_engineering_ops` |
| `ppap.engineering_change` | `ppap_engineering_ops` |
| `ppap.contextual_ppap_ai` | `ppap_cognitive_ops` |
| `ppap.ppap_narrative` | `ppap_cognitive_ops` |

Fonte única de semântica de blocos: `ppapBlockBridge.js` + `ppapCoreSemantics.js`.

---

## Thresholds e critérios de promoção

| Gate | Threshold | Bypass |
|------|-----------|--------|
| Z.22 render promotion | `binding_ratio ≥ 0.5` | **PROIBIDO** |
| Z.23 consolidation | `binding_ratio ≥ 0.35` + Z.22 `ppap_native` | **PROIBIDO** |
| Signal readiness | `ready` (dados reais) | — |

### Cenários de gate

| Cenário | Condição | Resultado |
|---------|----------|-----------|
| **A** | `binding_ratio == 0` | OFF · `A_NO_DATASET` |
| **B** | `0 < ratio < threshold` | OFF · `B_BELOW_THRESHOLD` |
| **C** | `ratio ≥ threshold` | Promotion permitida · `C_GATE_PASS` |

---

## Hubs activos (Centro de Comando)

| hub_key | Componente | Center |
|---------|------------|--------|
| `submission_governance` | `SubmissionGovernanceHub` | `ppap_submission_governance` |
| `supplier_approval` | `SupplierApprovalHub` | `ppap_supplier_approval_ops` |
| `dimensional` | `DimensionalHub` | `ppap_dimensional_ops` |
| `capability` | `CapabilityHub` | `ppap_capability_ops` |
| `engineering` | `EngineeringHub` | `ppap_engineering_ops` |
| `cognitive` | `CognitivePpapHub` | `ppap_cognitive_ops` |

Estados permitidos: **REAL_DATA** · **INSUFFICIENT_DATA** · **NOT_IMPLEMENTED**

---

## Payload oficial `/dashboard/me`

### Runtime OFF (default prod / tenant sem massa)

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
    "bound_blocks": [],
    "missing_blocks": ["ppap.submission_management", "..."]
  }
}
```

### Runtime ON (tenant piloto + flags homologadas)

```json
{
  "ppap_cognitive_runtime": {
    "runtime_id": "ppap_native",
    "inactive": false,
    "cockpit_mode": "ppap_native",
    "promotion_applied": true,
    "consolidation_applied": true,
    "binding_ratio": 1.0,
    "gate_scenario": "C_GATE_PASS",
    "gf": "GF-006"
  },
  "ppap_signal_loader": {
    "binding_ratio": 1.0,
    "signal_readiness": "ready",
    "bound_blocks": ["ppap.submission_management", "..."],
    "missing_blocks": []
  },
  "ppap_cognitive_centers": []
}
```

> `ppap_cognitive_centers` contém 6 entries quando `consolidation_applied=true`.

---

## Widgets Centro de Comando

| Widget | Runtime OFF | Runtime ON (`consolidation_applied`) |
|--------|-------------|-------------------------------------|
| `qualidade` (placeholder) | **visível** | **suprimido** |
| Hubs `ppap_native` | ausentes | **6 hubs montados** |
| Quality native (`quality_native`) | **inalterado** | **coexistência** no perfil quality |

---

## Flags de activação (prod)

| Env | Fase | Default homologado |
|-----|------|-------------------|
| `IMPETUS_PPAP_COGNITIVE_RUNTIME_ENABLED` | Z.19 | `off` |
| `IMPETUS_PPAP_RENDER_PROMOTION` | Z.22 | `off` |
| `IMPETUS_PPAP_NATIVE_COCKPIT` | Z.23 | `off` |
| `IMPETUS_PPAP_RUNTIME_FOUNDATION` | Foundation attach | `true` (metadados) |

Activar flags em prod requer decisão operacional + massa PPAP real no tenant (binding ≥ thresholds).

---

## Evidências da homologação

| Documento | Conteúdo |
|-----------|----------|
| [GF-006-PPAP-RUNTIME-HOMOLOGATION.md](GF-006-PPAP-RUNTIME-HOMOLOGATION.md) | Fases 1–4 · modos OFF/ON · critérios |
| [GF-005-PPAP-PILOT-ENABLEMENT.md](GF-005-PPAP-PILOT-ENABLEMENT.md) | Massa piloto · binding 1.0 |
| [GF-004-PPAP-PROMOTION.md](GF-004-PPAP-PROMOTION.md) | Infra Z.22/Z.23 |
| [GF-003-PPAP-SIGNAL-LOADER.md](GF-003-PPAP-SIGNAL-LOADER.md) | Loader real |
| `tests/ppap/runPpapRuntimeHomologationTests.js` | 9/9 automatizado |

---

## Trilha Greenfield congelada

| GF | Entrega |
|----|---------|
| GF-000 | Discovery read-only |
| GF-001 | Runtime foundation inactivo |
| GF-002 | Schema + workflow + APIs |
| GF-003 | Signal loader real Z.20 |
| GF-004 | Promotion + CC gate-driven |
| GF-005 | Pilot enablement + massa operacional |
| **GF-006** | **Homologação + congelamento v1.0** |

---

## Débitos documentados (não bloqueiam baseline)

| ID | Descrição | Tipo |
|----|-----------|------|
| ~~P-PPAP-001~~ | Registo em BASELINE-SYSTEM — **resolvido INC-045** | — |
| P-PPAP-002 | Extensão perfil `manager_engineering` | Perfil |
| P-PPAP-003 | APQP / MSA como greenfields separados | Funcional |
| P-PPAP-004 | Blob storage documentos PPAP | Infra |
| P-PPAP-005 | Multi-tenant rollout prod (flags OFF default) | Operacional |

---

## Gates finais

```
PPAP_PROFILE_OK              = YES
PPAP_SURFACE_OK              = YES
PPAP_RUNTIME_OK              = YES  (homologado v1.0)
PPAP_PROMOTION_OK            = YES  (chain locked)
PPAP_COMMAND_CENTER_OK       = YES
PPAP_MODULES_OK              = YES
PPAP_BASELINE_LOCKED         = YES  (v1.0)
NO_CROSS_DOMAIN_REGRESSION   = YES
```

---

## Próximo passo sistémico

**INC-045 concluída:** [BASELINE-SYSTEM-v1.2.md](BASELINE-SYSTEM-v1.2.md) · [INC-045-PPAP-REGISTRATION.md](INC-045-PPAP-REGISTRATION.md)
