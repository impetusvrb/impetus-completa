# INC-029 — Homologação Funcional do Runtime Cognitivo Quality v1.0

**Data:** 2026-07-16  
**Tipo:** auditoria funcional read-only (sem código, UI, runtime ou dados sintéticos)  
**Tenant:** `511f4819-fc48-479e-b11e-49ba4fb9c81b`  
**Perfil:** `manager_quality` (`ricardo.souza@impetus.com.br`)  
**Pré-requisitos:** INC-022 → INC-028A concluídas

---

## Critérios de encerramento

| Flag | Valor |
|------|-------|
| `QUALITY_RUNTIME_HOMOLOGATED` | **YES** |
| `ALL_MODULES_AUDITED` | **YES** |
| `ALL_DATASETS_IDENTIFIED` | **YES** |
| `ALL_GAPS_DOCUMENTED` | **YES** |
| `NO_CODE_CHANGED` | **YES** |
| `NO_UI_CHANGED` | **YES** |
| `NO_RUNTIME_CHANGED` | **YES** |

---

## Estado runtime confirmado (API `/api/dashboard/me`)

| Métrica | Valor | Camada |
|---------|-------|--------|
| `profile_code` | `manager_quality` | payload |
| `binding_ratio` | **0.875** (7/8) | `cognitive_runtime_report.quality_cockpit_pilot.engine_bridge` |
| `promotion_applied` | **true** | `cognitive_runtime_report.cognitive_render_promotion` |
| `consolidation_applied` | **true** | `cognitive_runtime_report.specialized_cockpit_runtime` |
| `cockpit_mode` | **quality_native** | idem |
| `quality_cognitive_centers` | **6 centers** | idem (não replicado no payload raiz*) |
| `pilot_mode` | `shadow_only` | `cognitive_runtime_report.quality_cockpit_pilot` |

\* **GAP crítico documentado:** `cognitiveRuntimeFacade.js` L599-602 repõe `finalPayload = payload` quando `quality_cockpit_pilot.mode === 'shadow_only'`, **eliminando** `specialized_cockpit_runtime` e `quality_cognitive_centers` do payload consumidor. O frontend (`specializedCockpitResolver.js`) lê **apenas** `meData.specialized_cockpit_runtime` no raiz → `resolveSpecializedCockpitRuntime()` devolve **null** → `QualityNativeCockpitPromotion` **não monta** hubs no CentroComando apesar de Z.23 activo no report.

**Classificação:** INTEGRAÇÃO INCOMPLETA (B) — runtime calcula; superfície consumidora não recebe.

---

## Etapa 1 — Inventário de hubs e superfícies activas

| # | Superfície | Ficheiro | Promovido Z.23 (CC) | Acesso |
|---|------------|----------|---------------------|--------|
| 1 | **QualityNativeCockpitPromotion** | `frontend/.../QualityNativeCockpitPromotion.jsx` | Gate CC | Monta hubs se `consolidation_applied` no payload raiz |
| 2 | **QualityGovernanceHub** | `domains/quality/governance/QualityGovernanceHub.jsx` | Sim (`governance`) | CC + `/app/quality/operational?view=governance` |
| 3 | **QualityTelemetryHub** | `domains/quality/telemetry/QualityTelemetryHub.jsx` | Sim (`telemetry`) | CC + `?view=telemetry` |
| 4 | **CognitiveQualityHub** | `domains/quality/cognitive/CognitiveQualityHub.jsx` | Sim (`cognitive`) | CC + `?view=cognitive` |
| 5 | **QualityInspectionRuntime** | `operational-runtime/QualityInspectionRuntime.jsx` | **Não** | `/app/quality/operational/inspection` |
| 6 | **QualityRolloutHub** | `domains/quality/rollout/QualityRolloutHub.jsx` | **Não** | `?view=rollout` |
| 7 | **QualityOperationalHub** | `operational-runtime/QualityOperationalHub.jsx` | N/A | Landing / atalhos (sem API) |

### Centers Z.23 (6)

| center_id | Hub mapeado | Label |
|-----------|-------------|-------|
| `quality_operational_nc` | governance | Centro de Não Conformidades |
| `quality_action_capa` | governance | Centro CAPA |
| `quality_governance` | governance | Governança de Qualidade |
| `quality_telemetry_spc` | telemetry | Telemetria SPC |
| `quality_narrative` | cognitive | Narrativa executiva |
| `quality_decision_support` | cognitive | IA contextual |

