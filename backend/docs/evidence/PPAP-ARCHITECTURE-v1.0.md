# PPAP Runtime Architecture v1.0 — Plano Greenfield (Documental)

**GF:** GF-000 (discovery) → GF-001…GF-006 (implementação)  
**Data:** 2026-07-16  
**Tipo:** plano arquitectural read-only  
**Pré-requisitos:** [BASELINE-SYSTEM-v1.1.md](BASELINE-SYSTEM-v1.1.md) · [BASELINE-QUALITY-v1.1.md](BASELINE-QUALITY-v1.1.md) · [GF-000-PPAP-DISCOVERY.md](GF-000-PPAP-DISCOVERY.md)  
**Estado:** `PPAP_BASELINE_v1.0 = LOCKED` · `PPAP_ARCHITECTURE_v1.0 = HOMOLOGATED` (GF-006)

---

## 1. Declaração

Este documento define a **arquitectura alvo** do domínio **PPAP** no IMPETUS como **greenfield cognitivo** sobre o baseline homologado — **sem alterar** `quality_native` LOCKED, `logistics_native` LOCKED, SurfaceCapabilities, Promotion Quality/Logistics ou CentroComando shell.

PPAP nasce como **sub-runtime `ppap_native`** no **eixo Qualidade**, espelhando a disciplina INC-036→043 (Logistics) mas com escopo metodológico (AIAG PPAP) em vez de área funcional completa.

---

## 2. Contexto de discovery (GF-000)

| Facto | Implicação arquitectural |
|-------|-------------------------|
| Zero código PPAP | Greenfield total; sem migração legacy |
| Receipts + inspections existem | GF-002 bridge read-only |
| Capability/SPC engines existem | GF-002 bind dimensional/capability studies |
| `approval_universal` workflow | GF-001 reutilizar kind `approval` para PSW gate |
| Supplier intelligence parcial | GF-002 cross-bind; GF-004 hub honesto se vazio |
| Shells SupplierQuality inexistentes | GF-004 implementar UI real, não activar placeholders |

---

## 3. Posicionamento no sistema

### 3.1 Relação com baselines LOCKED

```
BASELINE-SYSTEM v1.1 (LOCKED)
├── quality_native (LOCKED)     ← não modificar cadeia homologada
├── logistics_native (LOCKED)   ← bridge read-only only
└── ppap_native (GREENFIELD)    ← novo ramo aditivo GF-001…005
```

### 3.2 Eixo e perfis (proposta)

| Campo | Valor proposto |
|-------|----------------|
| **PARENT_AXIS** | `quality` / `eixo_qualidade` |
| **RUNTIME_ID** | `ppap_native` |
| **COCKPIT_MODE** | `ppap_native` |
| **FUNCTIONAL_AREA** | `quality` (sem novo eixo cadastral inicial) |
| **PERFIS elegíveis** | `manager_quality`, `coordinator_quality`, `supervisor_quality`, `inspector_quality`; extensão futura `manager_engineering` |

> PPAP **não** requer novo `functional_area` na v1.0 do greenfield — evita alteração a `dashboardProfileResolver` LOCKED salvo INC futura.

---

## 4. Modelo de domínio PPAP (AIAG)

### 4.1 Entidades greenfield (GF-002 — schema)

| Entidade | Propósito |
|----------|-----------|
| `ppap_packages` | Pacote por parte/fornecedor/nível |
| `ppap_elements` | 18 elementos AIAG (status por elemento) |
| `ppap_documents` | Anexos / metadados (sem blob na v1 — referência externa) |
| `ppap_submissions` | Histórico submissão → revisão → aprovação |
| `ppap_psw_records` | Part Submission Warrant |
| `ppap_run_at_rate` | Validação produção (ligação futura production) |

### 4.2 Elementos AIAG mapeados (referência)

