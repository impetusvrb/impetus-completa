# Ishikawa Runtime Architecture v1.0 — Plano Greenfield (Documental)

**GF:** GF-014 (discovery) → GF-015…GF-020 (implementação proposta)  
**Data:** 2026-07-17  
**Tipo:** plano arquitectural read-only  
**Pré-requisitos:** [BASELINE-SYSTEM-v1.3.md](../architecture/BASELINE-SYSTEM-v1.3.md) · [BASELINE-QUALITY-v1.1.md](BASELINE-QUALITY-v1.1.md) · [BASELINE-PPAP-v1.0.md](BASELINE-PPAP-v1.0.md) · [BASELINE-MSA-v1.0.md](../architecture/BASELINE-MSA-v1.0.md) · [GF-014-ISHIKAWA-DISCOVERY.md](GF-014-ISHIKAWA-DISCOVERY.md)  
**Estado:** `ISHIKAWA_ARCHITECTURE_v1.0 = APPROVED_FOR_GF-015` (documental)

---

## 1. Declaração

Este documento define a **arquitectura alvo** do domínio **Ishikawa (Fishbone / Cause Analysis)** no IMPETUS como **greenfield cognitivo** sobre baselines homologados — **sem alterar** `quality_native` LOCKED, `ppap_native` LOCKED, `msa_native` LOCKED, `logistics_native` LOCKED, SurfaceCapabilities, Promotion homologada ou CentroComando shell.

Ishikawa nasce como **sub-runtime `ishikawa_native`** no **eixo Qualidade**, espelhando a disciplina **GF-000→GF-006 (PPAP)** e **GF-007→GF-013 (MSA)**.

---

## 2. Contexto de discovery (GF-014)

| Facto | Implicação arquitectural |
|-------|-------------------------|
| Zero domínio Ishikawa | Greenfield total de produto |
| `qualityRootCauseEngine.js` (22 LOC) | GF-016 **novo** módulo importa funções puras — **não editar** Quality LOCKED |
| `ishikawa_canvas` shell hint | GF-018 UI real; ignorar placeholder |
| `ppap_submissions.ishikawa_analysis_ref` | GF-017 bridge read-only |
| NCR/CAPA workflows existentes | GF-016 correlation_id + FK nullable |
| `quality.capa_engine` homologado | Coexistência; blocos `ishikawa.*` sibling |
| Pro-Ação / 5W2H docs | **Fora scope** v1.0 — domínio industrial NC/CAPA |

**Flags discovery:**

```
ISHIKAWA_ENGINE_EXISTS          = YES (PARTIAL — dead code)
ISHIKAWA_SERVICE_EXISTS         = NO
ISHIKAWA_API_EXISTS             = NO
ISHIKAWA_SCHEMA_EXISTS          = NO
ISHIKAWA_TABLES_EXIST           = NO
ISHIKAWA_DATA_EXIST             = NO
ISHIKAWA_RUNTIME_EXISTS         = NO
CENÁRIO                         = A (greenfield integral)
```

---

## 2.1 Runtime Foundation (GF-015)

Estado após GF-015 — fundação arquitectural **inactiva**, espelhando disciplina GF-008 (MSA):

| Componente | Path | Estado |
|------------|------|--------|
| Feature flags | `config/phaseIshikawaNativeFeatureFlags.js` | Default OFF |
| Block pack Z.19 | `registry/ishikawaCognitiveBlockPack.js` | 12 blocos · inactive |
| Pilot Z.19 | `pilot/ishikawaCockpitPilot.js` | Skip flags OFF |
| Loader Z.20 | `domains/ishikawa/bridge/ishikawaTenantSignalLoader.js` | **Stub** · NO_DATASET · **sem BD** |
| Descriptor | `domains/ishikawa/runtime/ishikawaRuntimeDescriptor.js` | `ishikawa_native` |
| Foundation | `domains/ishikawa/runtime/ishikawaFoundationAttachment.js` | Sempre anexa inactivo |
| Z.22 | `renderPromotion/ishikawa/ishikawaControlledRenderRuntime.js` | `promotion_applied: false` **sempre** |
| Z.23 | `domains/ishikawa/runtime/ishikawaCockpitConsolidationRuntime.js` | `consolidation_applied: false` **sempre** |
| Facade | `facade/cognitiveRuntimeFacade.js` | Branch aditivo pós-MSA |
| Domain registry | `domainFoundation/registry/cognitiveDomainRegistry.js` | Domínio `ishikawa` · foundation |
| FE registry | `frontend/.../ishikawaNativeCockpitRegistry.js` | OFF · hubs vazios |
| FE promotion | `IshikawaNativeCockpitPromotion.jsx` | `return null` |