### Componentes existentes não montados no CC

| Componente | Estado |
|----------|--------|
| `QualitySupplierIntelligence.jsx` | Existe, **não importado** |
| `QualityDriftPanel.jsx` | Existe, **não importado** |
| `QualityPredictiveInsights.jsx` | Existe, **não importado** |
| `QualityExecutiveNarratives.jsx` | Existe, **não importado** |
| `QualityRecommendationPanel.jsx` | Existe, **não importado** |

---

## Etapa 2 — Inventário dataset → API → tabela → motor

| Hub / Domínio | API principal | Tabela(s) BD | Registos (tenant) | Última act. | Motor / Serviço |
|---------------|---------------|--------------|-------------------|-------------|-----------------|
| **NC/CAPA** | `GET /api/quality-intelligence/nc-capa-summary` | `quality_inspections`, `impetus_quality_workflow_instance` | 9 insp. NC, 18 workflows | 2026-06-26 | `qualityIntelligenceService.getNcrCapaSummary` |
| **Inspeções** | `GET /api/quality-intelligence/inspections` | `quality_inspections` | 9 | 2026-06-26 | `qualityIntelligenceService.getInspections` |
| **Indicadores** | `GET /api/quality-intelligence/indicators` | `quality_inspections`, `tpm_incidents` | 9 / 1 TPM | 2026-06-26 | `calculateQualityIndicators` |
| **Alertas quality** | `GET /api/quality-intelligence/alerts` | `quality_alerts` | **0** | — | `qualityIntelligenceService` |
| **SPC (governance)** | `POST /api/quality-governance/intelligence/spc/screen` | *(payload request — não BD)* | subgrupos enviados pelo UI | runtime | `qualityControlChartEngine` |
| **Narrativa exec.** | `POST /api/quality-governance/intelligence/narrative` | *(summary request)* | — | runtime | `qualityContextualStorytelling` |
| **Cognitivo UI** | `POST /api/quality-cognitive/insights/run` | *(signals no body — demo no frontend)* | — | runtime | `qualityCognitiveOrchestrator` |
| **Cognitivo Z.20** | *(interno dashboard)* | `quality_inspections`, `proposals`, `raw_material_lots` | 9 / 0 / 1 | 2026-06-26 | `qualityTenantSignalLoader` (INC-028) |
| **Telemetria** | `GET /api/quality-telemetry/health`, `POST ingest/v1` | `telemetry_timeseries_v1`, `industrial_telemetry_samples` | eventos: 4 ingested | 2026-06-26 | `qualityTelemetryIngestService` |
| **Event backbone** | — | `industrial_event_outbox` (`quality.*`) | **52** | 2026-06-26 | `qualityEventPublisher` |
| **Fornecedor** | *(via cognitive/governance)* | `supplier_quality_metrics`, `raw_material_lots`, `raw_material_receipts` | **0 / 1 / 0** | 2026-06-24 | `qualitySupplierScoringEngine` |
| **Lotes MP** | módulo `raw_material_lots` | `raw_material_lots` | 1 (sem supplier) | 2026-06-24 | `rawMaterialLotDetectionService` |
| **Rollout** | `POST /api/quality-rollout/assessment/run` | memória (`qualityRolloutMemoryStore`) | — | runtime | `qualityRolloutOrchestrator` |
| **Inspeção runtime** | `POST /api/quality-operational/events` | `industrial_event_outbox` | 4 `inspection.started` | 2026-06-26 | `qualityOperational` |
| **Audit chain** | internal | `impetus_quality_audit_chain` | 18 | 2026-06-26 | workflow universal |
| **Snapshots BI** | — | `quality_indicators_snapshot` | **0** | — | — |
| **Proposals (proxy NC)** | dashboard KPIs | `proposals` | **0** | — | `dashboardKPIs.getQualityKpis` |

---

## Etapa 3 — Auditoria de cards

### CentroComando — cards perfil `manager_quality`