| # | Elemento | Fonte IMPETUS existente |
|---|----------|-------------------------|
| 1 | Design records | **GREENFIELD** |
| 2 | Engineering change | **GREENFIELD** |
| 3 | Customer approval | `approval_universal` workflow |
| 4 | Design FMEA | FMEA API parcial |
| 5 | Process flow | **GREENFIELD** |
| 6 | Process FMEA | FMEA API parcial |
| 7 | Control plan | Overlap SPC/governance |
| 8 | MSA studies | **GREENFIELD** (GF futuro MSA) |
| 9 | Dimensional results | `quality_inspections` + dimensional telemetry |
| 10 | Material tests | **GREENFIELD** |
| 11 | Initial process studies | `qualityProcessCapabilityEngine` |
| 12 | Qualified lab docs | **GREENFIELD** |
| 13 | AAR | **GREENFIELD** |
| 14 | Sample production | `quality_inspections` parcial |
| 15 | Standard samples | **GREENFIELD** |
| 16 | Checking aids | **GREENFIELD** |
| 17 | Customer-specific | JSONB `metadata` |
| 18 | PSW | `ppap_psw_records` + approval workflow |

---

## 5. Cadeia arquitectural alvo

Espelha Logistics/Quality; ramo PPAP **aditivo** na facade:

```
Cadastro (perfil quality + part/supplier context)
        ↓
GET /api/dashboard/me
        ↓
dashboardSurfaceCapabilities (fail-closed — sem bypass)
        ↓
Runtime resolution
  quality_native (LOCKED) + ppap_native (when flags ON)
        ↓
Z.19 ppapCockpitPilot + ppapCognitiveBlockPack
        ↓
Z.20 ppapTenantSignalLoader
  ├── ppap_* tables (primary)
  ├── bridge: raw_material_receipts, quality_inspections
  ├── bridge: supplier_quality_metrics, raw_material_lots
  └── bridge: logistics supplier_delivery (read-only)
        ↓
Z.21 ppapOperationalMetricsAdapter (opcional v1)
        ↓
Z.22 ppapControlledRenderPromotion
        ↓
Z.23 ppapCockpitConsolidation → ppap_cognitive_centers
        ↓
PpapNativeCockpitPromotion (GF-004)
        ↓
Hubs: PpapSubmissionHub · PpapElementsHub · PpapSupplierHub · PpapApprovalHub
        ↓
Adapters frontend (runtime-only presentation)
        ↓
APIs /api/quality-ppap/* (GF-002+) + bridges existentes
```

**Regra:** payload canónico **`ppap_cognitive_runtime`** (≠ `specialized_cockpit_runtime` Quality, ≠ `logistics_cognitive_runtime`).

---

## 6. Inventário técnico planeado (GF-001…004)

### 6.1 Backend (paths propostos — não existem ainda)

| Camada | Path proposto |
|--------|---------------|
| Block pack Z.19 | `cognitiveRuntime/registry/ppapCognitiveBlockPack.js` |
| Pilot Z.19 | `cognitiveRuntime/pilot/ppapCockpitPilot.js` |
| Signal loader Z.20 | `cognitiveRuntime/domains/ppap/bridge/ppapTenantSignalLoader.js` |
| Block bridge | `cognitiveRuntime/domains/ppap/bridge/ppapBlockBridge.js` |
| Cross-domain | `cognitiveRuntime/domains/ppap/bridge/ppapCrossDomainSignals.js` |
| Promotion Z.22 | `cognitiveRuntime/renderPromotion/ppap/*` |
| Consolidation Z.23 | `cognitiveRuntime/domains/ppap/cockpit/*` |
| Foundation | `cognitiveRuntime/domains/ppap/runtime/ppapFoundationAttachment.js` |
| Facade branch | `cognitiveRuntimeFacade.js` — branch `PPAP-Z.19→Z.23` aditivo |
| API | `routes/qualityPpap.js` → `/api/quality-ppap` |
| Domain services | `domains/quality/ppap/*` ou `domains/ppap/*` (decisão GF-001) |

### 6.2 Frontend (paths propostos)

| Camada | Path proposto |
|--------|---------------|
| Registry CC | `cognitiveRuntime/cockpit/ppapNativeCockpitRegistry.js` |
| Promotion | `features/dashboard/centroComando/PpapNativeCockpitPromotion.jsx` |
| Hubs | `domains/quality/ppap/cockpit/*Hub.jsx` |
| Adapter | `domains/quality/ppap/cockpit/ppapRuntimeHubAdapter.js` |
| Workspace route | `/app/quality/operational?view=ppap` (query — sem App.jsx churn inicial) |

### 6.3 Block pack inicial (proposta Z.19)