**Flags GF-015:**

```
ISHIKAWA_RUNTIME_EXISTS          = YES
ISHIKAWA_RUNTIME_ACTIVE          = NO
ISHIKAWA_SIGNAL_LOADER_EXISTS    = YES (structural stub)
ISHIKAWA_PROMOTION_EXISTS        = YES (foundation inactive)
ISHIKAWA_CONSOLIDATION_EXISTS    = YES (foundation inactive)
LEGACY_ENGINE_IMPORTED           = NO
NO_LEGACY_DEPENDENCIES           = YES
```

**Artefato legado:** `qualityRootCauseEngine.js` permanece **LEGACY_REUSABLE_ALGORITHM** — migração avaliada em **GF-016**, sem import nesta fase.

**Payload `/dashboard/me` (foundation):**

```json
{
  "ishikawa_cognitive_runtime": {
    "runtime_id": "ishikawa_native",
    "cockpit_mode": "off",
    "inactive": true,
    "promotion_applied": false,
    "consolidation_applied": false,
    "binding_ratio": 0,
    "pilot_blocks": ["ishikawa.investigation_registry", "…×12"],
    "bound_blocks": [],
    "missing_blocks": []
  },
  "ishikawa_signal_loader": {
    "inactive": true,
    "signal_readiness": "NO_DATASET",
    "binding_ratio": 0
  },
  "ishikawa_cognitive_centers": []
}
```

**Evidência:** [GF-015-ISHIKAWA-RUNTIME-FOUNDATION.md](GF-015-ISHIKAWA-RUNTIME-FOUNDATION.md)

---

## 2.2 Core Domain (GF-016)

Estado após GF-016 — **SSOT operacional** Ishikawa (sem activação cognitiva):

| Componente | Path | Estado |
|------------|------|--------|
| Migration | `migrations/ishikawa_core_domain_migration.sql` | 14 tabelas normalizadas |
| Semantics | `domains/ishikawa/semantics/ishikawaCoreSemantics.js` | Status + workflow SSOT |
| Algoritmos | `domains/ishikawa/core/ishikawaRootCauseAlgorithms.js` | `buildIshikawaTemplate` + `fiveWhysChain` migrados |
| Workflow | `domains/ishikawa/workflow/ishikawaWorkflowEngine.js` | Transições explícitas |
| Services | `domains/ishikawa/services/*` | CRUD + fishbone + acções |
| API | `routes/ishikawa.js` → `/api/ishikawa` | REST estrutural |
| Runtime GF-015 | Signal loader real GF-017 | `inactive=true`, read-only binding |

**Flags GF-016:**

```
ISHIKAWA_SCHEMA_EXISTS          = YES
ISHIKAWA_DOMAIN_EXISTS          = YES
ISHIKAWA_WORKFLOW_EXISTS        = YES
ISHIKAWA_API_EXISTS             = YES
ISHIKAWA_RUNTIME_ACTIVE         = NO
LEGACY_ALGORITHMS_MIGRATED      = YES
LEGACY_ENGINE_IMPORTED          = NO
```

**Entidades:** RootCauseInvestigation · InvestigationTeam · InvestigationEvidence · FishboneDiagram · FishboneCategory · FishboneCause · FiveWhyAnalysis · CorrectiveAction · PreventiveAction · VerificationResult · InvestigationApproval · AttachedDocument

**Categorias 6M fixas:** MAN · MACHINE · METHOD · MATERIAL · MEASUREMENT · MOTHER_NATURE

**Integração futura (nullable):** `quality_inspection_id` · `ncr_workflow_instance_id` · `capa_workflow_instance_id` · `ppap_submission_id` · `msa_study_id` · `supplier_ref` · `part_ref`