| Card | Dataset esperado | Registos | Estado | Causa |
|------|------------------|----------|--------|-------|
| `open_nc` | `proposals` abertas | **0** | **INTEGRAÇÃO AUSENTE** | `getQualityKpis` usa `proposals`; tenant tem 0 proposals, 9 NC em `quality_inspections` |
| `lot_alerts` | `raw_material_lot_alerts` / lotes | 0 alertas | **SEM DADOS** | 1 lote, sem alertas activos |
| `quality_dashboard` | rota operacional | N/A | **OK** | Link funcional |
| `corrective_overdue` | workflows CAPA vencidos | 9 CAPA `in_progress` | **INTEGRAÇÃO AUSENTE** | Card sem query dedicada no KPI layer |
| `pending_audits` | auditorias | 0 | **SEM DADOS** | Sem tabela de auditorias schedule |
| `deviation_recurrence` | recurrence engine | 9 insp. | **INTEGRAÇÃO AUSENTE** | Card definido; KPI não alimentado por motor |
| `sector_conformity` | inspeções por setor | 9 (sem machine_used) | **SEM MASSA CRÍTICA** | Sectores = lot_numbers individuais |

### KPIs renderizados (`/dashboard/me` kpis[])

| KPI | Valor API | Origem real | Estado |
|-----|-----------|-------------|--------|
| Insights prioritários | 0 | `communications` ai_priority | **SEM DADOS** |
| Propostas pendentes | 0 | `proposals` | **SEM DADOS** (A) |
| Interações (setor) | 0 | `communications` | **SEM DADOS** |
| Não conformidades | 0 | `proposals` (não inspections) | **ERRO integração** (B) — deveria refletir 9 NC |

### QualityGovernanceHub

| Card / Painel | Dataset | Registos | Estado |
|---------------|---------|----------|--------|
| NCRs abertas | `nc-capa-summary` | **9** | **OK** |
| CAPAs em andamento | workflows | **9** | **OK** |
| Inspeções NC | `quality_inspections` | **9** | **OK** |
| Lista recentes | workflows | 8 items | **OK** |
| SPC Xbar/UCL/LCL/Cp | subgrupos **hardcoded UI** | 3 subgrupos demo | **PLACEHOLDER** |
| Risco preditivo | estático | — | **PLACEHOLDER** |
| Alertas activos (risco) | estático "0" | — | **PLACEHOLDER** |
| Narrativa executiva | API narrative | resposta parcial | **OPERACIONAL COM DADOS LIMITADOS** |

### QualityTelemetryHub

| Card | Dataset | Registos | Estado |
|------|---------|----------|--------|
| Eventos/min | health API | — | **PLACEHOLDER** (health, não série) |
| Latência / queue | health API | — | **PLACEHOLDER** |
| Protocolos MQTT/OPC/Modbus | health flags | OK estático | **OPERACIONAL** (status, não PLC real) |
| Ingest spot | manual prompt | 4 eventos históricos | **SEM MASSA CRÍTICA** |

### CognitiveQualityHub

| Card | Dataset | Registos | Estado |
|------|---------|----------|--------|
| Risco preditivo | `buildSignals()` demo | 12 pts demo | **PLACEHOLDER** (frontend) |
| Drift | engine + demo signals | calculado | **OPERACIONAL*** (*sobre demo, não BD) |
| Fornecedor | demo `supplier_rows` | 3 segmentos demo | **PLACEHOLDER** |
| Recomendações | engine | produzidas | **OPERACIONAL*** (*sobre demo) |
| Narrativa | engine | headline OK | **OPERACIONAL*** (*sobre demo) |

### QualityRolloutHub

| Card | Dataset | Estado |
|------|---------|--------|
| Estágio / prontidão / adopção | `ASSESSMENT_SNAPSHOT` hardcoded | **PLACEHOLDER** |
| Maturity / readiness panels | orchestrator + snapshot | **PLACEHOLDER** |

---

## Etapa 4 — Mensagens vazias / insuficientes

