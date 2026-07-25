# BASELINE — Ishikawa v1.0

**GF:** GF-020 (homologação)  
**Data congelamento:** 2026-07-17  
**Estado:** `ISHIKAWA_BASELINE_v1.0 = LOCKED`  
**Pré-requisitos homologados:** GF-014 → GF-019  
**Parent domain:** [BASELINE-QUALITY-v1.1.md](BASELINE-QUALITY-v1.1.md) (LOCKED — não alterado)  
**Índice sistémico:** [BASELINE-SYSTEM-v1.4.md](../architecture/BASELINE-SYSTEM-v1.4.md) (**registado INC-047**)

---

## Declaração de congelamento

A partir de **2026-07-17**, o sub-runtime **`ishikawa_native`** está **homologado e congelado** como **Baseline Ishikawa v1.0**.

Toda evolução posterior (hubs analíticos avançados, IA contextual expandida, extensão de perfis) é **funcionalidade incremental** — não correção de baseline.

---

## Regra de engenharia (LOCKED)

> **Nenhuma alteração futura poderá modificar componentes, loaders, supervisors ou resolvers já homologados do domínio Ishikawa sem uma nova GF/INC explícita.**  
> Novas funcionalidades devem ser adicionadas de forma incremental, preservando o Baseline Ishikawa v1.0 e garantindo compatibilidade retroativa com Quality v1.1, PPAP v1.0 e MSA v1.0 LOCKED.

### Superfícies congeladas (alteração proibida sem GF/INC)

| Camada | Artefactos |
|--------|------------|
| **Semântica** | `ishikawaCoreSemantics.js`, `ishikawaWorkflowEngine.js` |
| **Domínio** | `ishikawaInvestigationService.js`, `ishikawaFishboneService.js`, schema `ishikawa_*` |
| **Algoritmos** | `domains/ishikawa/core/ishikawaRootCauseAlgorithms.js` |
| **Runtime Z.20** | `ishikawaTenantSignalLoader.js`, `ishikawaBlockBridge.js`, `ishikawaSignalBindingRuntime.js` |
| **Runtime Z.22–Z.23** | `ishikawaRenderPromotionSupervisor.js`, `ishikawaConsolidationSupervisor.js`, `ishikawaCockpitConsolidator.js` |
| **Foundation** | `ishikawaFoundationAttachment.js`, `ishikawaCockpitPilot.js` |
| **Promoção CC** | `IshikawaNativeCockpitPromotion.jsx`, `ishikawaNativeCockpitRegistry.js` |
| **Hubs baseline** | 10 hubs estruturais GF-018 |
| **APIs homologadas** | `/api/ishikawa/*` (GF-016 + GF-019) |
| **Pilot enablement** | `ishikawaPilotScenario.js` (GF-019) |

---

## Estado global pós GF-020

| Gate | Valor |
|------|-------|
| `ISHIKAWA_RUNTIME` | **LOCKED** |
| `ISHIKAWA_SIGNAL_LOADER` | **LOCKED** |
| `ISHIKAWA_PROMOTION` | **LOCKED** |
| `ISHIKAWA_COMMAND_CENTER` | **LOCKED** |
| `ISHIKAWA_BASELINE_v1.0` | **LOCKED** |
| `ZERO_FAKE_DATA` | **YES** |
| `ZERO_RUNTIME_REGRESSION` | **YES** |
| `NO_CROSS_DOMAIN_REGRESSION` | **YES** |
| `LEGACY_ENGINE_IMPORTED` | **NO** |
| `BASELINE_QUALITY_v1.1` | **PRESERVED** |
| `BASELINE_PPAP_v1.0` | **PRESERVED** |
| `BASELINE_MSA_v1.0` | **PRESERVED** |
| `BASELINE_SYSTEM_v1.3` | **PRESERVED** (registo INC-047) |

---

## Eixo e perfis

| Campo | Valor |
|-------|-------|
| **PARENT_AXIS** | `quality` / `eixo_qualidade` |
| **RUNTIME_ID** | `ishikawa_native` |
| **COCKPIT_MODE** | `ishikawa_native` |
| **FUNCTIONAL_AREA** | `quality` |
| **BINDING_RATIO** | **1.0** (12/12) — tenant piloto GF-019 |
| **PROMOTION** | `promotion_applied: true`, `consolidation_applied: true` (quando gate + flags ON) |

### Perfis elegíveis

| PROFILE_CODE | SURFACE | RUNTIME (quando gate satisfeito) |
|--------------|---------|----------------------------------|
| `manager_quality` | CentroComando | `ishikawa_native` (+ coexistência quality/ppap/msa) |
| `coordinator_quality` | CentroComando | `ishikawa_native` |
| `supervisor_quality` | CentroComando | `ishikawa_native` |
| `inspector_quality` | CentroComando | `ishikawa_native` (piloto parcial) |

---

## Cadeia arquitectural homologada

```
Cadastro investigação (Core Domain GF-016)
  ↓
/dashboard/me  [cognitiveRuntimeFacade Z.19–Z.23]
  ↓
Z.19 runIshikawaCockpitPilot
  ↓
Z.20 ishikawaTenantSignalLoader  [GF-017 — sinais reais BD ishikawa_*]
  ↓
Z.22 applyIshikawaControlledRenderPromotion  [GF-018 — gate ≥ 0.5]
  ↓
Z.23 applyIshikawaCockpitConsolidation  [GF-018 — gate ≥ 0.35 + Z.22]
  ↓
ishikawaFoundationAttachment  [preserva estado GF-020]
  ↓
IshikawaNativeCockpitPromotion  [CentroComando]
  ↓
10 hubs estruturais ishikawa_native
```

---

## Thresholds homologados (imutáveis)