**Evidência:** [GF-016-ISHIKAWA-CORE-DOMAIN.md](GF-016-ISHIKAWA-CORE-DOMAIN.md)

---

## 2.3 Signal Loader (GF-017)

Estado após GF-017 — **observação read-only** do Core Domain (sem promotion/consolidation):

| Componente | Path | Estado |
|------------|------|--------|
| Tenant loader | `domains/ishikawa/bridge/ishikawaTenantSignalLoader.js` | Read-only · 14 tabelas GF-016 |
| Binding runtime | `domains/ishikawa/bridge/ishikawaSignalBindingRuntime.js` | Z.20 · 12 blocos |
| Block bridge | `domains/ishikawa/bridge/ishikawaBlockBridge.js` | Binding estrutural |
| Logger | `domains/ishikawa/bridge/ishikawaSignalLoaderLogger.js` | `IMPETUS_ISHIKAWA_SIGNAL_DIAGNOSTICS` |
| Foundation | `domains/ishikawa/runtime/ishikawaFoundationAttachment.js` | `runIshikawaSignalBinding` |
| Promotion Z.22 | Inalterado | `promotion_applied: false` |
| Consolidation Z.23 | Inalterado | `consolidation_applied: false` |

**Flags GF-017:**

```
ISHIKAWA_SIGNAL_LOADER_EXISTS       = YES
ISHIKAWA_SIGNAL_LOADER_ACTIVE       = YES
ISHIKAWA_SIGNAL_LOADER_READONLY     = YES
ISHIKAWA_RUNTIME_ACTIVE             = NO
ISHIKAWA_SSOT_USED                  = YES
SEMANTICS_DUPLICATED                = NO
WORKFLOW_DUPLICATED                 = NO
DATABASE_MUTATIONS                  = NO
```

**Blocos pilot (12):** investigation_registry · root_cause_repository · fishbone_analysis · five_whys · corrective_actions · preventive_actions · evidence_repository · investigation_workflow · contextual_root_cause_ai · organizational_learning · recurrence_monitor · ishikawa_narrative

**binding_ratio:** cobertura estrutural `bound_blocks / pilot_blocks` — sem thresholds, sem promotion.

**Integrações futuras:** refs nullable observadas em `cross_domain.integration_refs`; ausência registada em `integration_absent` — nunca falha.

**Payload `/dashboard/me` (signal loader activo, runtime inactivo):**

```json
{
  "ishikawa_cognitive_runtime": {
    "runtime_id": "ishikawa_native",
    "inactive": true,
    "promotion_applied": false,
    "consolidation_applied": false,
    "foundation_status": "signal_loader_active",
    "binding_ratio": 0.0
  },
  "ishikawa_signal_loader": {
    "inactive": true,
    "signal_readiness": "NO_DATASET | partial | ready",
    "binding_ratio": 0.0,
    "pilot_blocks": ["…×12"],
    "bound_blocks": [],
    "missing_blocks": []
  }
}
```

**Evidência:** [GF-017-ISHIKAWA-SIGNAL-LOADER.md](GF-017-ISHIKAWA-SIGNAL-LOADER.md)

---

## 2.4 Promotion & Centro de Comando (GF-018)

Estado após GF-018 — **infraestrutura Z.22/Z.23** (promotion condicionada ao binding):

| Componente | Path | Estado |
|------------|------|--------|
| Z.22 supervisor | `renderPromotion/ishikawa/ishikawaRenderPromotionSupervisor.js` | Gate ≥ 0.50 |
| Z.22 runtime | `renderPromotion/ishikawa/ishikawaControlledRenderRuntime.js` | Passivo |
| Z.23 supervisor | `domains/ishikawa/cockpit/ishikawaConsolidationSupervisor.js` | Gate ≥ 0.35 + Z.22 |
| Z.23 consolidator | `domains/ishikawa/cockpit/ishikawaCockpitConsolidator.js` | 10 centers |
| Z.23 runtime | `domains/ishikawa/runtime/ishikawaCockpitConsolidationRuntime.js` | Passivo |
| FE registry | `frontend/.../ishikawaNativeCockpitRegistry.js` | 10 hubs |
| FE promotion | `IshikawaNativeCockpitPromotion.jsx` | Gate `promotion_applied` |
| CentroComando | `CentroComando.jsx` | Mount condicional |