| Mensagem | Onde | Verdadeira? | Evidência |
|----------|------|-------------|-----------|
| «Sem NCR/CAPA activos — dados em tempo real via API certificada» | `NcrCapaPanel` quando counters=0 | **Condicional** | Com dados actuais (9/9) **não aparece**; API devolve 9. Mensagem correcta se tenant vazio |
| «Inicie análise SPC para visualizar resultado» | `SpcPanel` antes do POST | N/A | UI dispara POST automático com **subgrupos demo** |
| «SPC não avaliado neste pacote» | API narrative | **Verdadeira** | Narrative não recebeu série SPC real |
| «Sem dados de defeito agregados para narrativa» | API narrative bundle | **Verdadeira** | Sem agregação pareto na BD |
| «Telemetria industrial (Quality) desligada» | TelemetryHub | Flag-dependent | Não activa se flags off |
| «Inspeção indisponível sem company_id» | InspectionRuntime | N/A | Guard correcto |
| DriftCard / SupplierCard `return null` | CognitiveHub | **Integração** | Quando engine retorna `ok:false` — oculta silenciosamente |
| CentroComando KPIs a zero | CC | **Erro integração** | NC existem (9) mas KPI lê `proposals` (0) |

---

## Etapa 5 — Gráficos

| Gráfico | Origem | Pontos disp. | Janela | Mín. exigido | Estado |
|---------|--------|--------------|--------|--------------|--------|
| `trend` (CC profile) | `dashboardChartDataService` / proposals | ~0 semanal | 7d | ≥2 | **SEM DADOS** |
| `quality_by_sector` | inspeções / proposals sectores | 9 sectores (= lotes) | — | ≥1 | **SEM MASSA CRÍTICA** |
| SPC Xbar (governance) | POST subgrupos UI | 3 subgrupos × 5 | — | ≥2 subgrupos | **PLACEHOLDER** (não BD) |
| SPC Z.20 drift | `quality_inspections` weekly | 15 calendário | 14 sem | ≥8 | **OK** (motor Z.20) |
| Telemetria série | `telemetry_timeseries_v1` | não auditável* | — | — | **INTEGRAÇÃO AUSENTE** |

\* Query de auditoria falhou por schema (`column "ts" does not exist`) — divergência schema vs. serviço.

**Nota:** Domínio Quality **não usa** `ImpetusChart`/Recharts nos hubs — apenas KPI cards.

---

## Etapa 6 — KPIs (detalhe)

| KPI | Valor CC | Origem consulta | Timestamp dados |
|-----|----------|-----------------|-----------------|
| NCRs abertas (hub) | 9 | `impetus_quality_workflow_instance` + `quality_inspections` | 2026-06-26 |
| CAPAs | 9 | `capa_universal` in_progress | 2026-06-26 |
| defect_index | 300 | `quality_inspections` (9 NC, 27 defects) | 2026-06-26 |
| conformity_rate | 0% | 9/9 non_conforming | 2026-06-26 |
| binding_ratio | 0.875 | Z.20 engine bridge | 2026-07-16 runtime |
| open_nc (CC card) | **0** | `proposals` COUNT | desactualizado vs. NC |

---

## Etapa 7 — Inteligência contextual

| Dimensão | Existe? | Massa crítica? | Notas |
|----------|---------|----------------|-------|
| Insights (drift/recurrence) | Sim (Z.20 report) | **Parcial** | 7/8 blocos bound; supplier empty |
| Alertas | API alerts | **Não** | 0 registos `quality_alerts` |
| Prioridades / recomendações | CognitiveHub | **Sobre demo** | `buildSignals()` no frontend |
| Correlações | orchestrator | **Não** | Sem feed BD→UI |
| Narrativas IA | governance + cognitive | **Limitada** | Template OK; falta SPC/pareto real |

**Verdict:** Motores **existem e calculam**; UI CognitiveHub **não possui massa crítica real** — desconectada do `qualityTenantSignalLoader` (INC-028).

---

## Etapa 8 — NC/CAPA

| Dimensão | Valor | Estado |
|----------|-------|--------|
| Abertas (NCR workflow) | 9 `under_review` | **OK** |
| CAPA em progresso | 9 | **OK** |
| Inspeções NC | 9 | **OK** |
| Tempo médio fecho | `null` | **SEM DADOS** (nenhum closed) |
| Recurrence (Z.20) | low severity | **OK** (9 registos) |
| Heatmap (Z.20) | 9 sectores (por lot) | **SEM MASSA CRÍTICA** |
| Acções / workflow | 18 instâncias | **OK** |
| Registo NC via UI | POST `/inspections` | **OK** (API certificada E2E) |

---

## Etapa 9 — SPC

