# INC-028 — Reconciliação dos Sinais Cognitivos da Qualidade (Z.20)

**Data:** 2026-07-16  
**Tipo:** implementação backend (signal loader apenas)  
**Pré-requisito:** INC-027 (`binding_ratio ≈ 0.375`, loader incompleto)

---

## Critérios de encerramento

| Flag | Valor |
|------|-------|
| `QUALITY_SIGNAL_RECONCILIATION` | **YES** |
| `QUALITY_BINDING_RECONCILED` | **YES** |
| `BINDING_RATIO` | **0.875** (7/8 tenant real) ≥ 0.5 |
| `NO_THRESHOLD_CHANGED` | **YES** |
| `NO_RUNTIME_FORCED` | **YES** |
| `NO_UI_CHANGED` | **YES** |

---

## Binding antes / depois

| Métrica | Antes (INC-027) | Depois (INC-028) |
|---------|-----------------|------------------|
| `blocks_bound` | 3 | **7** |
| `blocks_empty` | 5 | 1 |
| `binding_ratio` | 0.375 | **0.875** |
| Tenant | `511f4819-fc48-479e-b11e-49ba4fb9c81b` | idem |
| Perfil | `manager_quality` | idem |

### Blocos alimentados (tenant real)

| block_id | Antes | Depois | Fonte principal |
|----------|-------|--------|-----------------|
| `quality.nc_center` | BOUND | **BOUND** | `quality_inspections` + `proposals` |
| `quality.capa_engine` | BOUND | **BOUND** | NC abertas (inspeções + proposals) |
| `quality.nonconformity_heatmap` | BOUND* | **BOUND** | sectores de inspeções NC |
| `quality.spc_monitor` | NOT_BOUND | **BOUND** | série semanal calendário (15 pts) |
| `quality.process_stability` | NOT_BOUND | **BOUND** | série semanal + taxas diárias defeito |
| `quality.recurrence_analysis` | NOT_BOUND | **BOUND** | 9 registos `quality_inspections` NC |
| `quality.contextual_quality_ai` | variável | **BOUND** | findings de SPC/recurrence/stability |
| `quality.supplier_intelligence` | NOT_BOUND | **NOT_BOUND** | sem `supplier_name` em lotes/receipts |

\* heatmap dependia de sectores proposals; agora merge com `machine_used` / `lot_number` de inspeções.

---

## Etapa 1 — Auditoria `qualityTenantSignalLoader` (antes)

| Fonte | Utilizada (antes) | Observação |
|-------|-------------------|------------|
| `proposals` | **SIM** | Proxy NC, sectores, tendência semanal, recurrence |
| `communications_proxy` | **SIM** | Metadado legado no array `data_sources` |
| `quality_inspections` | **NÃO** | Tabela existente ignorada |
| `quality_indicators_snapshot` | **NÃO** | Snapshot BI ignorado |
| `supplier_quality_metrics` | **NÃO** | Ranking existente ignorado |
| `raw_material_lots` | **NÃO** | Lotes existentes ignorados |
| `raw_material_receipts` | **NÃO** | Recebimentos ignorados |
| `quality_alerts` | **NÃO** | Fora do pilot pack Z.20 (documentado) |
| `quality_governance` / workflows | **NÃO** | Usado em APIs UI, não no loader |
| `quality_events` / telemetria MQTT | **NÃO** | Sem bridge Z.20 registado |

**Hardcode eliminado:** `supplier_rows: []` (L46 INC-027).

---

## Etapa 2 — Fontes reais existentes (inventário BD/código)

| Fonte | Existe (schema) | Dados prod (2026-07-16) | Adapter/Service |
|-------|-----------------|-------------------------|-----------------|
| `quality_inspections` | YES | 9 rows (1 tenant) | `qualityIntelligenceService.js` |
| `quality_indicators_snapshot` | YES | 0 rows | `qualityIntelligenceService.js` |
| `quality_alerts` | YES | 0 rows | `qualityIntelligenceService.js` |
| `supplier_quality_metrics` | YES | 0 rows | `rawMaterialLotDetectionService.js` |
| `raw_material_lots` | YES | 1 row (`supplier_name` null) | `rawMaterialLotDetectionService.js` |
| `raw_material_receipts` | YES | 0 rows | `qualityIntelligenceService.js` |
| `proposals` | YES | 1 row | `hierarchicalFilter` + loader |
| `impetus_quality_workflow_instance` | YES | variável | `getNcrCapaSummary` (não no loader*) |

