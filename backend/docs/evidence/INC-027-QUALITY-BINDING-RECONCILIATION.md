# INC-027 — Reconciliação dos Gates Z.20 → Z.23 para Qualidade

**Data:** 2026-07-15  
**Tipo:** auditoria read-only (sem alteração de thresholds, promotion ou frontend)  
**Pré-requisito:** INC-026 (`binding_ratio ≈ 0.375`, promoção bloqueada)

---

## Resposta objectiva (Etapa 7)

| Opção | Verdict |
|-------|---------|
| **A) threshold alto** | **Secundário** — 0.375 < 0.5 impede promoção, mas não explica *porque* só 3/8 |
| **B) binding incompleto** | **SIM — causa directa do ratio** |
| **C) registry inconsistente** | **SIM — causa estrutural** |
| **D) runtime incompleto** | **Parcial** — engines existem; **fonte de sinais Z.20 incompleta** |

### Verdict consolidado

```
PRIMARY_CAUSE = C + B
  → Registry Z.19/Z.20 (10 blocos cognitivos) ≠ ecossistema Quality (~78 ficheiros / hubs)
  → Signal loader Z.20 liga apenas `proposals` (proxy NC), não quality_inspections / supplier / telemetria real
  → Apenas engine_ok=true conta no ratio → 3/8 típico em tenant real
```

**Não recomendado (INC-027):** baixar threshold global 0.5→0.35.  
**Recomendado (INC futura):** reconciliar registry + signal loader com módulos já implementados.

---

## Inventário — de onde vêm os «8 blocos»

| Camada | Ficheiro | Regra |
|--------|----------|-------|
| Pacote oficial | `qualityCognitiveBlockPack.js` | **10** `QUALITY_PILOT_BLOCK_IDS` |
| Composição Z.19 | `contextualCompositionEngine.js` L19 | `MAX_QUALITY_VISIBLE = 8` — top 8 por rank |
| Bridge Z.20 | `qualityEngineBridgeRegistry.js` | **10** handlers (mesmos IDs) |
| Ratio Z.20 | `bindingValidationReport.js` L5-29 | `binding_ratio = blocks_bound / total_blocks` (8 no shadow enriquecido) |

### Os 10 blocos do pacote piloto (IDs canónicos)

| # | block_id | Label |
|---|----------|-------|
| 1 | `quality.nc_center` | Centro de Não Conformidades |
| 2 | `quality.capa_engine` | Motor CAPA |
| 3 | `quality.spc_monitor` | Monitor SPC / drift |
| 4 | `quality.audit_governance` | Governança de Auditorias |
| 5 | `quality.supplier_intelligence` | Inteligência de Fornecedores |
| 6 | `quality.contextual_quality_ai` | IA Contextual |
| 7 | `quality.quality_narrative` | Narrativa Executiva |
| 8 | `quality.process_stability` | Estabilidade de Processo |
| 9 | `quality.nonconformity_heatmap` | Heatmap NC |
| 10 | `quality.recurrence_analysis` | Análise de Reincidência |

**Nota:** Os «8» do ratio **não** são inspection/telemetry/governance/supplier/traceability/cognitive/rollout como hubs UI — são estes **block_ids** cognitivos, truncados a 8 na composição.

---

## Etapa 2 — Estado de binding (tenant real — produção)

Telemetria INC-026 / PM2: **`blocks_bound: 3`, `blocks_empty: 5`, `binding_ratio: 0.375`** sobre **8** blocos compostos.

### Tabela por bloco (8 compostos — cenário típico `manager_quality`)

Ranking: top 8 de 10 elegíveis (`manager_quality` = tier `management`, todos os 10 passam authority). Ordem aproximada por `operationalWeightResolver` — os 2 excluídos do top-8 são tipicamente `quality.audit_governance` e `quality.quality_narrative` (menor score composto).

