# GF-000 — PPAP Discovery & Architecture Audit (READ-ONLY)

**Data:** 2026-07-16  
**Tipo:** auditoria read-only (sem implementação)  
**Pré-requisito:** [BASELINE-SYSTEM-v1.1.md](BASELINE-SYSTEM-v1.1.md) (LOCKED)  
**Plano arquitectural:** [PPAP-ARCHITECTURE-v1.0.md](PPAP-ARCHITECTURE-v1.0.md)  
**Metodologia:** espelha INC-036 (Logistics) / INC-023 (Quality) — descobrir antes de construir

---

## Declaração de escopo

| Proibido | Estado |
|----------|--------|
| Alteração de código | **ZERO** |
| Alteração de CSS | **ZERO** |
| Alteração de banco | **ZERO** |
| Alteração de APIs / runtimes / promotion / SurfaceCapabilities | **ZERO** |
| PM2 restart / build / mocks | **ZERO** |

---

## Critérios obrigatórios de encerramento

| Flag | Valor |
|------|-------|
| `READ_ONLY` | **YES** |
| `CODE_CHANGED` | **NO** |
| `CSS_CHANGED` | **NO** |
| `PM2_RESTART` | **NO** |
| `DATABASE_CHANGED` | **NO** |
| `BASELINE_SYSTEM_v1.1` | **PRESERVED** |

---

## Resumo executivo

**PPAP (Production Part Approval Process) não existe no IMPETUS** — nem como módulo, runtime, API, tabela, página ou widget.

A pesquisa em `backend/src/`, `frontend/src/`, migrations SQL e runtime cognitivo retornou **zero ocorrências** de identificadores `ppap`, `PPAP`, `apqp`, `psw`, `run_at_rate`, `part_approval`, `production_part`, `initial_sample` ou `IMDS` em código de produção.

O que **existe** e é **reutilizável** para um futuro PPAP situa-se no **ecossistema Quality + Supply/Receiving**, parcialmente ligado a Logística:

- Recebimento de MP (`raw_material_receipts`, APIs `/quality-intelligence/receipts`)
- Inspeções (`quality_inspections`)
- Capacidade de processo / dimensional (`qualityProcessCapabilityEngine`, telemetria dimensional)
- Fornecedores (`supplier_quality_metrics`, `quality.supplier_intelligence`, scorecard)
- Workflow genérico de aprovação (`approval_universal` em `impetus_quality_workflow_definition`)
- Ponte logística → qualidade (`logistics.lot.received` event contract)

**Conclusão:** GF-001 pode arrancar como **greenfield puro**, reutilizando blocos adjacentes — **sem risco de duplicar um PPAP paralelo oculto**.

---

## Etapa 1 — Pesquisa textual (codebase)

### Termos auditados

`PPAP`, `ppap`, `ppap_`, `production_part`, `part_approval`, `APQP`, `apqp`, `PSW`, `psw`, `run_at_rate`, `initial_sample`, `Submission`, `IMDS`, `AIAG`, `Capability`, `Dimensional`, `Run at Rate`, `Approval Package`, `Sample Submission`

### Resultado por camada

| Camada | Matches PPAP-específicos | Notas |
|--------|--------------------------|-------|
| `backend/src/**/*.js` | **0** | — |
| `frontend/src/**/*.{js,jsx}` | **0** | — |
| `backend/migrations/*.sql` | **0** | — |
| `backend/src/models/*.sql` | **0** | — |
| Ficheiros `*ppap*` / `*PPAP*` | **0** | Glob vazio |
| `backend/docs/evidence/*.md` | **15+** | Apenas roadmap/baseline (NÃO IMPLEMENTADO) |
| `package-lock.json` / `.vite/deps` | falsos positivos | `@smithy/credential-provider-imds`, react-router `submission` |

---

## Etapa 2 — Flags obrigatórias (Backend)