| Fase | Threshold | Fonte |
|------|-----------|-------|
| Z.22 render promotion | `binding_ratio ≥ 0.5` | `phaseZ22FeatureFlags` |
| Z.23 consolidation | `binding_ratio ≥ 0.35` | `ishikawaConsolidationSupervisor` |

**Proibido:** bypass `force_ishikawa_*` para contornar binding.

---

## Block pack Z.19 (12 blocos)

| Block ID | Domínio |
|----------|---------|
| `ishikawa.investigation_registry` | Registo |
| `ishikawa.root_cause_repository` | Causa raiz |
| `ishikawa.fishbone_analysis` | Fishbone 6M |
| `ishikawa.five_whys` | 5 Porquês |
| `ishikawa.corrective_actions` | AC |
| `ishikawa.preventive_actions` | AP |
| `ishikawa.evidence_repository` | Evidências |
| `ishikawa.investigation_workflow` | Workflow |
| `ishikawa.contextual_root_cause_ai` | IA contextual |
| `ishikawa.organizational_learning` | Aprendizagem |
| `ishikawa.recurrence_monitor` | Recorrência |
| `ishikawa.ishikawa_narrative` | Narrativa |

---

## Hubs Centro de Comando (10)

| hub_key | Center |
|---------|--------|
| `investigation_overview` | `ishikawa_investigation_overview_ops` |
| `fishbone` | `ishikawa_fishbone_ops` |
| `five_why` | `ishikawa_five_why_ops` |
| `corrective_actions` | `ishikawa_corrective_actions_ops` |
| `preventive_actions` | `ishikawa_preventive_actions_ops` |
| `evidence` | `ishikawa_evidence_ops` |
| `approvals` | `ishikawa_approvals_ops` |
| `recurrence` | `ishikawa_recurrence_ops` |
| `organizational_learning` | `ishikawa_organizational_learning_ops` |
| `narrative` | `ishikawa_narrative_ops` |

---

## Payload canónico `/dashboard/me`

### Modo OFF (Cenário A)

```json
{
  "ishikawa_cognitive_runtime": {
    "runtime_id": "ishikawa_native",
    "inactive": true,
    "promotion_applied": false,
    "consolidation_applied": false,
    "cockpit_mode": "off",
    "binding_ratio": 0
  },
  "ishikawa_signal_loader": {
    "signal_readiness": "NO_DATASET",
    "binding_ratio": 0
  },
  "ishikawa_cognitive_centers": []
}
```

### Modo ON (Cenário B)

```json
{
  "ishikawa_cognitive_runtime": {
    "runtime_id": "ishikawa_native",
    "inactive": false,
    "promotion_applied": true,
    "consolidation_applied": true,
    "cockpit_mode": "ishikawa_native",
    "binding_ratio": 1
  },
  "ishikawa_signal_loader": {
    "signal_readiness": "ready",
    "binding_ratio": 1,
    "bound_blocks": ["ishikawa.investigation_registry", "..."]
  },
  "ishikawa_cognitive_centers": [ "... 10 centers ..." ]
}
```

---

## Sequência Greenfield homologada

| GF | Entrega | Estado |
|----|---------|--------|
| GF-014 | Discovery | ✅ |
| GF-015 | Runtime Foundation | ✅ |
| GF-016 | Core Domain | ✅ |
| GF-017 | Signal Loader | ✅ |
| GF-018 | Promotion + CC | ✅ |
| GF-019 | Pilot Enablement | ✅ |
| **GF-020** | **Homologation + BASELINE-ISHIKAWA-v1.0** | **✅ LOCKED** |

---

## Assinatura técnica

| Campo | Valor |
|-------|-------|
| Versão | **BASELINE-ISHIKAWA-v1.0** |
| Data | **2026-07-17** |
| Escopo | Runtime `ishikawa_native` completo (Z.19→Z.23) |
| Suites | 6 suítes Ishikawa + ARC-001 + regressão 10 runtimes |
| Resultado | **HOMOLOGATED · LOCKED** |
| Registo SYSTEM | **INC-047** → BASELINE-SYSTEM v1.4 |
| Homologation checks | **16/16 PASS** |
| Suítes agregadas | **139/139 PASS** |
| Próximo INC | **INC-047** → BASELINE-SYSTEM v1.4 |

## Evidências de homologação

| Teste | Resultado |
|-------|-----------|
| `test:ishikawa-runtime-homologation` | **16/16 PASS** |
| `test:ishikawa-runtime-foundation` | 11/11 |
| `test:ishikawa-core-domain` | 10/10 |
| `test:ishikawa-signal-loader` | 10/10 |
| `test:ishikawa-promotion` | 11/11 |
| `test:ishikawa-pilot` | 13/13 |
| `test:architecture-conformance` | 84/84 |
| Regressão 10 runtimes homologados | ✅ |

Documentação: [GF-020-ISHIKAWA-HOMOLOGATION.md](GF-020-ISHIKAWA-HOMOLOGATION.md) · [ISHIKAWA-HOMOLOGATION-REPORT.md](ISHIKAWA-HOMOLOGATION-REPORT.md)

---

## Referências

| Documento | Relação |
|-----------|---------|
| [ISHIKAWA-ARCHITECTURE-v1.0.md](ISHIKAWA-ARCHITECTURE-v1.0.md) | Plano arquitectural |
| [BASELINE-MSA-v1.0.md](../architecture/BASELINE-MSA-v1.0.md) | Modelo espelho |
| [BASELINE-PPAP-v1.0.md](BASELINE-PPAP-v1.0.md) | Modelo espelho |
| [BASELINE-SYSTEM-v1.3.md](../architecture/BASELINE-SYSTEM-v1.3.md) | Índice sistémico (preservado) |
