# MSA Runtime Architecture v1.0 — Plano Greenfield (Documental)

**GF:** GF-007 (discovery) → GF-008…GF-013 (implementação proposta)  
**Data:** 2026-07-16  
**Tipo:** plano arquitectural read-only  
**Pré-requisitos:** [BASELINE-SYSTEM-v1.2.md](BASELINE-SYSTEM-v1.2.md) · [BASELINE-QUALITY-v1.1.md](BASELINE-QUALITY-v1.1.md) · [BASELINE-PPAP-v1.0.md](BASELINE-PPAP-v1.0.md) · [GF-007-MSA-DISCOVERY.md](GF-007-MSA-DISCOVERY.md)  
**Estado:** `MSA_ARCHITECTURE_v1.0 = APPROVED_FOR_GF-008` (documental)

---

## 1. Declaração

Este documento define a **arquitectura alvo** do domínio **MSA (Measurement System Analysis)** no IMPETUS como **greenfield cognitivo** sobre baselines homologados — **sem alterar** `quality_native` LOCKED, `ppap_native` LOCKED, `logistics_native` LOCKED, SurfaceCapabilities, Promotion homologada ou CentroComando shell.

MSA nasce como **sub-runtime `msa_native`** no **eixo Qualidade**, espelhando a disciplina **GF-000→GF-006 (PPAP)** e AIAG MSA Manual (4th Ed.) / VDA 5.

---

## 2. Contexto de discovery (GF-007)

| Facto | Implicação arquitectural |
|-------|-------------------------|
| Zero código MSA | Greenfield total |
| SPC + Cp/Cpk engines existem | GF-009 bridge + **novo** `msaGrrEngine` — **não** alterar Quality LOCKED |
| `quality_inspections` com medidas | GF-010 loader bridge read-only |
| PPAP dimensional + capability | GF-010 bridge read-only · elemento AIAG #8 |
| PPAP homologado como sibling | Coexistência `quality_native` + `ppap_native` + `msa_native` |
| Gage register inexistente | GF-009 schema dedicado |
| FMEA/Ishikawa UI ausente | Fora scope MSA v1.0 |

**Flags discovery:**

```
MSA_ENGINE_EXISTS          = NO
MSA_RUNTIME_EXISTS         = YES (GF-013 homologated)
MSA_SCHEMA_EXISTS          = YES (GF-009)
MSA_DOMAIN_EXISTS          = YES (GF-009)
MSA_WORKFLOW_EXISTS        = YES (GF-009)
MSA_API_EXISTS             = YES (GF-009)
MSA_BASELINE_v1.0          = LOCKED (GF-013)
CENÁRIO                    = A (greenfield integral)
```

---

## 2.1 Runtime Foundation (GF-008)

Estado após GF-008 — fundação arquitectural **inactiva**, espelhando disciplina GF-001 (PPAP):

| Componente | Path | Estado |
|------------|------|--------|
| Feature flags | `config/phaseMsaNativeFeatureFlags.js` | Default OFF |
| Block pack Z.19 | `registry/msaCognitiveBlockPack.js` | 12 blocos · inactive |
| Pilot Z.19 | `pilot/msaCockpitPilot.js` | Skip flags OFF |
| Loader Z.20 | `domains/msa/bridge/msaTenantSignalLoader.js` | Stub · NO_DATASET · sem BD |
| Descriptor | `domains/msa/runtime/msaRuntimeDescriptor.js` | `msa_native` |
| Foundation | `domains/msa/runtime/msaFoundationAttachment.js` | Sempre anexa inactivo |
| Z.22 | `renderPromotion/msa/msaControlledRenderRuntime.js` | `promotion_applied: false` |
| Z.23 | `domains/msa/runtime/msaCockpitConsolidationRuntime.js` | `consolidation_applied: false` |
| Facade | `facade/cognitiveRuntimeFacade.js` | Branch aditivo pós-PPAP |
| Domain registry | `domainFoundation/registry/cognitiveDomainRegistry.js` | 10.º domínio · foundation |
| FE registry | `frontend/.../msaNativeCockpitRegistry.js` | OFF |
| FE promotion | `MsaNativeCockpitPromotion.jsx` | `return null` |