| Flag | Valor | Evidência |
|------|-------|-----------|
| `PPAP_ENGINE_EXISTS` | **NO** | Nenhum engine/service PPAP |
| `PPAP_SERVICE_EXISTS` | **NO** | Nenhum `*ppap*Service.js` |
| `PPAP_API_EXISTS` | **NO** | Nenhuma rota `/ppap` ou `/quality-ppap` |
| `PPAP_SCHEMA_EXISTS` | **NO** | Nenhum JSON schema / DTO PPAP |
| `PPAP_TABLES_EXIST` | **NO** | Nenhuma tabela `ppap_*` |
| `PPAP_DATA_EXIST` | **NO** | Zero registos PPAP |

---

## Etapa 3 — Inventário Backend (adjacente reutilizável)

### Serviços existentes (Quality — não PPAP)

| Artefacto | Path | Relevância PPAP |
|-----------|------|-----------------|
| Quality intelligence | `services/qualityIntelligenceService.js` | Recebimentos, inspeções, lotes |
| SPC / capability | `domains/quality/governance/spc/qualityProcessCapabilityEngine.js` | Estudos de capacidade (elemento PPAP) |
| Dimensional ingest | `domains/quality/telemetry/qualityTelemetryDimensional.js` | Metadados dimensionais |
| Supplier scorecard | `domains/quality/governance/supplier/qualitySupplierScorecard.js` | Score fornecedor |
| Supplier scoring engine | `domains/quality/cognitive/supplier/qualitySupplierScoringEngine.js` | Z.20 bridge existente |
| Inbound analytics | `domains/quality/governance/supplier/qualityInboundQualityAnalytics.js` | Lotes recebidos |
| FMEA runtime | `domains/quality/governance/risk/qualityFmeaRuntime.js` | APQP adjacente |
| Root cause / Ishikawa template | `domains/quality/governance/capa/qualityRootCauseEngine.js` | Template 6M (sem UI) |
| Workflow dinâmico | `domains/quality/workflows/qualityDynamicWorkflowEngine.js` | Orquestração CAPA/NC |
| Universal workflow (BD) | `impetus_quality_workflow_definition` | **`approval_universal`** reutilizável |

### Rotas API (Quality — sem PPAP)

| Prefixo | Ficheiro | Endpoints relevantes |
|---------|----------|---------------------|
| `/api/quality-intelligence` | `routes/qualityIntelligence.js` | `GET/POST /receipts`, `GET/POST /inspections`, `/nc-capa-summary` |
| `/api/quality-governance` | `routes/qualityGovernance.js` | SPC, drift, FMEA rank, supplier scorecard, audit |
| `/api/quality-telemetry` | `routes/qualityTelemetry.js` | `POST /ingest/dimensional` |
| `/api/quality-operational` | `routes/qualityOperational.js` | Runtime operacional |
| `/api/quality-cognitive` | `routes/qualityCognitive.js` | Packs assistivos |
| `/api/internal/quality-universal` | `routes/internal/qualityUniversalRuntime.js` | Workflows internos |

### Runtime cognitivo Quality (LOCKED — não alterar em GF-000)

| Componente | Path | PPAP |
|------------|------|------|
| Block pack | `registry/qualityCognitiveBlockPack.js` | 10 blocos quality — **nenhum PPAP** |
| Signal loader | `bridge/qualityTenantSignalLoader.js` | Fontes: inspections, supplier_metrics, lots, receipts |
| Engine bridge | `bridge/qualityEngineBridgeRegistry.js` | Mapeamento blocos Z.20 |
| Promotion | `renderPromotion/quality/*` | Quality CC homologado |
| Consolidation | `cockpitConsolidation/quality/*` | 6 centers Z.23 |
| Facade branch | `facade/cognitiveRuntimeFacade.js` | `quality_native` LOCKED |

### Logística cruzada (read-only bridge)