| Dimensão | Estado | Causa |
|----------|--------|-------|
| Série temporal BD | **SEM MASSA CRÍTICA** | 2 semanas com dados, 9 inspeções |
| Pontos Z.20 | 15 (calendário) | **OK** motor |
| CEP (Cp) governance | Calculado sobre **demo** | PLACEHOLDER UI |
| Desvios / violations | 2 (demo subgroups) | Motor OK, input demo |
| Limites UCL/LCL | Calculados | Motor OK |
| Drift Z.20 | high, conf 100% | **OK** sobre inspeções reais |
| Eventos `quality.spc.violation_detected` | 14 | **OK** backbone |

---

## Etapa 10 — Fornecedor

| Dimensão | Registos | Estado |
|----------|----------|--------|
| `supplier_quality_metrics` | 0 | **SEM DADOS** (A) |
| `raw_material_receipts` | 0 | **SEM DADOS** (A) |
| `raw_material_lots` | 1 (`supplier_name` NULL) | **SEM DADOS** (A) |
| Scorecard UI (cognitive demo) | demo rows | **PLACEHOLDER** |
| Ranking | — | **NÃO IMPLEMENTADO** na UI CC |
| Z.20 `supplier_intelligence` | bound_empty | **Verdadeiro** — INC-028 correcto |

---

## Etapa 11 — Telemetria

| Dimensão | Estado |
|----------|--------|
| PLC / sensores reais | **NÃO IMPLEMENTADO** (ingest manual) |
| MQTT/OPC/Modbus status | Health flags — **OPERACIONAL** (lab) |
| Eventos quality telemetria | 4 `quality.telemetry.sample_ingested` |
| Amostragem / frequência | Manual via prompt UI |
| Série timeseries | **INTEGRAÇÃO AUSENTE** (schema/query não validada) |

---

## Etapa 12 — Traceability

| Dimensão | Registos | Estado |
|----------|----------|--------|
| Lotes MP | 1 | **SEM MASSA CRÍTICA** |
| Genealogia ordens | — | **NÃO IMPLEMENTADO** no hub CC |
| Vínculos produto/lote | coluna `product_id` existe | Sem dados |
| Hub traceability | `quality.traceability_lane` | **Fora pilot Z.20** |
| Rastreabilidade CC placeholder | suprimido em quality_native | Esperado |

---

## Etapa 13 — Executive Quality

| Dimensão | Estado |
|----------|--------|
| KPIs executivos CC | Cards genéricos a zero — **INTEGRAÇÃO AUSENTE** |
| Tendências | chart `trend` sem pontos — **SEM DADOS** |
| Indicadores snapshot | 0 rows — **SEM DADOS** |
| Projeções | não expostas no hub |
| Prioridades | cognitive recommendations — **PLACEHOLDER** |
| Narrativa Z.23 center | `quality_narrative` consolidado — **OK** arquitectura; conteúdo limitado |

---

## Etapa 14 — Classificação por módulo

| Módulo | Classificação | A / B / C |
|--------|---------------|-----------|
| **Runtime Z.20 binding** | OPERACIONAL | Motor OK (INC-028) |
| **Runtime Z.22 promotion** | OPERACIONAL | report OK |
| **Runtime Z.23 consolidation** | OPERACIONAL | report OK; payload raiz stripped |
| **QualityNativeCockpitPromotion (CC)** | INTEGRAÇÃO INCOMPLETA | **B** — shadow_only + resolver raiz |
| **QualityGovernanceHub — NC/CAPA** | OPERACIONAL | **A** parcial — dados cert E2E |
| **QualityGovernanceHub — SPC** | PLACEHOLDER | **B** — subgrupos demo UI |
| **QualityGovernanceHub — Risco** | PLACEHOLDER | **C** — KPIs estáticos |
| **QualityGovernanceHub — Executive** | OPERACIONAL COM DADOS LIMITADOS | **A+B** |
| **QualityTelemetryHub** | SEM MASSA CRÍTICA | **A** |
| **CognitiveQualityHub** | PLACEHOLDER | **B** — buildSignals demo |
| **QualityInspectionRuntime** | OPERACIONAL | eventos OK; persistência indirecta |
| **QualityRolloutHub** | PLACEHOLDER | snapshot hardcoded |
| **Supplier Intelligence** | SEM MASSA CRÍTICA | **A** |
| **Traceability** | NÃO IMPLEMENTADO (CC) | fora scope Z.23 |
| **CentroComando KPIs quality** | INTEGRAÇÃO INCOMPLETA | **B** — proposals vs inspections |
| **Charts CC (trend/sector)** | SEM DADOS / SEM MASSA | **A** |
| **quality_alerts** | SEM DADOS | **A** |
| **quality_indicators_snapshot** | SEM DADOS | **A** |