| block_id | Composição (top-8) | Bridge Z.20 | Status binding | Motivo |
|----------|-------------------|-------------|----------------|--------|
| `quality.nc_center` | IN | `bindNcCenter` | **BOUND** | Sempre `ok:true` via proxy `proposals` |
| `quality.capa_engine` | IN | `bindCapaEngine` | **BOUND** | Sempre `ok:true` (estimativa a partir NC) |
| `quality.nonconformity_heatmap` | IN | `bindNonconformityHeatmap` | **BOUND** / NOT_BOUND | BOUND se `sector_breakdown.length > 0`; senão `bound_empty` |
| `quality.spc_monitor` | IN | `bindSpcMonitor` | **NOT_BOUND** | Exige `process_values.length ≥ 8` — loader devolve semanas de proposals (often <8) |
| `quality.process_stability` | IN | `bindProcessStability` | **NOT_BOUND** | Exige `process_values.length ≥ 10` |
| `quality.supplier_intelligence` | IN | `bindSupplierIntelligence` | **NOT_BOUND** | `supplier_rows` **sempre `[]`** no loader |
| `quality.recurrence_analysis` | IN | `bindRecurrenceAnalysis` | **NOT_BOUND** / BOUND | Exige `recurrence_records.length ≥ 2` |
| `quality.contextual_quality_ai` | IN | `bindContextualQualityAi` | **IGNORED*** | Invocado 2.ª passagem; `ok:true` mas **não conta** se 1.ª passagem não produziu `bound_z20` suficiente para findings |
| `quality.audit_governance` | OUT (rank 9-10) | `bindAuditGovernance` | **MISSING** | Fora dos 8 — **não entra no ratio** apesar de engine sempre ok |
| `quality.quality_narrative` | OUT (rank 9-10) | `bindQualityNarrative` | **MISSING** | Fora dos 8 — narrativa existe mas não compõe |

\* `contextual_quality_ai`: handler retorna `ok:true`, mas depende de `_engine_context.findings` populado por outros blocos bound; com SPC/recurrence vazios, findings mínimos.

**Contagem típica 3/8:** `nc_center` + `capa_engine` + `nonconformity_heatmap` (com sectores) = **3 BOUND**.

---

## Etapa 3 — Módulos do ecossistema FORA do cálculo Z.20

| Módulo / hub (frontend) | block_id Z.20 | Conta no binding? | Motivo |
|-------------------------|---------------|-------------------|--------|
| **QualityGovernanceHub** | *(composto Z.23)* | **NO** | Hub UI; Z.23 agrega bindings, não é bloco Z.20 |
| **QualityTelemetryHub** | parcial `spc_monitor` + `process_stability` | **Parcial** | Hub não registado; telemetria real (`qualityTelemetry` API) **não alimenta** loader |
| **CognitiveQualityHub** | `contextual_quality_ai` + `quality_narrative` | **Parcial** | Narrativa often excluded top-8 |
| **QualityInspectionRuntime** | `quality.inspection_ops` | **NO** | Existe em `cognitiveBlockRegistry.js` L109; **alias→nc_center**; **sem handler** em `qualityEngineBridgeRegistry` |
| **QualityRolloutHub** | — | **NO** | Sem block_id no registry cognitivo |
| **QualitySupplierIntelligence** (UI) | `quality.supplier_intelligence` | **Registrado mas NOT_BOUND** | Engine existe; loader não carrega `supplier_rows` |
| **Rastreabilidade / raw_material_lots** | `quality.traceability_lane` | **NO** | Block em registry L140; **fora** `QUALITY_PILOT_BLOCK_IDS`; sem bridge |
| **SPC panel (governance hub)** | `quality.spc_monitor` | **Parcial** | Block existe; falha por série curta |
| **NC/CAPA APIs** (`quality_intelligence`, `quality-governance`) | proxy via `proposals` only | **Parcial** | `qualityTenantSignalLoader` **não consulta** `quality_inspections` |

---

## Etapa 4 — Exemplos de cadeia de perda

### QualityTelemetryHub

```
QualityTelemetryHub (frontend)     EXISTS
  ↓
quality_telemetry_spc (center Z.23) EXISTS
  ↓
quality.spc_monitor (block Z.20)   REGISTERED in pilot pack
  ↓
loadQualityTenantSignals           ONLY proposals weekly trend → often <8 points
  ↓
bindSpcMonitor                     ok:false → bridge_status: bound_empty
  ↓
binding_ratio                      NOT COUNTED (only bound_z20)
```

### QualitySupplierIntelligence

```
QualitySupplierIntelligence.jsx    EXISTS + API (qualityCognitive)
  ↓
quality.supplier_intelligence      IN pilot pack + bridge handler
  ↓
loadQualityTenantSignals L46       supplier_rows: []  ← HARDCODED EMPTY
  ↓
bindSupplierIntelligence           ok:false (no_supplier_data)
  ↓
NOT_BOUND
```

### Inspeções

