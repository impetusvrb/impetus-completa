# BASELINE — Qualidade v1.1

**INC:** INC-034  
**Data congelamento:** 2026-07-16  
**Estado:** `QUALITY_BASELINE_v1.1 = LOCKED`  
**Sucessor de:** [BASELINE-QUALITY-v1.0.md](BASELINE-QUALITY-v1.0.md) (INC-025)  
**Pré-requisitos homologados:** INC-022 → INC-033

---

## Declaração de congelamento

A partir de **2026-07-16**, o domínio **Qualidade (Quality Native)** está **homologado e congelado** como **Baseline Quality v1.1**.

Toda evolução posterior (PPAP, MSA, Ishikawa, 5 Porquês, auditorias ISO, novos hubs) é **funcionalidade nova incremental** — não correção de baseline.

---

## Regra de engenharia (LOCKED)

> **Nenhuma alteração futura poderá modificar componentes, adapters, runtimes ou resolvers já homologados do domínio Qualidade sem uma nova INC explícita.**  
> Novas funcionalidades devem ser adicionadas de forma incremental, preservando o Baseline Quality v1.1 e garantindo compatibilidade retroativa.

### Superfícies congeladas (alteração proibida sem INC)

| Camada | Artefactos |
|--------|------------|
| **Runtime Z.20** | `qualityTenantSignalLoader.js`, `qualityEngineBridgeRegistry.js` |
| **Runtime Z.21–Z.23** | `qualityOperationalMetricsAdapter`, centers Z.23, `cognitiveRuntimeFacade` (cadeia INC-030) |
| **Promoção CC** | `QualityNativeCockpitPromotion.jsx`, `qualityNativeCockpitRegistry.js` |
| **Adapters homologados** | `qualityCommandCenterKpiAdapter.js`, `qualityCognitiveRuntimeSignalAdapter.js`, `qualitySpcSeriesAdapter.js` (+ Core), `qualitySpcSeriesService.js` |
| **Hubs baseline** | `QualityGovernanceHub`, `QualityTelemetryHub`, `CognitiveQualityHub` (layout Baseline UI v1.0) |
| **Dashboard KPIs quality** | `dashboardKPIs.getQualityKpis`, `getDashboardSummary` bloco `quality_inspections` |
| **APIs read homologadas** | `/quality-intelligence/nc-capa-summary`, `/quality-governance/intelligence/spc/series`, `/dashboard/kpis`, `/dashboard/summary` |

---

## Estado global pós INC-022 → INC-033

| Gate | Valor |
|------|-------|
| `QUALITY_RUNTIME` | **LOCKED** |
| `QUALITY_COGNITIVE` | **LOCKED** |
| `QUALITY_SPC` | **LOCKED** |
| `QUALITY_GOVERNANCE` | **LOCKED** |
| `QUALITY_COMMAND_CENTER` | **LOCKED** |
| `QUALITY_BASELINE_v1.1` | **LOCKED** |
| `ZERO_PLACEHOLDER_IN_RUNTIME` | **YES** |
| `ZERO_FAKE_DATA` | **YES** |
| `ZERO_SYNTHETIC_SERIES` | **YES** |
| `NO_REGRESSION` | **YES** (débitos pré-existentes documentados) |

---

## Eixo e perfis

| Campo | Valor |
|-------|-------|
| **PRIMARY_AXIS** | `eixo_qualidade` / `eixo_laboratorial` |
| **FUNCTIONAL_AREA** | `quality`, `qualidade`, `laboratory`, `laboratorio` |
| **COCKPIT_MODE** | `quality_native` |
| **BINDING_RATIO** | **0.875** (7/8) — tenant referência |
| **PROMOTION** | `promotion_applied: true`, `consolidation_applied: true` |

### Perfis homologados

| PROFILE_CODE | SURFACE | RUNTIME |
|--------------|---------|---------|
| `manager_quality` | CentroComando | `quality_native` |
| `coordinator_quality` | CentroComando | `quality_native` |
| `supervisor_quality` | CentroComando | `quality_native` |
| `inspector_quality` | CentroComando | `quality_native` (piloto parcial) |

---

## Cadeia arquitectural homologada

```
Cadastro Estrutural (perfil + functional_area + structural_profile)
  ↓
/dashboard/me  [cognitiveRuntimeFacade Z.19–Z.29]
  ↓
Z.20 qualityTenantSignalLoader  [INC-028 — sinais reais BD]
  ↓
Z.21 qualityOperationalMetrics + insights engine bridge
  ↓
Z.22 render promotion  [INC-024]
  ↓
Z.23 specialized_cockpit_runtime  [6 centers — INC-030 payload preservado]
  ↓
QualityNativeCockpitPromotion  [CentroComando]
  ↓
GovernanceHub | TelemetryHub | CognitiveQualityHub
  ↓
Adapters homologados (KPI / Cognitive / SPC)
  ↓
APIs oficiais (quality_inspections, telemetry, governance)
```

---

## Matriz de módulos (INC-034)