Legenda causa: **A** = sem dados reais | **B** = integração incompleta | **C** = motor calcula errado (nenhum caso confirmado)

---

## GAPs reais (priorizados)

### GAP-1 — Payload consumidor vs. report (CRÍTICO homologação UI)

- **Sintoma:** Z.23 `consolidation_applied=true` no report; payload raiz sem `specialized_cockpit_runtime`
- **Causa:** `shadow_only` reset L599-602 + frontend lê só raiz
- **Impacto:** Hubs quality_native podem **não montar** no CentroComando
- **Tipo:** B

### GAP-2 — CognitiveHub desconectado do signal loader

- **Sintoma:** `buildSignals()` demo no frontend
- **Impacto:** Inteligência visual ≠ inteligência Z.20/Z.23
- **Tipo:** B

### GAP-3 — KPIs CC usam proposals, não quality_inspections

- **Sintoma:** NC=0 no CC; NC=9 no hub governance
- **Tipo:** B

### GAP-4 — SPC governance usa subgrupos hardcoded

- **Sintoma:** CEP calculado sobre demo, não série tenant
- **Tipo:** B

### GAP-5 — Fornecedor sem massa (verdadeiro)

- **Sintoma:** supplier bound_empty
- **Tipo:** A — aguardar receipts/lotes com supplier

### GAP-6 — Telemetria sem série industrial real

- **Tipo:** A + B (schema timeseries)

### GAP-7 — Risk panel estático

- **Tipo:** PLACEHOLDER — não implementado com BD

---

## Recomendações para INCs futuras (sem implementar nesta)

| INC sugerida | Objectivo |
|--------------|-----------|
| **INC-030** | Fechar GAP-1: payload raiz ↔ frontend resolver (`shadow_only` vs. promotion) |
| **INC-031** | Ligar CognitiveHub ao `qualityTenantSignalLoader` / `/dashboard/me` signals |
| **INC-032** | KPIs CC quality → `quality_inspections` + workflows (eliminar proxy proposals) |
| **INC-033** | SPC governance → série real (`quality_inspections` / telemetria) |
| **INC-034** | Massa fornecedor — processo de dados (receipts + supplier_name), não mock |
| **INC-035** | Telemetria — validar schema `telemetry_timeseries_v1` + ingest PLC |

---

## Testes executados (read-only)

| Teste | Resultado |
|-------|-----------|
| Query BD 12 tabelas quality | OK |
| `GET /api/quality-intelligence/nc-capa-summary` | 200 — 9/9/9 |
| `GET /api/quality-intelligence/inspections` | 200 — 9 rows |
| `GET /api/quality-intelligence/indicators` | 200 |
| `POST /api/quality-governance/intelligence/spc/screen` | 200 — violations=2 |
| `POST /api/quality-cognitive/insights/run` | 200 — engines OK |
| `GET /api/dashboard/me` manager_quality | 200 — binding 0.875 |
| Regressão código | **Nenhuma alteração** |

---

## Conclusão

A **arquitectura cognitiva Quality v1.0 está operacional** nos motores Z.20→Z.23 (binding 0.875, promoção e consolidação no report). A **homologação funcional** revela que a **inteligência visível ao utilizador** ainda depende de:

1. **Integrações incompletas** (payload CC, KPIs, CognitiveHub, SPC UI) — tipo **B**
2. **Massa de dados insuficiente** no tenant (fornecedor, telemetria industrial, alertas, snapshots) — tipo **A**

Nenhum caso de **motor a calcular errado** (tipo C) foi confirmado.

**Não foram criados mocks, fixes ou alterações de código nesta INC.**

---

## Referências

- `INC-028-QUALITY-SIGNAL-RECONCILIATION.md`
- `INC-028A-CONTROLLED-DEPLOY.md`
- `BASELINE-QUALITY-v1.0.md`
- Tenant audit: 2026-07-16T15:05 UTC