```
QualityInspectionRuntime           EXISTS + quality_inspections table
  ↓
quality.inspection_ops             cognitiveBlockRegistry ONLY
  ↓
NOT in QUALITY_PILOT_BLOCK_IDS     (alias nc_center — não expande binding)
  ↓
NO bridge handler                  MISSING from QUALITY_BLOCK_BRIDGE_MAP
  ↓
IGNORED entirely in ratio
```

### Rollout

```
QualityRolloutHub                  EXISTS (frontend + backend orchestrator)
  ↓
No cognitive block_id              MISSING
  ↓
IGNORED
```

---

## Etapa 5 — Binding esperado com código actual

| Cenário | Ratio | Passa Z.22 (0.5)? |
|---------|-------|-------------------|
| **Tenant real (proposals proxy)** | **3/8 = 0.375** | **NO** |
| Tenant com 8+ semanas proposals + sectores + 2+ recurrence | **5–6/8 ≈ 0.625–0.75** | **YES** |
| `mock_signals` (testes Z.20/Z.23) | **6+/8 ≈ 0.75+** | **YES** |
| **Teórico máximo (10/10 todos engine_ok)** | 1.0 | YES — mas composição usa só 8 |
| **Com código actual + BD quality completa mas loader intacto** | **≤4/8** | **NO** — supplier sempre vazio; inspection/traceability never counted |

### Resposta Etapa 5

Com o código **actual** (sem alterar loader/registry), mesmo com ecossistema Quality completo:

- **Esperado realista:** **3/8 a 4/8** (37.5%–50%)
- **Não esperável:** **7/8 ou 8/8** sem reconciliar signal loader + pilot pack
- **8/8** só em testes com `mock_signals` sintéticos

---

## Etapa 6 — Tabela completa

| Bloco | Existe (ecossistema) | Registrado Z.19/Z.20 | Conta no binding (8) | Motivo |
|-------|---------------------|----------------------|----------------------|--------|
| `quality.nc_center` | YES | YES | YES → BOUND | Proxy proposals |
| `quality.capa_engine` | YES | YES | YES → BOUND | Derivado NC |
| `quality.nonconformity_heatmap` | YES | YES | YES → BOUND* | Sectores proposals |
| `quality.spc_monitor` | YES (SpcPanel, engines) | YES | YES → NOT_BOUND | min 8 process points |
| `quality.process_stability` | YES (deterioration engine) | YES | YES → NOT_BOUND | min 10 process points |
| `quality.supplier_intelligence` | YES (UI + scoring engine) | YES | YES → NOT_BOUND | loader `supplier_rows:[]` |
| `quality.recurrence_analysis` | YES | YES | YES → NOT_BOUND* | min 2 records |
| `quality.contextual_quality_ai` | YES (CognitiveQualityHub) | YES | YES → rarely BOUND | Depends on other bindings |
| `quality.audit_governance` | YES (governance APIs) | YES | **NO (rank 9-10)** | Excluído MAX_QUALITY_VISIBLE=8 |
| `quality.quality_narrative` | YES | YES | **NO (rank 9-10)** | Excluído top-8 |
| `quality.inspection_ops` | YES (InspectionRuntime) | Registry only | **NO** | Not in pilot pack; no bridge |
| `quality.traceability_lane` | YES (raw_material_lots) | Registry only | **NO** | Not in pilot pack; no bridge |
| Rollout hub | YES | NO | **NO** | No block_id |
| Telemetry hub (API) | YES | Partial (spc block) | Partial | API not wired to loader |

---

## Binding real vs esperado vs diferença

| Métrica | Valor |
|---------|-------|
| **Binding real (produção)** | **3/8 = 0.375** |
| **Binding esperado (ecossistema maduro, loader actual)** | **3–4/8 = 0.375–0.500** |
| **Binding esperado (se loader usasse quality_*)** | **6–7/8 = 0.75–0.875** |
| **Binding testes (mock_signals)** | **6+/8 ≥ 0.75** |
| **Diferença (real vs narrativa INC-024)** | **−3 a −4 blocos** — hubs existem mas não alimentam Z.20 |

---

## Ficheiros responsáveis