| Componente | Path | Relevância |
|------------|------|------------|
| Supplier delivery bridge | `logisticsCrossDomainSignals.js` | `supplier_quality_metrics`, receipts |
| SupplierDeliveryHub | `frontend/.../SupplierDeliveryHub.jsx` | UI logística fornecedor |
| Event contract | `events/subscribe/logistics.lot.received.v1.json` | Recebimento → Quality |

---

## Etapa 4 — Banco de dados

### Tabelas PPAP dedicadas

```
PPAP_TABLE_COUNT = 0
PPAP_RECORDS     = 0
```

### Tabelas adjacentes (reutilização potencial)

| Tabela | Registos (global BD prod.) | FK principais | Uso PPAP potencial |
|--------|----------------------------|---------------|-------------------|
| `raw_materials` | **0** | `company_id` | Cadastro peça/MP |
| `raw_material_receipts` | **0** | `raw_material_id`, `company_id` | Recebimento inicial |
| `raw_material_lots` | **1** | `company_id` | Rastreio lote |
| `raw_material_lot_usage` | **1** | `lot_id`, `company_id` | Uso em produção |
| `raw_material_lot_events` | **0** | `lot_id` | Bloqueio/liberação |
| `supplier_quality_metrics` | **0** | `company_id` | Métricas fornecedor |
| `quality_inspections` | **9** | `raw_material_id`, `product_id` | Inspeção / amostra |
| `impetus_quality_workflow_definition` | **5** | — | incl. `approval_universal` |
| `impetus_quality_workflow_instance` | **24** | `workflow_def_id` | NC/CAPA/PDCA/approval |

### Flags BD

| Flag | Valor |
|------|-------|
| `PPAP_FOREIGN_KEYS` | **N/A** (sem tabelas PPAP) |
| `PPAP_RELATIONS` | **N/A** |
| `PPAP_ADJACENT_FKS` | **YES** — cadeia `raw_materials` → `receipts` → `inspections` → `lots` |

---

## Etapa 5 — Frontend

| Flag | Valor | Evidência |
|------|-------|-----------|
| `PPAP_WIDGET_EXISTS` | **NO** | — |
| `PPAP_PAGE_EXISTS` | **NO** | — |
| `PPAP_HUB_EXISTS` | **NO** | — |
| `PPAP_ADAPTER_EXISTS` | **NO** | — |

### Componentes adjacentes

| Componente | Path | Classificação |
|------------|------|---------------|
| `QualityGovernanceHub` | `domains/quality/governance/` | REAL — sem view PPAP |
| `QualitySupplierIntelligence` | `domains/quality/cognitive/` | REAL — scorecard runtime |
| `SupplierDeliveryHub` | `domains/logistics/cockpit/` | REAL — logística, não PPAP |
| `SpcPanel` / adapters SPC | `domains/quality/` | REAL — capability adjacente |
| UI engine shells | `qualityGovernanceUiEngine.js` | **PLACEHOLDER** — `load_hint: domains/quality/shells/SupplierQuality` — **directório `shells/` não existe** |
| Ishikawa shell hint | idem | **PLACEHOLDER** — `IshikawaCanvas` inexistente |

### Rotas Quality existentes

- `/app/quality/operational` (+ `?view=governance`, `?view=ncr`, inspection, kiosk)
- **Nenhuma** rota `/app/quality/ppap` ou query `view=ppap`

---

## Etapa 6 — Runtime cognitivo PPAP

| Flag | Valor |
|------|-------|
| `PPAP_RUNTIME_EXISTS` | **NO** |
| `PPAP_BLOCK_PACK_EXISTS` | **NO** |
| `PPAP_SIGNAL_LOADER_EXISTS` | **NO** |
| `PPAP_PROMOTION_EXISTS` | **NO** |
| `PPAP_CONSOLIDATOR_EXISTS` | **NO** |

### Verificações transversais

| Registo | PPAP |
|---------|------|
| `cognitiveBlockDomains.js` | Eixo `quality` — categorias ideais sem PPAP |
| `dashboardProfiles.js` | Sem perfil `*_ppap` |
| `moduleRegistry.js` | Sem módulo `ppap` |
| `qualityNativeCockpitRegistry.js` | governance / telemetry / cognitive — sem PPAP |
| Z.19–Z.23 facade | Branch `quality_native` only — sem PPAP |

