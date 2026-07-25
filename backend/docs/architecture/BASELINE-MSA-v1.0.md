# BASELINE — MSA v1.0

**GF:** GF-013 (homologação)  
**Data congelamento:** 2026-07-17  
**Estado:** `MSA_BASELINE_v1.0 = LOCKED`  
**Pré-requisitos homologados:** GF-007 → GF-012  
**Parent domain:** [BASELINE-QUALITY-v1.1.md](../evidence/BASELINE-QUALITY-v1.1.md) (LOCKED — não alterado)  
**Índice sistémico:** [BASELINE-SYSTEM-v1.3.md](BASELINE-SYSTEM-v1.3.md) (**registado INC-046**)

---

## Declaração de congelamento

A partir de **2026-07-17**, o sub-runtime **`msa_native`** está **homologado e congelado** como **Baseline MSA v1.0**.

Toda evolução posterior (GRR engine dedicado, novos hubs analíticos, extensão de perfis metrology) é **funcionalidade incremental** — não correção de baseline.

---

## Regra de engenharia (LOCKED)

> **Nenhuma alteração futura poderá modificar componentes, loaders, supervisors ou resolvers já homologados do domínio MSA sem uma nova GF/INC explícita.**  
> Novas funcionalidades devem ser adicionadas de forma incremental, preservando o Baseline MSA v1.0 e garantindo compatibilidade retroativa com Quality v1.1 LOCKED e PPAP v1.0 LOCKED.

### Superfícies congeladas (alteração proibida sem GF/INC)

| Camada | Artefactos |
|--------|------------|
| **Semântica** | `msaCoreSemantics.js` — estados, workflow, tipos AIAG |
| **Domínio** | `msaStudyService.js`, `msaMasterDataService.js`, `msaStudyEvidenceService.js`, schema `msa_*` |
| **Runtime Z.20** | `msaTenantSignalLoader.js`, `msaBlockBridge.js`, `msaSignalBindingRuntime.js` |
| **Runtime Z.22–Z.23** | `msaRenderPromotionSupervisor.js`, `msaConsolidationSupervisor.js`, `msaCockpitConsolidator.js` |
| **Foundation** | `msaFoundationAttachment.js`, `msaCockpitPilot.js` |
| **Promoção CC** | `MsaNativeCockpitPromotion.jsx`, `msaNativeCockpitRegistry.js` |
| **Hubs baseline** | 6 hubs estruturais GF-011 |
| **APIs homologadas** | `/api/msa/*` (GF-009 + GF-012) |
| **Pilot enablement** | `msaPilotScenario.js` (GF-012) |

---

## Estado global pós GF-013

| Gate | Valor |
|------|-------|
| `MSA_RUNTIME` | **LOCKED** |
| `MSA_SIGNAL_LOADER` | **LOCKED** |
| `MSA_PROMOTION` | **LOCKED** |
| `MSA_COMMAND_CENTER` | **LOCKED** |
| `MSA_BASELINE_v1.0` | **LOCKED** |
| `ZERO_FAKE_DATA` | **YES** |
| `ZERO_RUNTIME_REGRESSION` | **YES** |
| `NO_CROSS_DOMAIN_REGRESSION` | **YES** |
| `BASELINE_QUALITY_v1.1` | **PRESERVED** |
| `BASELINE_PPAP_v1.0` | **PRESERVED** |
| `BASELINE_SYSTEM_v1.2` | **SUPERSEDED** (preserved · index v1.3) |
| `BASELINE_SYSTEM_v1.3` | **REGISTERED** (INC-046) |

---

## Eixo e perfis

| Campo | Valor |
|-------|-------|
| **PARENT_AXIS** | `quality` / `eixo_qualidade` |
| **RUNTIME_ID** | `msa_native` |
| **COCKPIT_MODE** | `msa_native` |
| **FUNCTIONAL_AREA** | `quality` |
| **BINDING_RATIO** | **1.0** (12/12) — tenant piloto GF-012 |
| **PROMOTION** | `promotion_applied: true`, `consolidation_applied: true` (quando gate + flags ON) |

### Perfis elegíveis

| PROFILE_CODE | SURFACE | RUNTIME (quando gate satisfeito) |
|--------------|---------|----------------------------------|
| `manager_quality` | CentroComando | `msa_native` (+ `quality_native` coexistência) |
| `coordinator_quality` | CentroComando | `msa_native` |
| `supervisor_quality` | CentroComando | `msa_native` |
| `inspector_quality` | CentroComando | `msa_native` (piloto parcial) |

---

## Cadeia arquitectural homologada

```
Cadastro Estrutural (perfil quality + functional_area)
  ↓
/dashboard/me  [cognitiveRuntimeFacade Z.19–Z.23]
  ↓
Z.19 runMsaCockpitPilot
  ↓
Z.20 msaTenantSignalLoader  [GF-010 — sinais reais BD msa_*]
  ↓
Z.22 applyMsaControlledRenderPromotion  [GF-011 — gate ≥ 0.5]
  ↓
Z.23 applyMsaCockpitConsolidation  [GF-011 — gate ≥ 0.35 + Z.22 msa_native]
  ↓
msaFoundationAttachment  [preserva estado GF-013]
  ↓
MsaNativeCockpitPromotion  [CentroComando]
  ↓
6 hubs estruturais msa_native
```