| Block ID | Semântica |
|----------|-----------|
| `ppap.submission_center` | Pacotes activos / pendentes |
| `ppap.elements_tracker` | 18 elementos AIAG |
| `ppap.dimensional_evidence` | Bridge inspections + dimensional |
| `ppap.capability_evidence` | Bridge SPC/capability engine |
| `ppap.supplier_package` | Bridge supplier score + receipts |
| `ppap.psw_gate` | PSW + approval_universal |
| `ppap.run_at_rate` | NOT_IMPLEMENTED v1 (placeholder honesto) |
| `ppap.apqp_link` | FMEA/APQP parcial |
| `ppap.narrative` | Resumo executivo PPAP |

---

## 7. Integração cross-domain (read-only bridges)

```
                    ┌─────────────────┐
                    │   Fornecedor    │
                    │ supplier_metrics│
                    │ warehouse_supp. │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
      raw_material_    quality_         logistics
         receipts      inspections    supplier_delivery
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                    ppapTenantSignalLoader
                             │
                             ▼
                      ppap_packages
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         approval_      SPC/Cpk       production
         universal       engine        (run-at-rate
         workflow                      future)
```

| Domínio | Tipo integração | Altera baseline? |
|---------|-----------------|------------------|
| Quality | Bridge read-only | **NO** |
| Logistics | Bridge read-only | **NO** |
| Production | Event/read futuro | **NO** (v1) |
| Engineering | Perfil only v1 | **NO** |
| Supply | Dados fornecedor | **NO** |

---

## 8. Flags de activação (proposta)

| Env | Fase | Default GF-001 |
|-----|------|----------------|
| `IMPETUS_PPAP_COGNITIVE_RUNTIME_ENABLED` | Z.19 | `off` |
| `IMPETUS_PPAP_RENDER_PROMOTION` | Z.22 | `off` |
| `IMPETUS_PPAP_NATIVE_COCKPIT` | Z.23 / CC | `off` |
| `IMPETUS_PPAP_RUNTIME_FOUNDATION` | Foundation attach | `on` (metadados only) |

Paridade com Logistics INC-038 — foundation ON, runtime inactivo até homologação.

---

## 9. Sequência Greenfield oficial

| GF | Nome | Entregáveis | Critério |
|----|------|-------------|----------|
| **GF-000** | Discovery | GF-000 + este doc | `READ_ONLY=YES` ✅ |
| **GF-001** | Runtime Foundation | Block pack, pilot, descriptor, facade branch, flags, testes foundation | Payload inactivo; zero CC ✅ |
| **GF-002** | **Core Domain** | Schema, entidades, APIs, workflow PPAP, semântica AIAG/VDA | Dados persistidos; sem loader real ✅ |
| **GF-003** | Signal Loader | Loader real consumindo GF-002 | Fail-closed; sem mock ✅ |
| **GF-004** | Command Center | PpapNativeCockpitPromotion + hubs | Gate-driven; infra OFF ✅ |
| **GF-005** | Pilot Enablement | Massa piloto + APIs operacionais | Binding observado; sem promotion ✅ |
| **GF-006** | Homologation | `BASELINE-PPAP-v1.0.md` + activação pós-gate | Runtime validado operacionalmente |

---

## 9.1 Core Domain (GF-002 — implementado)

**Fonte única de verdade:** `backend/src/domains/ppap/semantics/ppapCoreSemantics.js`

### Entidades normalizadas

| Tabela | Entidade |
|--------|----------|
| `ppap_parts` | Part |
| `ppap_suppliers` | Supplier |
| `ppap_customers` | Customer |
| `ppap_submission_level_catalog` | Submission Level (AIAG 1–5) |
| `ppap_submissions` | PPAPSubmission |
| `ppap_psw_records` | PSW |
| `ppap_dimensional_results` | Dimensional Results |
| `ppap_material_certifications` | Material Certification |
| `ppap_capability_studies` | Capability Study (Cp/Cpk) |
| `ppap_appearance_approvals` | Appearance Approval |
| `ppap_performance_tests` | Performance Test |
| `ppap_engineering_changes` | Engineering Change |
| `ppap_approval_history` | Approval History |
| `ppap_attached_documents` | Attached Documents |

### Estados congelados (PPAPSubmission)

`DRAFT` · `UNDER_REVIEW` · `PENDING_APPROVAL` · `APPROVED` · `REJECTED` · `EXPIRED` · `SUPERSEDED`

### Workflow congelado

`DRAFT` → `SUBMISSION` → `TECHNICAL_REVIEW` → `QUALITY_REVIEW` → `APPROVAL` → `RELEASE`