---

## Etapa 7 — Integração cross-domain

### Diagrama de dependências (estado actual)

```
Fornecedor (warehouse_suppliers / supplier_name texto)
      │
      ▼
Recebimento ── raw_material_receipts API (Quality)
      │         logistics.receiving_flow bridge (Logistics Z.20)
      ▼
Inspeção inicial ── quality_inspections (9 registos tenant)
      │
      ├── Capacidade / Dimensional ── SPC + telemetry dimensional (parcial)
      ├── Fornecedor score ── supplier_quality_metrics (vazio) + supplier_intelligence block
      │
      ▼
[PPAP PACKAGE] ── NÃO EXISTE
      │
      ▼
Produção ── raw_material_lot_usage / production_native (sem ligação PPAP)
      │
Engenharia ── perfis manager_engineering (sem API PPAP/FAI dedicada)
PCP / Compras ── supply_native GREENFIELD
Laboratório ── colapsado em quality profiles
```

### Domínios dependentes para PPAP futuro

| Domínio | Dependência | Estado actual |
|---------|-------------|---------------|
| **Qualidade** | Inspeções, CAPA, SPC, approval workflow | **LOCKED v1.1** — consumir via bridge |
| **Logística** | Recebimento, supplier delivery hub | **LOCKED v1.1** — read-only bridge |
| **Produção** | Run-at-rate, validação linha | Runtime LOCKED; sem API PPAP |
| **Engenharia** | FAI, desenhos, APQP docs | Perfil existe; **sem módulo** |
| **Compras/Supply** | Fornecedor, contrato | **GREENFIELD** |
| **Laboratório** | Ensaios dimensionais | Overlap quality inspections |

---

## Etapa 8 — Classificação de reutilização

| Artefacto | Classificação | Notas |
|-----------|---------------|-------|
| `approval_universal` workflow | **READY_TO_REUSE** | Estados pending/approved/rejected |
| `qualityProcessCapabilityEngine` | **READY_TO_REUSE** | Cp/Cpk — estudo capacidade PPAP |
| `qualityTelemetryDimensional` + ingest API | **READY_TO_REUSE** | Dimensional reports |
| `qualitySupplierScorecard` / scoring engine | **READY_TO_REUSE** | Parte fornecedor PPAP |
| `GET/POST /quality-intelligence/receipts` | **READY_TO_REUSE** | Recebimento MP |
| `quality_inspections` + APIs | **PARTIAL** | Inspeção genérica ≠ PPAP Level 1–5 package |
| `quality.supplier_intelligence` block + loader binding | **PARTIAL** | Sem massa de dados |
| `POST /quality-governance/intelligence/fmea/rank` | **PARTIAL** | APQP adjacente, sem UI |
| `buildIshikawaTemplate()` | **PARTIAL** | Engine only |
| `qualityGovernanceUiEngine` shell hints | **PLACEHOLDER** | Ficheiros não existem |
| `SupplierDeliveryHub` (Logistics) | **PARTIAL** | UI logística, não submission PPAP |
| `logistics.lot.received` event | **READY_TO_REUSE** | Trigger recebimento |
| Documentação baseline PPAP | **GREENFIELD** | Só mencionado como futuro |
| Código legado PPAP | **LEGACY: NONE** | Nenhum encontrado |

---

## Etapa 9 — Débitos PPAP