---

## Thresholds homologados (imutáveis)

| Fase | Threshold | Fonte |
|------|-----------|-------|
| Z.22 render promotion | `binding_ratio ≥ 0.5` | `phaseZ22FeatureFlags` |
| Z.23 consolidation | `binding_ratio ≥ 0.35` | `msaConsolidationSupervisor` |

**Proibido:** bypass `force_msa_*` para contornar binding.

---

## Block pack Z.19 (12 blocos)

| Block ID | Center |
|----------|--------|
| `msa.measurement_system_registry` | Study Governance |
| `msa.study_governance` | Study Governance |
| `msa.measurement_capability` | Study Governance |
| `msa.gauge_inventory` | Gauge Management |
| `msa.variable_grr` | Variable GRR |
| `msa.attribute_agreement` | Attribute Agreement |
| `msa.bias_analysis` | Variable GRR |
| `msa.linearity_analysis` | Variable GRR |
| `msa.stability_analysis` | Variable GRR |
| `msa.calibration_monitoring` | Calibration |
| `msa.contextual_msa_ai` | Cognitive MSA |
| `msa.msa_narrative` | Cognitive MSA |

---

## Hubs Centro de Comando (6)

| hub_key | Componente | Center |
|---------|------------|--------|
| `study_governance` | `StudyGovernanceHub` | `msa_study_governance_ops` |
| `gauge_management` | `GaugeManagementHub` | `msa_gauge_management_ops` |
| `variable_grr` | `VariableGrrHub` | `msa_variable_grr_ops` |
| `attribute_agreement` | `AttributeAgreementHub` | `msa_attribute_agreement_ops` |
| `calibration` | `CalibrationHub` | `msa_calibration_ops` |
| `cognitive` | `CognitiveMsaHub` | `msa_cognitive_ops` |

Estados hub: **REAL_DATA** · **INSUFFICIENT_DATA** (honesto, sem mock)

---

## Payload canónico `/dashboard/me`

### Modo OFF (Cenário 1)

```json
{
  "msa_cognitive_runtime": {
    "runtime_id": "msa_native",
    "inactive": true,
    "promotion_applied": false,
    "consolidation_applied": false,
    "cockpit_mode": "off",
    "binding_ratio": 0
  },
  "msa_signal_loader": {
    "signal_readiness": "NO_DATASET",
    "binding_ratio": 0
  },
  "msa_cognitive_centers": []
}
```

### Modo ON (Cenário 2)

```json
{
  "msa_cognitive_runtime": {
    "runtime_id": "msa_native",
    "inactive": false,
    "promotion_applied": true,
    "consolidation_applied": true,
    "cockpit_mode": "msa_native",
    "binding_ratio": 1
  },
  "msa_signal_loader": {
    "signal_readiness": "ready",
    "binding_ratio": 1,
    "bound_blocks": ["msa.measurement_system_registry", "..."]
  },
  "msa_cognitive_centers": [ "... 6 centers ..." ]
}
```

---

## Sequência Greenfield homologada

| GF | Entrega | Estado |
|----|---------|--------|
| GF-007 | Discovery | ✅ |
| GF-008 | Runtime Foundation | ✅ |
| GF-009 | Core Domain | ✅ |
| GF-010 | Signal Loader | ✅ |
| GF-011 | Promotion + CC | ✅ |
| GF-012 | Pilot Enablement | ✅ |
| **GF-013** | **Homologation + BASELINE-MSA-v1.0** | **✅ LOCKED** |

---

## Evidências de homologação

| Teste | Resultado |
|-------|-----------|
| `test:msa-runtime-homologation` | **11/11 PASS** |
| `test:msa-promotion-chain` | 10/10 |
| `test:msa-pilot-enablement` | 8/8 |
| `test:msa-signal-loader` | 10/10 |
| `test:msa-core-domain` | 9/9 |
| `test:architecture-conformance` | 75/75 |
| Regressão 9 runtimes homologados | ✅ |

Documentação: [GF-013-MSA-HOMOLOGATION.md](../evidence/GF-013-MSA-HOMOLOGATION.md)

---

## Referências

| Documento | Relação |
|-----------|---------|
| [MSA-ARCHITECTURE-v1.0.md](../evidence/MSA-ARCHITECTURE-v1.0.md) | Plano arquitectural |
| [BASELINE-PPAP-v1.0.md](../evidence/BASELINE-PPAP-v1.0.md) | Modelo espelho |
| [BASELINE-SYSTEM-v1.3.md](BASELINE-SYSTEM-v1.3.md) | Índice sistémico (INC-046) |
| [ARC-001-ARCHITECTURE-CONFORMANCE.md](../evidence/ARC-001-ARCHITECTURE-CONFORMANCE.md) | Guardião arquitectural |

---

## Decisão de congelamento v1.0

**Homologado em GF-013:**

1. Sub-runtime **`msa_native`** gate-driven e determinístico  
2. Cadeia Z.19→Z.23 validada OFF e ON  
3. Centro de Comando integrado com 6 hubs estruturais  
4. Zero regressão nos 9 runtimes homologados + PPAP  
5. **INC-046 concluído** — registo BASELINE-SYSTEM v1.3

**Registo concluído:** **GF-013 Homologation** + **INC-046 Registration** — baseline domínio **LOCKED** · SYSTEM **v1.3**.