**Payload `/dashboard/me` (foundation):**

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
    "signal_readiness": "NO_DATASET",
    "binding_ratio": 0
  },
  "msa_cognitive_centers": []
}
```

**Evidência:** [GF-008-MSA-RUNTIME-FOUNDATION.md](GF-008-MSA-RUNTIME-FOUNDATION.md)

**Nota ARC-001 (pós INC-046):** `msa_native` permanece em `FOUNDATION_RUNTIMES` no manifesto ARC-001 (inalterado por INC-046); o **registo arquitectural** como 10.º runtime homologado está em **BASELINE-SYSTEM v1.3** — ver §2.7.

---

## 2.3 Signal Loader (GF-010)

Estado após GF-010 — loader **real** observacional (paridade PPAP GF-003):

| Componente | Path | Estado |
|------------|------|--------|
| Tenant loader | `domains/msa/bridge/msaTenantSignalLoader.js` | Lê Core Domain GF-009 |
| Block bridge Z.20 | `domains/msa/bridge/msaBlockBridge.js` | 12 blocos · `engine_ok` / `binding_ok` |
| Binding runtime | `domains/msa/bridge/msaSignalBindingRuntime.js` | `runMsaSignalBinding()` |
| Foundation attach | `domains/msa/runtime/msaFoundationAttachment.js` | `signal_loader_active` |
| Semântica SSOT | `domains/msa/semantics/msaCoreSemantics.js` | **única fonte** — loader importa status |

**Princípio:** loader **observa** — não decide workflow, não recalcula GRR, não duplica enums.

**Payload actualizado (sem promotion):**

```json
{
  "msa_signal_loader": {
    "inactive": true,
    "binding_ratio": 0,
    "signal_readiness": "NO_DATASET",
    "pilot_blocks": ["msa.measurement_system_registry", "..."],
    "bound_blocks": [],
    "missing_blocks": []
  },
  "msa_cognitive_runtime": {
    "inactive": true,
    "promotion_applied": false,
    "consolidation_applied": false,
    "binding_ratio": 0,
    "foundation_status": "signal_loader_active"
  }
}
```

Com dados reais: `binding_ratio > 0`, `signal_readiness`: `partial` | `ready` — **sem** activar runtime.

**Evidência:** [GF-010-MSA-SIGNAL-LOADER.md](GF-010-MSA-SIGNAL-LOADER.md)

---

## 2.4 Promotion & Command Center (GF-011)

Estado após GF-011 — cadeia Z.22 → Z.23 **gate-driven** (paridade PPAP GF-004):

| Componente | Path | Estado |
|------------|------|--------|
| Z.22 supervisor | `renderPromotion/msa/msaRenderPromotionSupervisor.js` | Gate ≥ 0.5 · sem BD |
| Z.22 runtime | `renderPromotion/msa/msaControlledRenderRuntime.js` | `applyMsaControlledRenderPromotion()` |
| Z.23 supervisor | `domains/msa/cockpit/msaConsolidationSupervisor.js` | Gate ≥ 0.35 + Z.22 |
| Z.23 consolidator | `domains/msa/cockpit/msaCockpitConsolidator.js` | 6 centers |
| Z.23 runtime | `domains/msa/runtime/msaCockpitConsolidationRuntime.js` | `applyMsaCockpitConsolidation()` |
| FE registry | `frontend/.../msaNativeCockpitRegistry.js` | 6 hubs lazy |
| FE promotion | `MsaNativeCockpitPromotion.jsx` | Mount quando `consolidation_applied` |
| FE hubs | `domains/msa/cockpit/*Hub.jsx` | INSUFFICIENT_DATA honesto |

**Princípio:** Promotion **observa** `binding_ratio` do pilot/engine_bridge — **não recalcula** sinais, **não consulta** BD.

**Payload (gate OFF — Cenário A):**

```json
{
  "msa_cognitive_runtime": {
    "inactive": true,
    "promotion_applied": false,
    "consolidation_applied": false,
    "cockpit_mode": "off",
    "binding_ratio": 0,
    "gate_scenario": "A_NO_DATASET"
  },
  "msa_cognitive_centers": []
}
```

**Payload (gate ON — Cenário C):** `consolidation_applied: true`, `cockpit_mode: "msa_native"`, `msa_cognitive_centers` com 6 centers.

**Evidência:** [GF-011-MSA-PROMOTION.md](GF-011-MSA-PROMOTION.md)

---

## 2.5 Pilot Enablement (GF-012)

Estado após GF-012 — **massa operacional real** via Core Domain (sem alterar arquitectura cognitiva):

| Componente | Path | Estado |
|------------|------|--------|
| Pilot scenario | `domains/msa/services/msaPilotScenario.js` | Fluxo completo APPROVED |
| Evidence | `msaStudyEvidenceService.js` | Operadores/peças/amostras/docs |
| APIs | `routes/msa.js` | CRUD + workflow + listagens |
| Signal Loader | *(GF-010 — inalterado)* | Observa binding_ratio > 0 |
| Promotion | *(GF-011 — inalterada)* | Gate-driven · não forçada |

**Resultado esperado pós-pilot:**

```
MSA_SIGNAL_READINESS  != NO_DATASET
MSA_BINDING_RATIO     > 0  (12/12 blocos)
MSA_RUNTIME_ACTIVE    = ONLY_IF_GATE_PASS (GF-011)
PROMOTION_FORCED      = NO
```

**Evidência:** [GF-012-MSA-PILOT-ENABLEMENT.md](GF-012-MSA-PILOT-ENABLEMENT.md)

---

## 2.6 Homologation (GF-013)

Estado após GF-013 — runtime **`msa_native` homologado** · **BASELINE-MSA-v1.0 LOCKED**:

| Validação | Resultado |
|-----------|-----------|
| Cenário OFF | `binding_ratio=0` · `NO_DATASET` · sem hubs |
| Cenário ON | `binding_ratio=1.0` · promoção automática · 6 centers |
| Cadeia Z.19→Z.23 | Validada integralmente |
| Regressão 9 runtimes | Sem impacto |
| ARC-001 | 75/75 CONFORMANT |

**Flags homologação (tenant piloto, sem bypass):**

```
IMPETUS_MSA_COGNITIVE_RUNTIME_ENABLED=on
IMPETUS_MSA_RENDER_PROMOTION=controlled
IMPETUS_MSA_NATIVE_COCKPIT=on
```

**Baseline:** [BASELINE-MSA-v1.0.md](../architecture/BASELINE-MSA-v1.0.md)  
**Evidência:** [GF-013-MSA-HOMOLOGATION.md](GF-013-MSA-HOMOLOGATION.md)

**Nota:** Registado em **BASELINE-SYSTEM v1.3** via **INC-046**.

---

## 2.7 Architecture Registration (INC-046)

Estado após INC-046 — **`msa_native` registado no índice mestre**:

| Campo | Valor |
|-------|-------|
| `SYSTEM_BASELINE` | **v1.3** |
| `TOTAL_HOMOLOGATED_RUNTIMES` | **10** |
| `MSA_REGISTERED` | **YES** |
| Código alterado | **ZERO** |

**Documentos:** [INC-046-ARCHITECTURE-REGISTRATION.md](INC-046-ARCHITECTURE-REGISTRATION.md) · [BASELINE-SYSTEM-v1.3.md](../architecture/BASELINE-SYSTEM-v1.3.md)

---

## 2.2 Core Domain (GF-009)

Estado após GF-009 — **fonte única de verdade** operacional MSA (sem cognitivo):

| Componente | Path |
|------------|------|
| Migration | `migrations/msa_core_domain_migration.sql` |
| Semântica | `domains/msa/semantics/msaCoreSemantics.js` |
| Workflow | `domains/msa/workflow/msaWorkflowEngine.js` |
| Services | `domains/msa/services/msaStudyService.js`, `msaMasterDataService.js`, `msaStudyEvidenceService.js` |
| API | `routes/msa.js` → `/api/msa/*` |

**Entidades normalizadas:** `MeasurementStudy` (`msa_measurement_studies`), `Gauge`, `Instrument`, `Operator`, `Part`, `MeasurementSample`, extensões dedicadas (`VariableGrrStudy`, `AttributeAgreementStudy`, `BiasStudy`, `LinearityStudy`, `StabilityStudy`), `CalibrationReference`, `StudyApproval`, `AttachedDocument`.

**Estados:** `DRAFT` · `PLANNED` · `IN_PROGRESS` · `UNDER_REVIEW` · `APPROVED` · `REJECTED` · `ARCHIVED`

**Workflow:** Draft → Planning → Execution → Technical Review → Approval → Archive (rejeição + reopen explícitos).

**Runtime GF-008:** inalterado — `inactive=true`, `NO_DATASET`, sem Signal Loader / Promotion.

**Evidência:** [GF-009-MSA-CORE-DOMAIN.md](GF-009-MSA-CORE-DOMAIN.md)

---

## 3. Posicionamento no sistema

### 3.1 Relação com baselines LOCKED

```
BASELINE-SYSTEM v1.2 (LOCKED)
├── quality_native (LOCKED)     ← parent axis · não modificar
├── ppap_native (LOCKED)        ← sibling · bridge read-only
├── logistics_native (LOCKED) ← bridge read-only
└── msa_native (GREENFIELD)     ← novo ramo aditivo GF-008…013
```

### 3.2 Eixo e perfis (proposta)

| Campo | Valor proposto |
|-------|----------------|
| **PARENT_AXIS** | `quality` / `eixo_qualidade` |
| **RUNTIME_ID** | `msa_native` |
| **COCKPIT_MODE** | `msa_native` |
| **FUNCTIONAL_AREA** | `quality` (sem novo eixo cadastral v1.0) |
| **PERFIS elegíveis** | `manager_quality`, `coordinator_quality`, `supervisor_quality`, `inspector_quality`; extensão futura `manager_metrology` |

> MSA **não** requer novo `functional_area` na v1.0 — evita alteração a `dashboardProfileResolver` LOCKED salvo INC futura.

### 3.3 Cadeia de valor funcional

```
Supplier
    │
Incoming Inspection
    │
Measurement System (gages / fixtures / software)
    │
MSA (msa_native)
    │
Quality ──► PPAP (elemento #8) ──► Production
```

---

## 4. Modelo de domínio MSA (AIAG)

### 4.1 Entidades greenfield propostas (GF-009 — schema)

| Entidade | Propósito |
|----------|-----------|
| `msa_gages` | Cadastro instrumentos (ID, tipo, resolução, calibração) |
| `msa_characteristics` | Característica medida (link parte/processo) |
| `msa_studies` | Estudo MSA (GRR, bias, linearity, stability, attribute) |
| `msa_study_operators` | Operadores/appraisers do estudo |
| `msa_study_parts` | Peças/amostras do estudo |
| `msa_measurements` | Matriz medições (trial × part × operator) |
| `msa_study_results` | Resultados calculados (%GRR, ndc, Kappa, etc.) |
| `msa_calibration_records` | Histórico calibração gage |

### 4.2 Tipos de estudo AIAG (v1.0 scope)

| Tipo | Método | Prioridade GF |
|------|--------|---------------|
| **Variable GRR** | ANOVA / Average & Range | **P0** — GF-009/012 |
| **Attribute Agreement** | Kappa / Kendall | **P1** — GF-009 |
| **Bias** | t-test vs reference | **P1** — GF-009 |
| **Linearity** | Regression vs reference | **P2** — EV futuro |
| **Stability** | Control chart on master | **P2** — EV futuro |

### 4.3 Ligação PPAP (elemento AIAG #8)

| Campo PPAP | Ligação MSA proposta |
|------------|---------------------|
| `ppap_submissions` | FK nullable `msa_study_id` |
| Elemento #8 status | Derivado de `msa_study_results.acceptable` |
| Bridge | Read-only em loader — **não** alterar `ppapCoreSemantics` LOCKED sem GF/INC |

---

## 5. Cadeia arquitectural alvo

Espelha PPAP; ramo MSA **aditivo** na facade:

```
Cadastro (perfil quality + metrology context)
        ↓
GET /api/dashboard/me
        ↓
dashboardSurfaceCapabilities (fail-closed — sem bypass)
        ↓
Runtime resolution
  quality_native (LOCKED) + ppap_native (LOCKED) + msa_native (when flags ON)
        ↓
Z.19 msaCockpitPilot + msaCognitiveBlockPack
        ↓
Z.20 msaTenantSignalLoader
  ├── msa_* tables (primary)
  ├── bridge: quality_inspections (measurements)
  ├── bridge: ppap_dimensional_results, ppap_capability_studies
  ├── bridge: supplier_quality_metrics
  └── bridge: msa_gages / msa_studies (primary)
        ↓
Z.21 msaOperationalMetricsAdapter (opcional v1)
        ↓
Z.22 msaControlledRenderPromotion (gate ≥ 0.5)
        ↓
Z.23 msaCockpitConsolidation → msa_cognitive_centers
        ↓
MsaNativeCockpitPromotion (GF-011)
        ↓
Hubs: GageRegistryHub · GrrStudyHub · AttributeStudyHub · BiasLinearityHub · CognitiveMsaHub
        ↓
Adapters frontend (runtime-only · dados reais)
        ↓
APIs /api/msa/* (GF-009+)
```

**Regra:** payload canónico **`msa_cognitive_runtime`** — isolado de `specialized_cockpit_runtime`, `ppap_cognitive_runtime`, `logistics_cognitive_runtime`.

---

## 6. Inventário técnico planeado (GF-008…011)

### 6.1 Backend (paths propostos — não existem ainda)

| Camada | Path proposto |
|--------|---------------|
| Semantics | `domains/msa/semantics/msaCoreSemantics.js` |
| Block pack Z.19 | `cognitiveRuntime/registry/msaCognitiveBlockPack.js` |
| Pilot Z.19 | `cognitiveRuntime/pilot/msaCockpitPilot.js` |
| Signal loader Z.20 | `cognitiveRuntime/domains/msa/bridge/msaTenantSignalLoader.js` |
| Block bridge | `cognitiveRuntime/domains/msa/bridge/msaBlockBridge.js` |
| GRR engine | `domains/msa/analytics/msaGrrEngine.js` (**novo** — wrap stats, não alterar Quality) |
| Promotion Z.22 | `cognitiveRuntime/renderPromotion/msa/*` |
| Consolidation Z.23 | `cognitiveRuntime/domains/msa/cockpit/*` |
| Foundation | `cognitiveRuntime/domains/msa/runtime/msaFoundationAttachment.js` |
| Facade branch | `cognitiveRuntimeFacade.js` — branch aditivo MSA |
| API | `routes/msa.js` → `/api/msa` |
| Domain services | `domains/msa/services/*` |

### 6.2 Frontend (paths propostos)

| Camada | Path proposto |
|--------|---------------|
| Registry CC | `cognitiveRuntime/cockpit/msaNativeCockpitRegistry.js` |
| Promotion | `features/dashboard/centroComando/MsaNativeCockpitPromotion.jsx` |
| Hubs | `domains/msa/cockpit/*Hub.jsx` |
| Adapter | `domains/msa/cockpit/msaRuntimeHubAdapter.js` |

### 6.3 Block pack inicial (proposta Z.19)

| Block ID | Semântica |
|----------|-----------|
| `msa.gage_registry` | Instrumentos activos / calibração |
| `msa.grr_variable` | Estudos GRR variáveis |
| `msa.attribute_agreement` | Concordância atributos |
| `msa.bias_linearity` | Bias / linearity studies |
| `msa.stability` | Estabilidade gage |
| `msa.calibration_status` | Status calibração |
| `msa.ppap_link` | Bridge submissões PPAP (#8) |
| `msa.quality_link` | Bridge inspeções Quality |
| `msa.contextual_msa_ai` | Contexto cognitivo (sem mock) |
| `msa.msa_narrative` | Narrativa estudo |

---

## 7. Integração cross-domain (read-only bridges)

```
┌──────────────────┐     ┌──────────────────┐
│ quality_inspections│     │ ppap_submissions │
│  (measurements)   │     │  + dimensional   │
└────────┬─────────┘     │  + capability    │
         │               └────────┬─────────┘
         │                        │
         └──────────┬─────────────┘
                    ▼
           msaTenantSignalLoader
                    │
                    ▼
              msa_studies
                    │
         ┌──────────┼──────────┐
         ▼          ▼          ▼
    msa_gages  msa_results  ppap_element_8
```

**Regra:** bridges **nunca** escrevem em tabelas Quality/PPAP LOCKED.

---

## 8. Reutilização planeada (sem alterar LOCKED)

| Componente existente | Estratégia MSA | Classificação |
|---------------------|----------------|---------------|
| `qualitySpcEngine` | Import funções puras em `msaGrrEngine` | PARTIAL |
| `qualityProcessCapabilityEngine` | Referência Cp/Cpk pós-GRR aceitável | PARTIAL |
| `qualitySpcSeriesService` | Bridge read-only measurements | READY_TO_REUSE |
| `quality_inspections` | FK / bridge nullable | READY_TO_REUSE |
| `ppap_dimensional_results` | Contexto característica | PARTIAL |
| `ppap_capability_studies` | Pós-MSA process capability | PARTIAL |
| Stack PPAP GF-000→006 | Metodologia espelho | READY_TO_REUSE |
| `qualityTenantSignalLoader` | Padrão loader Z.20 | READY_TO_REUSE |

---

## 9. Gates e thresholds (proposta — paridade PPAP)

| Fase | Threshold proposto | Fonte |
|------|-------------------|-------|
| Z.22 render promotion | `binding_ratio ≥ 0.5` | `phaseZ22FeatureFlags` (existente) |
| Z.23 consolidation | `binding_ratio ≥ 0.35` | Paridade PPAP/Logistics |
| GRR acceptance (negócio) | `%GRR < 10%` excelente · `< 30%` aceitável | AIAG — **domínio** GF-009 semantics |
| Signal readiness | `ready` quando estudo completo | Loader honesto |

**Disciplina ARC-001:** thresholds Z.22/Z.23 **não** alterados; acceptance GRR vive em **semântica de domínio**, não em promotion bypass.

---

## 10. Hubs propostos (Centro de Comando)

| hub_key | Componente | Center |
|---------|------------|--------|
| `gage_registry` | `GageRegistryHub` | `msa_gage_registry_ops` |
| `grr_variable` | `GrrStudyHub` | `msa_grr_ops` |
| `attribute` | `AttributeStudyHub` | `msa_attribute_ops` |
| `bias_linearity` | `BiasLinearityHub` | `msa_bias_ops` |
| `calibration` | `CalibrationHub` | `msa_calibration_ops` |
| `cognitive` | `CognitiveMsaHub` | `msa_cognitive_ops` |

Estados permitidos: **REAL_DATA** · **INSUFFICIENT_DATA** · **NOT_IMPLEMENTED**

---

## 11. Sequência Greenfield proposta

| GF | Entrega | Estado |
|----|---------|--------|
| **GF-007** | Discovery + este plano | ✅ **Concluído** |
| **GF-008** | Runtime Foundation (`msa_native` inactivo) | ✅ **Concluído** |
| **GF-009** | Core Domain (schema + workflow + APIs) | ✅ **Concluído** |
| **GF-010** | Signal Loader Z.20 real | ✅ **Concluído** |
| **GF-011** | Promotion + CC Z.22/Z.23 | ✅ **Concluído** |
| **GF-012** | Pilot Enablement (dataset operacional) | ✅ **Concluído** |
| **GF-013** | Homologation OFF/ON + BASELINE-MSA-v1.0 | ✅ **Concluído** |
| **INC-046** (concluída) | Registo BASELINE-SYSTEM v1.3 | ✅ **Concluído** |

---

## 12. Política de engenharia (herdada SYSTEM v1.2 + ARC-001)

- Alterações a `quality_native`, `ppap_native`, `logistics_native` → **INC obrigatória**
- MSA greenfield → **GF-008…013** numerado
- Pós-homologação → registo **INC-046** (índice mestre)
- Proibido mock/synthetic em runtime MSA
- **`npm run test:architecture-conformance`** verde antes e depois de cada GF
- Reutilizar engines Quality via **import em módulo MSA novo** — **proibido** editar ficheiros Quality LOCKED

---

## 13. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Confundir MSA com SPC/Cp-Cpk | Semântica dedicada `msaCoreSemantics.js` |
| Conflito payload quality/ppap/msa | Campos isolados `msa_cognitive_runtime` |
| Scope creep Linearity/Stability v1 | NOT_IMPLEMENTED honesto · EV futuro |
| Alterar Quality engine inline | Novo `msaGrrEngine.js` wrapper |
| Três sub-runtimes no perfil quality | Cross-domain regression (modelo GF-006) |
| Violar ARC-001 thresholds | Golden manifest update só via INC |

---

## 14. Critérios de sucesso GF-013 (preview)

```
MSA_RUNTIME           = LOCKED
MSA_SIGNAL_LOADER     = LOCKED
MSA_PROMOTION         = LOCKED
MSA_COMMAND_CENTER    = LOCKED
MSA_BASELINE_v1.0     = LOCKED
ZERO_FAKE_DATA        = YES
ZERO_RUNTIME_REGRESSION = YES
NO_CROSS_DOMAIN_REGRESSION = YES
BASELINE_QUALITY_v1.1  = PRESERVED
BASELINE_PPAP_v1.0    = PRESERVED
BASELINE_SYSTEM_v1.2   = PRESERVED
ARC_001_CONFORMANT    = YES
```

---

## 15. Referências

| Documento | Relação |
|-----------|---------|
| [GF-007-MSA-DISCOVERY.md](GF-007-MSA-DISCOVERY.md) | Evidência audit |
| [PPAP-ARCHITECTURE-v1.0.md](PPAP-ARCHITECTURE-v1.0.md) | Modelo espelho |
| [GF-000-PPAP-DISCOVERY.md](GF-000-PPAP-DISCOVERY.md) | Metodologia discovery |
| [BASELINE-QUALITY-v1.1.md](BASELINE-QUALITY-v1.1.md) | Parent domain |
| [BASELINE-PPAP-v1.0.md](BASELINE-PPAP-v1.0.md) | Sibling runtime |
| [EVOLUTION-TAXONOMY-v1.0.md](EVOLUTION-TAXONOMY-v1.0.md) | Taxonomia GF/EV/INC |
| [ARC-001-ARCHITECTURE-CONFORMANCE.md](ARC-001-ARCHITECTURE-CONFORMANCE.md) | Guardião arquitectural |

---

## 16. Decisão arquitectural v1.0

**Aprovado para GF-008:**

1. Sub-runtime **`msa_native`** aditivo no eixo Qualidade  
2. Payload isolado **`msa_cognitive_runtime`**  
3. Schema MSA dedicado (GF-009) — **não** sobrecarregar `quality_inspections`  
4. Bridges read-only para Quality, PPAP, Supplier  
5. Sequência GF-008 → GF-013 **integral** (Cenário A)  
6. **INC-046** apenas para registo SYSTEM pós-homologação  

**Registo concluído:** **GF-007 Discovery** — próximo passo **GF-008 Runtime Foundation**.