| ID | Tipo | Descrição |
|----|------|-----------|
| **P-PPAP-001** | Runtime | Ausência total de `ppap_native` / block pack PPAP |
| **P-PPAP-002** | Schema | Sem tabelas `ppap_submissions`, `ppap_elements`, `ppap_documents` |
| **P-PPAP-003** | API | Sem CRUD submission / PSW / run-at-rate |
| **P-PPAP-004** | UI | Sem hub, página, widget ou adapter PPAP |
| **P-PPAP-005** | Dados | `raw_material_receipts` = 0; `supplier_quality_metrics` = 0 |
| **P-PPAP-006** | Integração | Sem ligação formal inspection → PPAP package → approval |
| **P-PPAP-007** | APQP | FMEA API sem UI; sem timeline APQP |
| **P-PPAP-008** | IMDS / PSW | Inexistente |
| **P-PPAP-009** | CC | Sem promotion PPAP no CentroComando |
| **P-PPAP-010** | Shells | `SupplierQuality`, `IshikawaCanvas` declarados em UI engine mas **não implementados** |

---

## Etapa 10 — Referências históricas (auditorias prévias)

| Documento | Conclusão PPAP |
|-----------|----------------|
| [INC-023-QUALITY-ECOSYSTEM-AUDIT.md](INC-023-QUALITY-ECOSYSTEM-AUDIT.md) | `QUALITY_MODULE_NOT_IMPLEMENTED` |
| [BASELINE-QUALITY-v1.1.md](BASELINE-QUALITY-v1.1.md) | **NÃO IMPLEMENTADO** |
| [INC-034-QUALITY-HOMOLOGATION.md](INC-034-QUALITY-HOMOLOGATION.md) | Greenfield pós-baseline |
| [BASELINE-SYSTEM-v1.1.md](BASELINE-SYSTEM-v1.1.md) | Greenfield Quality |

**Consistência:** GF-000 confirma auditorias anteriores — **sem surpresas ocultas no código**.

---

## Etapa 11 — Roadmap proposto (GF-001 → GF-005)

Sequência recomendada (padrão Quality/Logistics, organizado como Greenfield):

| GF | Entrega | Escopo |
|----|---------|--------|
| **GF-001** | PPAP Runtime Foundation | Block pack Z.19, descriptor `ppap_native`, flags default OFF, facade branch aditivo |
| **GF-002** | PPAP Signal Loader | Loader real BD: submissions (novas tabelas), bridge receipts/inspections/supplier |
| **GF-003** | PPAP Promotion | Z.22→Z.23 chain threshold-agnostic; payload `ppap_cognitive_runtime` |
| **GF-004** | PPAP Command Center | Hub(s) CC ou view Quality; estados honestos REAL/INSUFFICIENT/NOT_IMPLEMENTED |
| **GF-005** | PPAP Homologation | Read-only audit + `BASELINE-PPAP-v1.0.md` |

**Justificativa:** não existe código reaproveitável suficiente para encurtar a sequência. Componentes adjacentes entram como **bridges read-only** em GF-002, não como atalho que omita foundation.

**Decisão arquitectural pré-GF-001:** ver [PPAP-ARCHITECTURE-v1.0.md](PPAP-ARCHITECTURE-v1.0.md) — sub-runtime `ppap_native` no eixo Qualidade (não altera `quality_native` LOCKED).

---

## Metodologia

1. Grep recursivo em `backend/src`, `frontend/src`, migrations, models  
2. Glob `*ppap*` / `*PPAP*`  
3. Leitura de block packs, routes, UI engines, INC-023  
4. Contagem read-only BD (sem INSERT/UPDATE/DDL)  
5. Verificação runtime Z.19–Z.23 e registries  
6. Geração exclusiva de documentação em `backend/docs/evidence/`

---

## Conclusão

O IMPETUS **não possui PPAP implementado** em nenhuma camada. A disciplina GF-000 confirma que **GF-001 pode iniciar sem medo de duplicação**.

A construção deve **reutilizar** recebimentos, inspeções, capability/SPC, supplier scorecard e workflow `approval_universal`, mas o **pacote PPAP AIAG** (elements 1–18, PSW, levels, run-at-rate) é **100% greenfield**.

**Próximo passo:** GF-001 — PPAP Runtime Foundation (modo implementação controlada, baseline SYSTEM v1.1 intacto).
