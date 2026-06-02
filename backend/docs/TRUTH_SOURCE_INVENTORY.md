# TRUTH_SOURCE_INVENTORY

**Auditoria:** PROMPT 33A (read-only)  
**Data:** 2026-06-01

Inventário de origens de dados usadas pelos fluxos cognitivos e classificação segundo política operacional IMPETUS.

---

## PERMITIDAS (verificáveis, tenant-scoped)

| Fonte | Implementação típica | Consumidores |
|-------|----------------------|--------------|
| **PostgreSQL** | `backend/src/db.js` — queries por `company_id` | KPIs, chat context, snapshots, quality, manutenção, comunicações |
| **SZ5 unified memory** | `runtimeUnification/facade/unifiedSz5RuntimeFacade` via `chatContextBridge` | Voz, painel, texto (chat consolidado) |
| **Industrial Events** | `machine_detected_events`, event pipeline, outbox | Forecasting, conselho, snapshots |
| **Audit Logs** | `ai_analytics` traces, `workflowAuditTracer`, cognitive audit | Pós-resposta, compliance |
| **Operational Snapshots** | `softwareOperationalSnapshotService.buildSnapshotsForQuery` | Voz, painel, dashboard chat, Claude panel prompt |
| **Cockpit Runtime State** | `cognitiveRuntimeFacade.applyCognitiveFoundationToDashboard` | Widgets/KPIs renderizados (não LLM livre) |
| **Industrial Telemetry** | `plc_collected_data`, telemetria domains | Snapshots telemetria, gráficos `dashboardChartDataService` |
| **dataRetrievalService** | `retrieveContextualData` — intents operacionais | Dashboard chat, conselho, triade chat |
| **dashboardKPIs / getDashboardSummary** | Agregados com `hierarchicalFilter` | Voz, painel, dashboard |
| **HITL / validação humana** | `humanValidationClosureService`, workflow approvals | Fecho de validações pendentes no chat |

**Evidência de ligação:** `dataLineageService.buildLineageForChatContext` no dashboard chat; `evidence_binding` em `industrialTruthEnforcementService`.

---

## NÃO VERIFICADAS (rastreabilidade incompleta para afirmações operacionais)

| Origem | Motivo | Onde aparece |
|--------|--------|--------------|
| **Saída LLM sem pós-processamento** | Texto gerado não comparado a evidência | Anam stream, Conselho directo, chat interno |
| **Plano JSON intermédio (Smart Panel)** | LLM propõe estrutura antes da hidratação | `smartPanelCommandService` interpretação |
| **Claude panel JSON** | Validação estrutural, não grounding numérico | `claudePanelService` |
| **Conteúdo multimodal (imagem/PDF)** | Extracted text pode não mapear a métricas tenant | `multimodalChatService` |
| **Memória conversacional Z** | `zCognitiveContextInjector`, continuidade de turnos | Dashboard chat ingest |
| **Env append** | `ANAM_SYSTEM_PROMPT_APPEND`, `VITE_REALTIME_INSTRUCTIONS` | Voz — não auditado por linha |
| **Dossiê ManuIA** | Mistura visão Gemini + pesquisa web/library | `manuiaLiveAssistanceService` |
| **Projeções extrapoladas** | `operationalForecastingAI` instrui modelo a extrapolar 7 dias | Serviço latente |
| **Hallucination assessment assíncrono** | Pode não alterar resposta já entregue | `enqueueTraceAssessment` |

---

## PROIBIDAS (política IMPETUS — não devem alimentar afirmações operacionais)

| Tipo | Evidência no código | Severidade se usado em produção |
|------|---------------------|--------------------------------|
| **Mock / fake datasets** | Proibido por regra de produto (`.cursor/rules/charts-real-data-industrial.mdc`) | CRITICAL |
| **Hardcoded KPI arrays** | Smart panel evita em hidratação; gráficos frontend devem usar APIs | HIGH se reintroduzido |
| **Synthetic operational events** | `syntheticOperationalEventGenerator.js` — `verification_state: 'synthetic'` | **CRITICAL** quando `IMPETUS_C2_SYNTHETIC_EVENTS_WHEN_SPARSE=true` (default) |
| **Math.random() para métricas** | Não encontrado em serviços de chart/KPI de produção; apenas IDs/correlation | N/A operacional |
| **Fallback arrays «Set, Out, Nov…»** | Proibido por regra charts | CRITICAL |
| **Valores zero como gráfico decorativo** | Mitigado por `guardPanelVisualizationPayload` no painel hidratado | MEDIUM (pré-guard) |

### Detalhe: eventos sintéticos C2

```text
cognitiveConvergenceFacade.js
  → se syntheticEventsWhenSparse() [default ON]
  → generateSyntheticOperationalEvents()
  → verification_state: 'synthetic'
```

Estes eventos **não** devem ser apresentados como factos operacionais reais. Se forem injectados em contexto LLM sem filtro, constituem **TRUTH VIOLATION** potencial.

---

## Mapa fonte → fluxo

| Fluxo | Fontes primárias | Classificação global |
|-------|------------------|----------------------|
| Dashboard chat (GPT) | PostgreSQL pack + lineage + optional council data | PERMITIDAS + risco LLM |
| Dashboard chat (council) | retrieveContextualData + triade | PERMITIDAS + **NÃO VERIFICADA** (saída) |
| Voz Anam/Realtime | KPIs + snapshot + SZ5 bridge | PERMITIDAS no prompt; **NÃO VERIFICADA** na fala |
| Smart Panel hidratado | KPIs + snapshots + maintenance APIs | PERMITIDAS |
| Smart Panel plano IA | LLM | **NÃO VERIFICADA** |
| Chat interno | BD se triade; senão histórico | Misto |
| Cockpit widgets | cognitiveRuntime + dashboard/me | PERMITIDAS |
| Alertas forecasting | SQL agregations | PERMITIDAS |
| Workflow/Action | Estado máquina + audit | PERMITIDAS |

---

## Tabelas / entidades PostgreSQL referenciadas com frequência

(Amostra via `industrialTruthEnforcementService.hasOperationalData` e snapshots)

- `plc_collected_data`, `proposals`, `communications`, `operational_interactions`
- `quality_*` / inspeções (quality intelligence)
- `manuia_sessions`, equipamentos manutenção
- `machine_detected_events`
- `users`, estrutura organizacional (Base Estrutural — governança, não métricas de fábrica)

---

## SZ5 — papel na verdade operacional

| Componente | Função |
|------------|--------|
| `unifiedSz5RuntimeFacade.buildChannelContext` | Unifica memória/contexto conversacional |
| `channelRegistry` | SSOT de consumidores por canal |
| `runtimeUnificationFlags.isUnificationActive()` | Alterna SZ5 vs legacy |

SZ5 **não substitui** truth enforcement; fornece **contexto adicional** auditável se `explainability` estiver preenchido no bridge.

---

## Recomendações (documentação apenas — sem alteração de código nesta fase)

1. Marcar explicitamente no trace `data_origin: synthetic` quando C2 injectar eventos.
2. Exigir `evidence_binding` em todos os módulos que chamam `runCognitiveCouncil`.
3. Inventariar em runtime quais tenants têm `IMPETUS_INDUSTRIAL_TRUTH_MODE=shadow`.