\* Workflows CAPA/NCR alimentam UI de governança; bloco `quality.capa_engine` Z.20 usa estimativa derivada de NC abertas (comportamento preservado).

---

## Etapa 3 — Matriz fonte → binding

| Fonte | Existe | Tem dados | Adapter | Loader (pós INC-028) | Entra binding | Motivo |
|-------|--------|-----------|---------|----------------------|---------------|--------|
| `quality_inspections` | YES | YES (9) | YES | **YES** | **SIM** | NC, SPC, heatmap, recurrence |
| `proposals` | YES | YES (1) | YES | YES | SIM | Proxy NC hierárquico |
| `quality_indicators_snapshot` | YES | NO | YES | YES (graceful) | N/A | Sem snapshots no tenant |
| `supplier_quality_metrics` | YES | NO | YES | YES (lookup) | N/A | Sem métricas calculadas |
| `raw_material_lots` | YES | YES (1) | YES | **YES** | N/A | Lote sem `supplier_name` |
| `raw_material_receipts` | YES | NO | YES | **YES** | N/A | Tabela vazia |
| `quality_alerts` | YES | NO | YES | NO | NO | Fora pilot pack Z.20 |
| `quality.traceability` | parcial | NO | UI | NO | NO | Block `quality.traceability_lane` fora `QUALITY_PILOT_BLOCK_IDS` |
| `quality.rollout` | UI only | — | — | NO | NO | Sem block_id cognitivo |
| `quality_telemetry` | API | — | YES | NO | NO | Telemetria alimenta hubs Z.23, não loader Z.20 |

---

## Etapa 4 — Hardcodes eliminados

| Item | Antes | Depois |
|------|-------|--------|
| `supplier_rows` | `[]` fixo | Leitura `raw_material_lots` → `raw_material_receipts` |
| Séries SPC | só semanas com proposals | Calendário semanal `generate_series` + `quality_inspections` (zeros reais) |
| Sectores heatmap | só `proposals.department` | Merge proposals + `machine_used`/`lot_number` inspeções |
| Recurrence | só proposals | Merge inspeções NC + proposals |

**Nenhum mock, placeholder ou dado sintético introduzido.**

---

## Etapa 5 — Blocos cognitivos reconectados

Todos os IDs do pilot pack preservados. Alimentação:

| block_id | Handler | Status pós-reconciliação |
|----------|---------|--------------------------|
| `quality.nc_center` | `bindNcCenter` | BOUND |
| `quality.capa_engine` | `bindCapaEngine` | BOUND |
| `quality.spc_monitor` | `bindSpcMonitor` | BOUND |
| `quality.nonconformity_heatmap` | `bindNonconformityHeatmap` | BOUND |
| `quality.process_stability` | `bindProcessStability` | BOUND |
| `quality.supplier_intelligence` | `bindSupplierIntelligence` | NOT_BOUND (sem dados fornecedor) |
| `quality.recurrence_analysis` | `bindRecurrenceAnalysis` | BOUND |
| `quality.contextual_quality_ai` | `bindContextualQualityAi` | BOUND |

---

## Etapa 6 — Inspection / traceability / rollout

| Módulo | Dados suficientes | Participa binding | Motivo |
|--------|-------------------|-------------------|--------|
| **Inspection** (`quality_inspections`) | YES (9 NC) | **SIM** (via loader) | Não possui block_id próprio no pilot; alias `quality.inspection_ops` → `nc_center` |
| **Traceability** (`raw_material_lots`) | Parcial (1 lote) | **NÃO** | `quality.traceability_lane` fora de `QUALITY_PILOT_BLOCK_IDS`; sem handler Z.20 |
| **Rollout** (QualityRolloutHub) | N/A | **NÃO** | Sem block_id no registry cognitivo Z.19/Z.20 |

---

## Datasets utilizados (tenant real)

```
company_id: 511f4819-fc48-479e-b11e-49ba4fb9c81b
quality_inspections: 9 (all non_conforming)
raw_material_lots: 1 (supplier_name = null)
proposals: 1
process_values: 15 weekly calendar points
recurrence_records: 9
supplier_rows: 0
data_sources: ['proposals', 'communications_proxy', 'quality_inspections']
```