Rejeição em qualquer revisão → `REJECTED`; reenvio via `resubmit` → `DRAFT`.

### APIs (`/api/ppap`)

| Método | Rota |
|--------|------|
| GET | `/submissions` |
| GET | `/submissions/:id` |
| POST | `/submissions` |
| PUT | `/submissions/:id` |
| POST | `/submissions/:id/submit` |
| POST | `/submissions/:id/approve` |
| POST | `/submissions/:id/reject` |
| GET | `/semantics` |

### Integração futura (FK nullable em `ppap_submissions`)

`quality_inspection_id` · `raw_material_lot_id` · `raw_material_receipt_id` · `fmea_study_ref` · `ishikawa_analysis_ref` · `supplier_scorecard_ref`

**Evidência:** [GF-002-PPAP-CORE-DOMAIN.md](GF-002-PPAP-CORE-DOMAIN.md)

---

## 9.2 Signal Loader (GF-003 — implementado)

**Princípio:** o domínio decide (GF-002); o runtime observa (GF-003). Semântica importada **somente** de `ppapCoreSemantics.js` — o loader não redefine estados nem workflow.

### Stack Z.20

| Camada | Componente |
|--------|------------|
| Loader | `ppapTenantSignalLoader.js` — queries `ppap_*` |
| Bridge | `ppapBlockBridge.js` — 12 blocos pilot |
| Binding | `ppapSignalBindingRuntime.js` + `buildBindingValidationReport()` |
| Attach | `ppapFoundationAttachment.js` → payload `ppap_signal_loader` |

### Métricas expostas

`binding_ratio` · `pilot_blocks` · `bound_blocks` · `missing_blocks` · `signal_readiness`

Tenant vazio → `NO_DATASET` honesto; sem mock, default ou padding.

### Runtime permanece inactivo

```
ppap_cognitive_runtime.inactive = true
ppap_cognitive_runtime.promotion_applied = false
ppap_cognitive_runtime.consolidation_applied = false
```

**Evidência:** [GF-003-PPAP-SIGNAL-LOADER.md](GF-003-PPAP-SIGNAL-LOADER.md)

---

## 9.3 Promotion & Command Center (GF-004 — implementado, gate OFF)

**Auditoria Etapa 0:** `PPAP_BINDING_RATIO = 0` · `PPAP_DATASET_STATUS = NO_DATASET` → **Cenário A**

Infraestrutura Z.22/Z.23 implementada; runtime **não activado** até massa PPAP elevar binding acima dos thresholds homologados (Z.22 ≥ 0.5 · Z.23 ≥ 0.35).

| Camada | Componente |
|--------|------------|
| Z.22 | `applyPpapControlledRenderPromotion` |
| Z.23 | `applyPpapCockpitConsolidation` |
| Frontend | `PpapNativeCockpitPromotion` + 6 hubs estruturais |
| Gate | Sem bypass · sem recálculo de binding |

**Evidência:** [GF-004-PPAP-PROMOTION.md](GF-004-PPAP-PROMOTION.md)

---

## 9.4 Pilot Enablement (GF-005 — implementado)

**Objectivo:** capacidade operacional real — **sem alterar runtime cognitivo**.

| Camada | Entrega |
|--------|---------|
| APIs | CRUD peças/fornecedores/clientes + evidências PPAP |
| Serviços | `ppapEvidenceService` · `ppapPilotScenario` |
| Validação | Cenário piloto → `APPROVED` + binding observado |

**Resultado piloto (tenant teste):**

```
binding_ratio: 0 → 1.0
bound_blocks: 12/12
signal_readiness: ready
promotion_applied: false  (não forçada nesta GF)
```

**Evidência:** [GF-005-PPAP-PILOT-ENABLEMENT.md](GF-005-PPAP-PILOT-ENABLEMENT.md)

**Próximo:** GF-006 — homologação + activação controlada pós-gate.

---

## 9.5 Runtime Homologation (GF-006 — implementado, baseline LOCKED)

**Objectivo:** homologar oficialmente `ppap_native` com validação dual OFF/ON e congelar **BASELINE-PPAP-v1.0**.

### Disciplina homologada

| Modo | Validação |
|------|-----------|
| **Runtime OFF** | Tenant vazio / abaixo threshold → `inactive=true` · sem bypass |
| **Runtime ON** | Binding ≥ threshold + flags → promoção automática Z.19→Z.23 · sem `force_*` |