**Flags GF-018:**

```
ISHIKAWA_PROMOTION_EXISTS            = YES
ISHIKAWA_PROMOTION_GATE_EXISTS       = YES
ISHIKAWA_CONSOLIDATION_EXISTS        = YES
ISHIKAWA_CC_INTEGRATION_EXISTS       = YES
PROMOTION_DEPENDS_ON_BINDING         = YES
PROMOTION_RECALCULATES_BINDING       = NO
ISHIKAWA_RUNTIME_ACTIVE              = NO (sem dataset homologado)
```

**Gate Z.22:** `binding_ratio >= 0.50` — bloqueio `INSUFFICIENT_BINDING` abaixo do limiar.

**Centers (10):** investigation_overview · fishbone · five_why · corrective_actions · preventive_actions · evidence · approvals · recurrence · organizational_learning · narrative

**Evidência:** [GF-018-ISHIKAWA-PROMOTION.md](GF-018-ISHIKAWA-PROMOTION.md)

---

## 2.5 Pilot Enablement (GF-019)

Estado após GF-019 — **massa operacional real** alimentando Signal Loader sem alterar arquitectura Z.19→Z.23:

| Componente | Path | Estado |
|------------|------|--------|
| Pilot scenario | `domains/ishikawa/services/ishikawaPilotScenario.js` | 10 investigações ARCHIVED |
| Core APIs | `/api/ishikawa/investigations/*` | Workflow completo |
| Signal Loader Z.20 | `bridge/ishikawaSignalBindingRuntime.js` | **Inalterado** · observa BD real |
| Promotion Z.22 | `renderPromotion/ishikawa/*` | **Inalterado** · gate ≥ 0.50 |
| Consolidação Z.23 | `runtime/ishikawaCockpitConsolidationRuntime.js` | **Inalterado** · 10 centers |
| Testes | `tests/ishikawa/runIshikawaPilotEnablementTests.js` | Cenários A/B/C |

**Flags GF-019:**

```
PILOT_DATASET_CREATED              = YES
ISHIKAWA_SIGNAL_READINESS          = ready (pós-pilot)
BOUND_BLOCKS                       = 12/12
BINDING_RATIO                      = 1.00 (target)
PROMOTION_APPLIED                  = YES (flags ON + gate natural)
CONSOLIDATION_APPLIED              = YES
COGNITIVE_CENTERS_REGISTERED       = YES (10)
BYPASS_USED                        = NO
ISHIKAWA_RUNTIME_ACTIVE            = YES (com flags ON + dataset)
```

**Cenários piloto:** DIM · ASM · WLD · CAL · OPR · SUP · CNT · ENV · PRC · REC

**Pipeline validado:**

```
runIshikawaPilotScenario()  →  runIshikawaSignalBinding()  →  Z.22 Promotion  →  Z.23 Consolidação
```

**Evidência:** [GF-019-ISHIKAWA-PILOT-ENABLEMENT.md](GF-019-ISHIKAWA-PILOT-ENABLEMENT.md) · [ISHIKAWA-PILOT-DATASET.md](ISHIKAWA-PILOT-DATASET.md) · [ISHIKAWA-BINDING-REPORT.md](ISHIKAWA-BINDING-REPORT.md)

---

## 2.6 Homologation (GF-020)

Estado após GF-020 — **runtime homologado e congelado** (Certification Mode):

| Componente | Valor homologado |
|------------|------------------|
| Runtime OFF | `binding_ratio=0` · `promotion_applied=false` · cockpit oculto |
| Runtime ON | `binding_ratio=1.0` · 12/12 blocos · 10 centers · Z.19→Z.23 |
| Legacy | `LEGACY_ENGINE_IMPORTED=NO` · algoritmos em `domains/ishikawa/core/` |
| SSOT | Core Domain única fonte · loader observa · Promotion passiva |
| Baseline | **BASELINE-ISHIKAWA-v1.0** LOCKED |
| SYSTEM | **BASELINE-SYSTEM v1.3** PRESERVED (registo INC-047) |

**Flags GF-020:**