| Responsabilidade | Ficheiro | Linhas-chave |
|------------------|----------|--------------|
| Lista 10 blocos piloto | `backend/src/cognitiveRuntime/registry/qualityCognitiveBlockPack.js` | L20-31 |
| Cap composição 8 | `backend/src/cognitiveRuntime/composition/contextualCompositionEngine.js` | L19, L102-115 |
| Mapa bridge handlers | `backend/src/cognitiveRuntime/bridge/qualityEngineBridgeRegistry.js` | L7-58 |
| Invocação + gates engine_ok | `backend/src/cognitiveRuntime/bridge/qualityBlockBridgeInvoker.js` | L39-195, L310-322 |
| **Signal loader (gap principal)** | `backend/src/cognitiveRuntime/bridge/qualityTenantSignalLoader.js` | L10-59, **L46 `supplier_rows:[]`** |
| Cálculo ratio | `backend/src/cognitiveRuntime/observability/bindingValidationReport.js` | L5-29 |
| Enrichment shadow | `backend/src/cognitiveRuntime/bridge/shadowEnrichmentPipeline.js` | L43-58 |
| Gates Z.21/Z.22 | `enrichPromotionSupervisor.js`, `renderPromotionSupervisor.js` | min 0.5 |
| Blocks registry extra (não piloto) | `backend/src/cognitiveRuntime/registry/cognitiveBlockRegistry.js` | L108-150 inspection, traceability |
| Centers Z.23 (downstream) | `backend/src/cognitiveRuntime/cockpitConsolidation/quality/*` | Agregam bindings já computados |

---

## Causa raiz

1. **Desalinhamento registry ↔ ecossistema:** O motor Z.20 mede **10 block_ids cognitivos** (8 na composição), não os **hubs/widgets** visíveis (Governance, Telemetry, Inspection, Rollout). Módulos maduros (inspection, traceability, rollout) **não participam** do ratio.

2. **Signal loader incompleto:** `loadQualityTenantSignals` usa exclusivamente **`proposals`** como proxy NC. Não carrega:
   - `quality_inspections`
   - scorecards fornecedor
   - séries telemetria industrial
   - lotes / rastreabilidade

3. **Critério strict `engine_ok`:** `bound_empty` (graceful) **não conta** — penaliza supplier/SPC/stability mesmo com engines implementados.

4. **Truncagem top-8:** `audit_governance` (sempre bindable) e `quality_narrative` frequentemente **excluídos** da composição — perdendo 2 bindings «fáceis».

5. **Threshold 0.5:** Consequência aritmética de (1–4) — **sintoma**, não causa primária.

---

## Recomendação técnica (INC futura — não implementada aqui)

### Prioridade 1 — Signal loader (causa B)

Estender `qualityTenantSignalLoader.js` para:

- `quality_inspections` → NC/SPC/recurrence reais
- `quality_supplier_scorecards` / lots → `supplier_rows`
- Telemetria → `process_values` com comprimento ≥10
- Opcional: `raw_material_lots` → traceability signals

### Prioridade 2 — Registry reconciliation (causa C)

- Adicionar `quality.inspection_ops` e `quality.traceability_lane` a `QUALITY_PILOT_BLOCK_IDS` **com handlers** em `qualityEngineBridgeRegistry`
- Ou documentar explicitamente que rollout **nunca** entrará no ratio Z.20 (decisão produto)

### Prioridade 3 — Composição

- Revisar `MAX_QUALITY_VISIBLE` vs threshold — incluir `audit_governance` no top-8 para manager tier
- Separar métrica «data_ready_ratio» de «engine_invoked_ratio» para diagnóstico

### Não fazer (confirmado INC-027)

- Reduzir globalmente `IMPETUS_Z22_MIN_BINDING_RATIO` sem reconciliar loader
- Bypass / force promotion para `manager_quality`

---

## Critérios de encerramento INC-027

| Critério | Status |
|----------|--------|
| Inventário 8/10 bindings documentado | **YES** |
| Binding real vs esperado | **YES** |
| Causa A/B/C/D respondida | **YES — B + C (primário), A secundário** |
| Sem alteração de código | **YES** |
| Recomendação técnica | **YES** |

```
INC-027_STATUS              = CLOSED
QUALITY_MODULE_EXISTS       = YES (ecossistema maduro)
QUALITY_MODULE_BOUND        = PARTIAL (3/8 via Z.20 proxy)
REGISTRY_ECOSYSTEM_GAP      = CONFIRMED
SIGNAL_LOADER_GAP           = CONFIRMED
THRESHOLD_ALONE             = NOT SUFFICIENT_EXPLANATION
```