---

## Arquivos alterados

| Ficheiro | Alteração |
|----------|-----------|
| `backend/src/cognitiveRuntime/bridge/qualityTenantSignalLoader.js` | Reconciliação completa — multi-fonte, merge, calendário semanal |
| `backend/tests/cognitive-runtime/runQualitySignalReconciliationTests.js` | **NOVO** — binding before/after, tenant real, perfis quality |
| `backend/docs/evidence/INC-028-QUALITY-SIGNAL-RECONCILIATION.md` | **NOVO** — evidência INC-028 |

**Não alterados (conforme restrições):** thresholds Z.21/Z.22/Z.23, CentroComando, widgets, CSS, promotion, pilot pack IDs, registries frontend.

---

## Testes executados

| Suite | Resultado |
|-------|-----------|
| `runQualitySignalReconciliationTests.js` | **20 passed, 0 failed** |
| `runQualityEngineBridgeTests.js` | **13 passed, 0 failed** |
| `runHrNativeCockpitTests.js` | 11 passed |
| `runProductionNativeCockpitTests.js` | 21 passed |
| `runEnvironmentalNativeCockpitTests.js` | 15 passed |
| `runMaintenanceNativeCockpitTests.js` | 29 passed |
| `runSstNativeCockpitTests.js` | 15 passed |
| `runSpecializedDeliveryTests.js` | 15 passed, **1 failed** (pré-existente: `facade enriches kpis` Z.21 — não relacionado ao loader) |

### Perfis obrigatórios

| Perfil | QUALITY_BINDING | QUALITY_SIGNALS | QUALITY_BLOCKS |
|--------|-----------------|-----------------|----------------|
| `manager_quality` | ratio 1.0 (mock) / 0.875 (real) | `data_sources` populado | 8 blocos enriquecidos Z.20 |
| `supervisor_quality` | ratio 1.0 (mock, 2 blocos visíveis) | ok | composição Z.19+Z.20 OK |

---

## Regressões verificadas

| Domínio | Impacto |
|---------|---------|
| RH | Nenhum — loader quality-scoped |
| Meio Ambiente | Nenhum |
| Produção | Nenhum |
| Manutenção | Nenhum |
| Executivo | Nenhum |
| Segurança (SST) | Nenhum |
| Logística / Suprimentos | Nenhum |

---

## Riscos

| Risco | Severidade | Mitigação |
|-------|------------|-----------|
| Tenant sem inspeções continua com ratio baixo | Média | Graceful degradation proposals; documentar bloqueio |
| `supplier_intelligence` requer lotes/receipts com fornecedor | Baixa | Sem mock; aguardar dados reais de `raw_material_lots`/`receipts` |
| Pool pressure em cargas paralelas (8 queries) | Baixa | Queries independentes; falha isolada por try/catch |
| Séries calendário com muitos zeros podem classificar drift baixo | Baixa | Comportamento esperado — sinal real de baixa actividade |

---

## Bloqueio documentado (sem excepção)

**`quality.supplier_intelligence`** permanece `bound_empty` no tenant de produção porque:

- `raw_material_lots`: 1 lote com `supplier_name = NULL`
- `raw_material_receipts`: 0 registos
- `supplier_quality_metrics`: 0 registos

**Acção futura (fora INC-028):** registar recebimentos/lotes com `supplier_name` ou executar `recalculateSupplierMetrics` após dados de fornecedor — **sem alterar thresholds nem criar mocks**.

---

## Telemetria Z.20 (pós-deploy)

```json
{
  "event": "SHADOW_COCKPIT_ENRICHED",
  "tenant_id": "511f4819-fc48-479e-b11e-49ba4fb9c81b",
  "profile": "manager_quality",
  "blocks_bound": 7,
  "blocks_empty": 1,
  "binding_ratio": 0.875
}
```

---

## Conclusão

A INC-028 reconciliou `qualityTenantSignalLoader` com as fontes reais de Qualidade já existentes. O `binding_ratio` passou de **3/8 (0.375)** para **7/8 (0.875)** no tenant de produção, cumprindo o critério ≥ 0.5 **sem alterar thresholds, UI, promotion ou pilot pack**.

O único bloco do top-8 ainda não ligado é `quality.supplier_intelligence`, por ausência genuína de dados de fornecedor — documentado e consistente com a arquitectura fail-closed da INC.