```
ISHIKAWA_RUNTIME_HOMOLOGATED       = YES
OFF_SCENARIO_VALIDATED             = YES
ON_SCENARIO_VALIDATED              = YES
PROMOTION_AUTOMATIC                = YES
NO_BYPASS                          = YES
ARC_001_CONFORMANCE                = PASS
BASELINE_ISHIKAWA_v1.0             = LOCKED
BASELINE_SYSTEM_v1.3               = PRESERVED
```

**Instrumento:** `tests/ishikawa/runIshikawaRuntimeHomologationTests.js` · `npm run test:ishikawa-runtime-homologation`

**Evidência:** [GF-020-ISHIKAWA-HOMOLOGATION.md](GF-020-ISHIKAWA-HOMOLOGATION.md) · [ISHIKAWA-HOMOLOGATION-REPORT.md](ISHIKAWA-HOMOLOGATION-REPORT.md) · [BASELINE-ISHIKAWA-v1.0.md](BASELINE-ISHIKAWA-v1.0.md)

---

## 2.7 Architecture Registration (INC-047)

Estado após INC-047 — **registo oficial no índice mestre** (sem alteração de runtime):

| Campo | Valor |
|-------|-------|
| INC | INC-047 — Architecture Registration Only |
| SYSTEM | BASELINE-SYSTEM **v1.4** |
| Runtime registado | `ishikawa_native` (11º homologado) |
| Código alterado | **NO** |
| Impacto comportamental | **Nenhum** |

**Evidência:** [INC-047-ARCHITECTURE-REGISTRATION.md](INC-047-ARCHITECTURE-REGISTRATION.md) · [BASELINE-SYSTEM-v1.4.md](../architecture/BASELINE-SYSTEM-v1.4.md)

---

## 3. Posicionamento no sistema

### 3.1 Relação com baselines LOCKED

```
BASELINE-SYSTEM v1.3 (LOCKED)
├── quality_native (LOCKED)       ← não modificar cadeia Z.19→Z.23
├── ppap_native (LOCKED)          ← bridge ishikawa_analysis_ref
├── msa_native (LOCKED)           ← osso «measurement» adjacente
└── ishikawa_native (GREENFIELD)  ← novo ramo aditivo GF-015…020
```

### 3.2 Eixo e perfis (proposta)

| Campo | Valor proposto |
|-------|----------------|
| **PARENT_AXIS** | `quality` / `eixo_qualidade` |
| **RUNTIME_ID** | `ishikawa_native` |
| **COCKPIT_MODE** | `ishikawa_native` |
| **FUNCTIONAL_AREA** | `quality` (sem novo eixo cadastral v1.0) |
| **PERFIS elegíveis** | `manager_quality`, `coordinator_quality`, `supervisor_quality`, `inspector_quality` |

> Ishikawa **não** requer novo `functional_area` na v1.0 — evita alteração a `dashboardProfileResolver` LOCKED salvo INC futura.

---

## 4. Modelo de domínio Cause Analysis

### 4.1 Entidades greenfield (GF-016 — schema proposto)

| Entidade | Propósito |
|----------|-----------|
| `ishikawa_analyses` | Estudo causa raiz (efeito, estado, autor, correlation) |
| `ishikawa_bones` | Ossos 6M (`method`, `machine`, `material`, `manpower`, `measurement`, `environment`) |
| `ishikawa_causes` | Causas por osso (texto, evidência, severidade) |
| `ishikawa_five_whys` | Cadeia 5 Porquês opcional ligada à análise |
| `ishikawa_links` | Ligações NC/CAPA/inspection/PPAP/FMEA |

### 4.2 Semântica 6M (canónica)

Alinhada ao engine existente (`ISHIKAWA` constant):

| Osso | Chave | Exemplos industriais |
|------|-------|---------------------|
| Método | `method` | Procedimento, instrução trabalho |
| Máquina | `machine` | Equipamento, ferramenta |
| Material | `material` | MP, lote, especificação |
| Mão-de-obra | `manpower` | Treino, fadiga, turno |
| Medição | `measurement` | Calibração, MSA, instrumento |
| Meio ambiente | `environment` | Temperatura, limpeza, layout |