### Resultado homologação

```
Pré-activação:  binding=1.0 · readiness=ready · promotion=false · inactive=true
Pós-activação:  promotion=true · consolidation=true · inactive=false · cockpit=ppap_native
Cross-domain:   8 domínios homologados preservados · Quality+PPAP coexistem
Testes:         test:ppap-runtime-homologation 9/9
Baseline:       BASELINE-PPAP-v1.0 LOCKED
SYSTEM index:   v1.1 PRESERVED — registo via INC-045 recomendado
```

**Evidência:** [GF-006-PPAP-RUNTIME-HOMOLOGATION.md](GF-006-PPAP-RUNTIME-HOMOLOGATION.md) · [BASELINE-PPAP-v1.0.md](BASELINE-PPAP-v1.0.md)

**Registo sistémico:** **INC-045** ✅ — [BASELINE-SYSTEM-v1.2.md](BASELINE-SYSTEM-v1.2.md) · [EVOLUTION-TAXONOMY-v1.0.md](EVOLUTION-TAXONOMY-v1.0.md)

---

## 10. Política de engenharia (herdada SYSTEM v1.1)

- Alterações a `quality_native`, `logistics_native`, SurfaceCapabilities, QualityNativeCockpitPromotion → **INC obrigatória**
- PPAP greenfield → **GF-* numerado**; após GF-006 homologado, registo no índice mestre via **INC transversal** (ex. SYSTEM v1.2)
- Proibido mock/synthetic em runtime PPAP (política charts + cognitive honesty)
- Reutilizar APIs existentes via **adapters/bridges**, não duplicar `quality_inspections` writes

---

## 11. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Duplicar inspeções/recebimentos | Loader read-only; PPAP referencia IDs existentes |
| Conflito com `quality_native` payload | Campo dedicado `ppap_cognitive_runtime` |
| Shells placeholder (SupplierQuality) | GF-004 implementa componentes reais |
| Massa de dados vazia | UI `INSUFFICIENT_DATA`; binding ratio honesto |
| Scope creep APQP/MSA | GF-006 documenta NOT_IMPLEMENTED; MSA = GF separado |

---

## 12. Critérios de sucesso GF-006 (homologados)

```
PPAP_RUNTIME           = LOCKED
PPAP_SIGNAL_LOADER     = LOCKED
PPAP_PROMOTION         = LOCKED
PPAP_COMMAND_CENTER    = LOCKED
PPAP_BASELINE_v1.0     = LOCKED
ZERO_FAKE_DATA         = YES
ZERO_RUNTIME_REGRESSION = YES
NO_CROSS_DOMAIN_REGRESSION = YES
BASELINE_QUALITY_v1.1  = PRESERVED
BASELINE_LOGISTICS_v1.1 = PRESERVED
BASELINE_SYSTEM_v1.1   = PRESERVED (INC-045 para v1.2)
```

---

## 13. Referências

| Documento | Relação |
|-----------|---------|
| [GF-000-PPAP-DISCOVERY.md](GF-000-PPAP-DISCOVERY.md) | Evidência audit |
| [LOGISTICS-RUNTIME-ARCHITECTURE-v1.0.md](LOGISTICS-RUNTIME-ARCHITECTURE-v1.0.md) | Padrão espelho |
| [INC-037-LOGISTICS-RUNTIME-PLAN.md](INC-037-LOGISTICS-RUNTIME-PLAN.md) | Metodologia plano |
| [BASELINE-QUALITY-v1.1.md](BASELINE-QUALITY-v1.1.md) | Parent domain LOCKED |
| [INC-044-SYSTEM-CONSOLIDATION.md](INC-044-SYSTEM-CONSOLIDATION.md) | Taxonomia GF vs INC |

---

## 14. Decisão arquitectural v1.0

**Aprovado para GF-001:**

1. Sub-runtime **`ppap_native`** aditivo no eixo Qualidade  
2. Payload isolado **`ppap_cognitive_runtime`**  
3. Schema PPAP dedicado (GF-002) — **não** sobrecarregar `quality_inspections`  
4. Bridges read-only para receipts, inspections, supplier, logistics  
5. Sequência GF-001 → GF-006 **integral** (concluída — baseline LOCKED)

**Registo concluído:** **INC-045** — PPAP no índice mestre [BASELINE-SYSTEM-v1.2.md](BASELINE-SYSTEM-v1.2.md).