| Módulo | Classificação | Fonte / Notas |
|--------|---------------|---------------|
| **NC (Governance + CC)** | **REAL** | `quality_inspections` — 9 NC tenant ref. |
| **CAPA** | **REAL** | `impetus_quality_workflow_instance` — 18 workflows |
| **SPC** | **REAL** | INC-033 — `qualitySpcSeriesService` → inspeções |
| **Telemetria industrial** | **REAL** | `telemetry_timeseries_v1` domain=quality (9 pts); health OK |
| **Runtime cognitivo Z.20–Z.23** | **REAL** | binding 0.875; 6 centers; payload ↔ report parity |
| **Cognitive Hub** | **REAL** | INC-031 — runtime via `fetchDashboardMeShared` |
| **Decision Support** | **REAL** | center `quality_decision_support` — perguntas assistivas |
| **Centro de Comando KPIs** | **REAL** | INC-032 — `open_nc` source `quality_inspections` |
| **Inspeções operacionais** | **REAL** | `QualityInspectionRuntime` + API intelligence |
| **Governance audit chain** | **REAL** | `GET /quality-governance/audit/explore` |
| **Event backbone quality.*** | **REAL** | 59 eventos outbox tenant ref. |
| **Indicadores snapshot** | **REAL** (escasso) | 1 registo `quality_indicators_snapshot` |
| **Quality Alerts** | **SEM MASSA DE DADOS** | 0 rows `quality_alerts` — UI honesta |
| **Supplier Intelligence** | **SEM MASSA DE DADOS** | 0 `supplier_quality_metrics`; Z.20 `bound_empty` |
| **Traceability** | **PARCIAL** | 1 lote `raw_material_lots`; sem center Z.23 dedicado |
| **Narrativa executiva** | **SEM DADOS** | center `quality_narrative` — `ok: false` |
| **Rollout enterprise** | **PLACEHOLDER** | `ASSESSMENT_SNAPSHOT` hardcoded no hub (input assessment) |
| **PPAP** | **NÃO IMPLEMENTADO** | — |
| **MSA** | **NÃO IMPLEMENTADO** | — |
| **Ishikawa** | **ENGINE EXISTE / UI NÃO** | `qualityRootCauseEngine.buildIshikawaTemplate()` |
| **5 Porquês** | **NÃO IMPLEMENTADO** | — |
| **Auditorias ISO (hub)** | **NÃO IMPLEMENTADO** | — |
| **QualityDriftPanel standalone** | **GREENFIELD** | Existe ficheiro; não montado no CC |
| **QualityExecutiveNarratives standalone** | **GREENFIELD** | Existe ficheiro; não montado |

**Regra:** categorias **nunca misturadas** — cada módulo tem uma classificação única.

---

## Consistência de números (tenant referência)

| Superfície | Métrica NC | Valor | Definição |
|------------|------------|-------|-----------|
| GovernanceHub | `inspections_non_conforming` | **9** | `result='non_conforming'` |
| CentroComando KPI | `open_nc` | **9** | idem (INC-032) |
| `/dashboard/summary` | `quality_inspections.non_conforming` | **9** | idem |
| `/dashboard/kpis` | `open_nc` | **9** | source `quality_inspections` |
| Z.21 `quality_operational_metrics.open_nc` | open_nc | **0** | **Semântica distinta:** NC sem `corrective_action` vazio (todas têm CAPA texto) |
| SPC subgrupos | measurement_count | **8** (2×n=4) | `defects_count` real |

> **P-QLT-004 (débito documentado):** alinhar definição de «NC aberta» entre camada dashboard (INC-032) e Z.21 runtime — requer **INC futura**, não alteração nesta homologação.

---

## Séries temporais — política de honestidade

| Regra | Estado |
|-------|--------|
| Sem `Math.random()` em gráficos/KPIs quality | **YES** |
| Sem arrays hardcoded em SPC (INC-033) | **YES** |
| Sem `buildSignals()` demo no Cognitive Hub (INC-031) | **YES** |
| Estado vazio = «Sem dados suficientes» | **YES** |
| Poucos pontos reais > curva artificial | **YES** |

---

## Visible modules (inalterado v1.0)

`dashboard`, `operational`, `proaction`, `biblioteca`, `ai`, `raw_material_lots`, `quality_intelligence`, `audit`, `settings`

---

## Segregação de superfície (INC-022 — preservada)

| Campo | Valor |
|-------|-------|
| **FOREIGN_MODULES suprimidos** | `manuia`, `environment_intelligence` |
| **CROSS_SURFACE_CONTAMINATION** | **NONE** |
| **Widgets suprimidos com Z23** | `qualidade`, `kpi_cards`, `rastreabilidade`, `receitas`, `grafico_tendencia`, `operacoes`, `manutencao` |

---

## Pendências explícitas (pós-congelamento)

| ID | Descrição | Tipo |
|----|-----------|------|
| P-QLT-001 | Inspeção/Rollout/Traceability sem center Z.23 | GREENFIELD |
| P-QLT-002 | `director` + `quality` → `director_industrial` | Perfil |
| P-QLT-003 | Lab colapsado em quality | Perfil |
| P-QLT-004 | Divergência semântica `open_nc` dashboard vs Z.21 | Integração |
| P-QLT-005 | `supplier_intelligence` bound_empty — aguardar dados | Dados |
| P-QLT-006 | Rollout hub — substituir `ASSESSMENT_SNAPSHOT` por dados tenant | PLACEHOLDER |

---

## Referências INC

| INC | Entrega |
|-----|---------|
| INC-022 | Segregação superfície |
| INC-024 | Promoção quality_native |
| INC-028 | Sinais Z.20 — binding 0.875 |
| INC-030 | Runtime → payload consumidor |
| INC-031 | Cognitive Hub runtime real |
| INC-032 | KPIs CC ↔ quality_inspections |
| INC-033 | SPC séries temporais reais |
| INC-034 | Homologação final v1.1 |

---

## Próximas evoluções (fora do baseline)

PPAP · MSA · Ishikawa UI · 5 Porquês · Auditorias ISO · Traceability hub · Supplier massa de dados

Todas requerem **nova INC** com escopo explícito sobre Baseline Quality v1.1.