### 4.3 Workflow proposto

| Estado | Transições | Evento |
|--------|------------|--------|
| `draft` | submit → `in_analysis` | `ishikawa.analysis.started` |
| `in_analysis` | complete → `root_identified` | `ishikawa.root_hypothesis.set` |
| `root_identified` | link_capa → `capa_linked` | `ishikawa.capa.linked` |
| `capa_linked` | close → `closed` | `ishikawa.analysis.closed` |
| `closed` | — | — |

Reutilizar padrão `approval_universal` **apenas** se gate de aprovação causa raiz for requisito tenant — default v1.0 workflow dedicado.

---

## 5. Cadeia arquitectural alvo

Espelha PPAP/MSA; ramo Ishikawa **aditivo** na facade:

```
Cadastro (perfil quality + contexto NC/inspeção)
      │
      ▼
GF-015  Runtime Foundation (ishikawa_native inactivo · flags OFF)
      │
      ▼
GF-016  Core Domain (schema + services + /api/ishikawa)
      │
      ▼
GF-017  Signal Loader Z.20 (bridge NC · CAPA · inspections · PPAP ref)
      │
      ▼
GF-018  Promotion Z.22 + CC Z.23 (IshikawaCanvas · CauseAnalysisHub)
      │
      ▼
GF-019  Pilot Enablement (massa real · binding_ratio → 1.0)
      │
      ▼
GF-020  Homologation OFF/ON + BASELINE-ISHIKAWA-v1.0
      │
      ▼
INC-047  Registration BASELINE-SYSTEM v1.4 (11 runtimes)
```

### 5.1 Payload canónico (proposta)

```json
{
  "ishikawa_cognitive_runtime": {
    "runtime_id": "ishikawa_native",
    "cockpit_mode": "ishikawa_native",
    "inactive": true,
    "binding_ratio": 0,
    "promotion_applied": false,
    "consolidation_applied": false
  },
  "ishikawa_cognitive_centers": []
}
```

> **Não alterar** payloads `quality_cognitive_runtime`, `ppap_cognitive_runtime`, `msa_cognitive_runtime` homologados.

---

## 6. Block pack cognitivo (proposta GF-015)

| Block ID | Categoria | Layer | Binding |
|----------|-----------|-------|---------|
| `ishikawa.cause_analysis` | cause_analysis | operational | `ishikawa.analyses` |
| `ishikawa.nc_correlation` | nc_correlation | operational | `quality.nc_events` (read-only) |
| `ishikawa.five_whys` | five_whys | management | `ishikawa.five_whys` |
| `ishikawa.capa_handoff` | capa_handoff | management | `quality.capa_workflow` (read-only) |
| `ishikawa.fmea_context` | fmea_context | strategic | `quality.fmea_rank` (read-only) |
| `ishikawa.effectiveness` | effectiveness | management | `ishikawa.closed_analyses` |

**Centers CC propostos (GF-018):**

| Center key | Hub | Blocos dominantes |
|------------|-----|-------------------|
| `ishikawa_cause_ops` | Cause Analysis Ops | cause_analysis, nc_correlation |
| `ishikawa_root_cause` | Root Cause Lab | five_whys, fmea_context |
| `ishikawa_capa_bridge` | CAPA Bridge | capa_handoff, effectiveness |

---

## 7. Integrações read-only (bridges)

| Fonte LOCKED | Bridge | Uso |
|--------------|--------|-----|
| `quality_inspections` | GF-017 loader | Efeito / contexto NC |
| `impetus_quality_workflow_instance` (NCR) | GF-016 FK | Origem estudo |
| `impetus_quality_workflow_instance` (CAPA) | GF-016 FK | Destino acções |
| `ppap_submissions.ishikawa_analysis_ref` | GF-017 | Resolução ref PPAP |
| `qualityFmeaRuntime.rankFmeaRows` | GF-016 advisory | Priorização causas |
| `msa_native` studies | GF-017 optional | Evidência osso measurement |
| `quality.capa_engine` Z.23 | Coexistência | Sem merge de payloads |

---

## 8. Frontend alvo (GF-018)

| Componente | Path proposto | Substitui |
|------------|---------------|-----------|
| `IshikawaCanvas.jsx` | `frontend/src/domains/ishikawa/cockpit/` | Placeholder `shells/IshikawaCanvas` |
| `CauseAnalysisHub.jsx` | idem | — |
| `IshikawaNativeCockpitPromotion.jsx` | `frontend/src/cognitiveRuntime/cockpit/` | Paridade PPAP/MSA |
| `ishikawaNativeCockpitRegistry.js` | idem | Lazy hubs |

**Design System:** tokens Industrial 4.0; canvas escuro; ossos 6M em mono; sem fundo claro.

---

## 9. Reutilização vs greenfield (matriz GF-014)

| Artefacto | Classificação | GF que consome |
|-----------|---------------|----------------|
| `buildIshikawaTemplate()` | PARTIAL | GF-016 (novo ficheiro semantics) |
| `fiveWhysChain()` | PARTIAL | GF-016 |
| NCR/CAPA workflows | READY_TO_REUSE | GF-016, GF-017 |
| `quality_inspections` | READY_TO_REUSE | GF-017 |
| PPAP ref field | PARTIAL | GF-017 |
| Stack ppap/msa greenfield | READY_TO_REUSE | GF-015→020 metodologia |
| UI engine placeholder | PLACEHOLDER | GF-018 substitui |
| Pro-Ação 5W2H | LEGACY | Fora scope v1.0 |

---

## 10. Flags de feature (proposta GF-015)

| Variável ambiente | Default | Gate |
|-------------------|---------|------|
| `IMPETUS_ISHIKAWA_COGNITIVE_RUNTIME_ENABLED` | `off` | Z.19 foundation |
| `IMPETUS_ISHIKAWA_RENDER_PROMOTION` | `off` | Z.22 |
| `IMPETUS_ISHIKAWA_NATIVE_COCKPIT` | `off` | Z.23 CC |

---

## 11. Homologação (GF-020 — critérios propostos)

| Cenário | Tenant | Esperado |
|---------|--------|----------|
| **OFF** | Qualquer | `binding_ratio=0`, `inactive=true`, CC null |
| **ON** | Piloto | Promoção automática, ≥3 centers, bridge NC real |
| Regressão | Referência | 10 runtimes + PPAP + MSA + ARC-001 verde |

---

## 12. Sequência GF + INC

| GF/INC | Entrega | Baseline impactado |
|--------|---------|-------------------|
| GF-014 | Discovery | **Nenhum** (este doc) |
| GF-015 | Foundation | Nenhum (inactivo) |
| GF-016 | Core Domain | Novo domínio apenas |
| GF-017 | Signal Loader | Nenhum LOCKED |
| GF-018 | Promotion + CC | Nenhum LOCKED |
| GF-019 | Pilot | Dados piloto tenant |
| GF-020 | Homologation | `BASELINE-ISHIKAWA-v1.0` |
| INC-047 | Registration | **SYSTEM v1.4** (11 runtimes) |

---

## 13. Riscos arquitecturais

| Risco | Mitigação |
|-------|-----------|
| Editar `qualityRootCauseEngine.js` LOCKED | Copiar funções puras para `domains/ishikawa/` |
| Confundir Pro-Ação com Ishikawa industrial | Scope documental explícito; APIs separadas |
| EV «só UI» no governance hub | Rejeitado — não cumpre paridade PPAP/MSA nem loader real |
| Duplicar CAPA workflow | Ishikawa **analisa**; CAPA **executa** — handoff explícito |
| Reabrir quality_native Z.22/Z.23 | Sub-runtime aditivo na facade |

---

## 14. Débitos referenciados

Ver backlog **P-ISH-001…P-ISH-014** em [GF-014-ISHIKAWA-DISCOVERY.md](GF-014-ISHIKAWA-DISCOVERY.md).

---

## 15. Decisão arquitectural

**APROVADO para GF-015** — Ishikawa como **11.º sub-runtime cognitivo** (pós-registo INC-047) no eixo Qualidade, com greenfield integral e bridges read-only aos siblings PPAP, MSA e quality_native.

**Próximo passo:** GF-015 — Ishikawa Runtime Foundation, preservando **BASELINE-SYSTEM v1.3** e **ARC-001** intactos.
