# AIOI_INTEGRATION_CATALOG

**Fase:** AIOI-GOVERNANCE-01 — Etapa 02  
**Data:** 2026-06-05  
**Modo:** READ-ONLY FORENSE — nenhum código alterado  
**Objetivo:** Inventariar todos os módulos relevantes e classificar sua relação com o AIOI  

---

## 1. Legenda de Classificação

| Classificação | Significado |
|--------------|-------------|
| **REUSE** | Reutilizar diretamente — chamar o módulo como dependência sem alteração |
| **WRAP** | Encapsular — criar adapter/facade AIOI que chama o módulo internamente |
| **BRIDGE** | Conectar — emitir/consumir eventos entre o barramento AIOI e o módulo existente |
| **DEPRECATE_FUTURE** | Manter agora; substituir em versão futura após AIOI estabilizar |

---

## 2. Catálogo de Módulos

### 2.1 `operationalPrioritizationService`

| Atributo | Valor |
|---------|-------|
| **Localização** | `backend/src/services/operationalPrioritizationService.js` |
| **Estado** | READY — production-grade desde F47 |
| **Classificação** | **REUSE** |
| **Motivo** | Soberano do score PLC 0–100. Implementa `computePriorityScore()` com pesos documentados em `priorityIntelligenceConfig`. Cobre attention_score, risk_score, event_confidence, pattern_confidence, telemetry_health. Possui `buildPriorityEvidence()` com rastreabilidade completa. |

**O que reutilizar:**  
- `computePriorityScore(components)` → entrada obrigatória do IOE para eventos PLC  
- `priorityLevelFromScore(score)` → mapeamento crítico/alto/médio/baixo para `priority_band`  
- `buildPriorityEvidence()` → estrutura de evidência para `evidence_refs` no IOE  

**O que NÃO fazer:**  
- Não reimplementar fórmulas de score PLC no AIOI  
- Não ignorar `priorityIntelligenceConfig.weights` ao calcular prioridade  

---

### 2.2 `operationalPatternIntelligenceService`

| Atributo | Valor |
|---------|-------|
| **Localização** | `backend/src/services/operationalPatternIntelligenceService.js` |
| **Estado** | READY — F45, consolida F40–44 |
| **Classificação** | **REUSE** |
| **Motivo** | Detecta padrões recorrentes observáveis (RECURRING_SIGNAL_INSTABILITY, ALARM_ESCALATION, etc.). Fornece `pattern_confidence` e `pattern_type` — inputs diretos para `evidence_refs` e `priority_band` do IOE. |

**O que reutilizar:**  
- `buildPatternEvidence()` → evidência estruturada para `evidence_refs` do IOE  
- `PATTERN_TYPES` e `EVENT_TO_PATTERN` → vocabulário canônico de classificação  
- `pattern_confidence` → campo de scoring do IOE  

---

### 2.3 `operationalDecisionEngine`

| Atributo | Valor |
|---------|-------|
| **Localização** | `backend/src/services/operationalDecisionEngine.js` |
| **Estado** | PARTIAL — plan-centric, sugere ações, não executa |
| **Classificação** | **WRAP** |
| **Motivo** | Atualmente processa `operational_plan` → triggers + alertas + recommended_actions. AIOI precisa de decisão event-centric (baseada em IOE). Necessita wrapper que traduz IOE → plan → decisions. |

**O que encapsular:**  
- `evaluateOperationalDecisions(plan, context)` → chamar dentro do AIOI Decision Adapter  
- Manter como gerador de recomendações; AIOI eleva para fila executiva  

**O que não fazer:**  
- Não substituir por engine AIOI puro sem consumir o existente  
- Não duplicar lógica de triggers CRITICAL/HIGH  

---

### 2.4 `industrialEventBackbone`

| Atributo | Valor |
|---------|-------|
| **Localização** | `backend/src/eventPipeline/industrialEventBackbone.js` |
| **Estado** | READY — Wave 2, outbox + DLQ + backpressure + archive |
| **Classificação** | **BRIDGE** |
| **Motivo** | O backbone W2 opera sobre `industrial_event_outbox` com catálogo de tipos de evento. O AIOI terá `aioi_outbox` dedicado. Necessita bridge bidirecional: eventos W2 relevantes (ex.: `EQUIPMENT_ATTENTION_CRITICAL`) devem alimentar IOE; IOE criados devem publicar evento W2 `ioe.created`. |

**O que conectar:**  
- Publicar `ioe.created` via `publishIndustrialEvent()` após persist de IOE  
- Consumir eventos W2 no adapter PLC/comm como fonte de `evidence_refs`  
- Compartilhar `correlation_id` entre W2 envelope e IOE  

**O que não fazer:**  
- Não substituir `industrial_event_outbox` por `aioi_outbox` — coexistência com contrato  
- Não duplicar backpressure / DLQ no AIOI — reutilizar da W2  

---

### 2.5 `unifiedOperationalIngestionService`

| Atributo | Valor |
|---------|-------|
| **Localização** | `backend/src/services/operational/unifiedOperationalIngestionService.js` |
| **Estado** | READY — F2, normaliza chat/voz/docs/ordens |
| **Classificação** | **BRIDGE** |
| **Motivo** | Trata ingestão cognitiva (chat, voz, transcrições, registros inteligentes). IOE trata eventos operacionais industriais (PLC, comm, OS, MES). Domínios distintos, mas a ingestão unificada pode gerar fatos que elevam a prioridade de um IOE. |

**O que conectar:**  
- Quando ingestão detecta `URGENT` ou `RISK` em contexto de equipamento → emitir evento que alimenta adapter `comm_task` do IOE  
- Não misturar pipeline cognitivo com pipeline industrial  

**Domínios exclusivos:**  
- `unifiedOperationalIngestionService` → fatos cognitivos / memória conversacional  
- IOE Adapters → eventos operacionais industriais  

---

### 2.6 `workflowOrchestrator`

| Atributo | Valor |
|---------|-------|
| **Localização** | `backend/src/workflowEngine/orchestration/workflowOrchestrator.js` |
| **Estado** | READY — BPMN, state machine, compensation, HITL chain |
| **Classificação** | **REUSE** |
| **Motivo** | Soberano de workflows industriais. AIOI aciona `startWorkflow()` para decisões do tipo `decision_type=workflow`. Não precisa de nenhum wrapper — chamada direta. |

**O que reutilizar:**  
- `startWorkflow({ processKey, companyId, userId, context, correlationId })` — ponto de entrada direto  
- `correlationId` compartilhado com o IOE (`correlation_id`)  
- Audit trail automático via `workflowAuditTracer`  

---

### 2.7 `actionRuntimeOrchestrator`

| Atributo | Valor |
|---------|-------|
| **Localização** | `backend/src/actionRuntime/orchestration/actionRuntimeOrchestrator.js` |
| **Estado** | READY — propose→HITL→execute→trace→rollback |
| **Classificação** | **REUSE** |
| **Motivo** | Único executor de ferramentas com aprovação humana. AIOI invoca `executeToolCall(toolName, args, ctx)` para toda ação operacional. Não criar segundo executor. |

**O que reutilizar:**  
- `executeToolCall()` — ponto de entrada obrigatório  
- `actionRuntimeFlags` — modo shadow/active por `companyId`  
- `approvalQueueService` — HITL automático para ações CRITICAL  
- `actionExecutionTracer` — audit trail de execução  

---

### 2.8 `operationalLearningService`

| Atributo | Valor |
|---------|-------|
| **Localização** | `backend/src/services/operationalLearningService.js` |
| **Estado** | READY — taxas de sucesso por máquina/contexto, PostgreSQL |
| **Classificação** | **WRAP** |
| **Motivo** | Soberano de aprendizado operacional. AIOI precisa de dimensão adicional: outcomes por tipo de decisão IOE (não só por máquina). Wrapper que alimenta `operationalLearningService` com outcomes AIOI e estende via `aioi_outcomes` para versioning de pesos. |

**O que encapsular:**  
- `recordOutcome(companyId, machineId, actionType, success, contextTag)` → alimentar com outcomes de IOE  
- `getMachineSuccessRate()` → usar como feature em decision engine AIOI  
- Extensão: tabela `aioi_outcomes` como camada adicional; não substituir learning base  

**O que proibir:**  
- Proibido criar `aioiLearningService` como serviço paralelo  
- Proibido ter dois conjuntos de pesos para o mesmo par (empresa, máquina)  

---

### 2.9 `organizationalIdentityEngine`

| Atributo | Valor |
|---------|-------|
| **Localização** | `backend/src/services/organizationalIdentityEngine.js` |
| **Estado** | PARTIAL — níveis 0–5 (Presidência→Operacional); sem Conselho/Investidor/Holding |
| **Classificação** | **REUSE** |
| **Motivo** | Soberano de identidade organizacional, cargos, departamentos, setores. IOE referencia `assigned_role_id` e `hierarchy_level`. Reutilizar diretamente para ownership e escalamento. |

**O que reutilizar:**  
- `HIERARCHY_LEVELS` (0–5) → `hierarchy_level` no IOE  
- `company_roles` → `assigned_role_id` no IOE  
- `departments` / `sectors` → classificação de ownership  
- `generateInternalCode()` → código interno de referência  

**Lacuna conhecida:**  
- Níveis 6–8 (Conselho, Investidor, Holding) ausentes — não bloqueia P0; `audience_key` reservado no IOE  

---

### 2.10 `mesErpIntegrationService`

| Atributo | Valor |
|---------|-------|
| **Localização** | `backend/src/services/mesErpIntegrationService.js` |
| **Estado** | PARTIAL — webhook push, `production_shift_data`, `mes_erp_sync_log` |
| **Classificação** | **WRAP** |
| **Motivo** | Soberano de KPI MES. AIOI não calcula OEE/MTTR/MTBF — consome snapshots de `production_shift_data`. Wrapper que lê dados MES e popula `aioi_kpi_snapshots` com `truth_state` qualificado. |

**O que encapsular:**  
- `processPush()` → trigger para atualizar `aioi_kpi_snapshots` após push MES  
- `listConnectors()` → informar quais MES estão ativos (para `truth_state`)  
- Caso sem conector: `truth_state = 'telemetry_only'`; proibido inventar OEE  

---

## 3. Tabela Resumo

| Serviço | Estado | Classificação | Motivo Resumido |
|---------|--------|--------------|-----------------|
| `operationalPrioritizationService` | READY | **REUSE** | Soberano PLC score 0–100; AIOI consome diretamente |
| `operationalPatternIntelligenceService` | READY | **REUSE** | Evidência de padrões para `evidence_refs` do IOE |
| `operationalDecisionEngine` | PARTIAL | **WRAP** | Plan-centric; precisa adapter event-centric |
| `industrialEventBackbone` | READY | **BRIDGE** | W2 outbox coexiste com `aioi_outbox`; bridge bidirecional |
| `unifiedOperationalIngestionService` | READY | **BRIDGE** | Domínio cognitivo; bridge para adapter `comm_task` |
| `workflowOrchestrator` | READY | **REUSE** | Único orquestrador BPMN; AIOI aciona diretamente |
| `actionRuntimeOrchestrator` | READY | **REUSE** | Único executor HITL; AIOI não cria segundo |
| `operationalLearningService` | READY | **WRAP** | Soberano learning; AIOI estende via `aioi_outcomes` |
| `organizationalIdentityEngine` | PARTIAL | **REUSE** | Identity/RBAC base; falta Conselho/Holding (P1+) |
| `mesErpIntegrationService` | PARTIAL | **WRAP** | KPI MES soberano; AIOI gera snapshots qualificados |

---

## 4. Mapa de Dependências AIOI → Serviços Existentes

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AIOI (Camada Nova)                          │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │IOE Engine│  │Priority  │  │Decision  │  │Learning Engine   │   │
│  │(MISSING) │  │Engine    │  │Engine    │  │(MISSING)         │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
└───────┼─────────────┼─────────────┼─────────────────┼─────────────┘
        │             │             │                 │
        ▼ BRIDGE      ▼ REUSE       ▼ WRAP            ▼ WRAP
┌───────────────┐ ┌──────────────────────────────┐ ┌────────────────┐
│industrial     │ │operationalPrioritizationSvc  │ │operationalLear-│
│EventBackbone  │ │operationalPatternIntelligence │ │ningService     │
│(W2, READY)    │ │(READY)                        │ │(READY)         │
└───────────────┘ └──────────────────────────────┘ └────────────────┘
        │
        ▼ BRIDGE
┌──────────────────────────────────────────────────────────────────┐
│  unifiedOperationalIngestionService (READY) → fatos cognitivos   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  AIOI Execution Layer                                            │
│    → actionRuntimeOrchestrator (REUSE)                           │
│    → workflowOrchestrator (REUSE)                                │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  AIOI Context / Ownership                                        │
│    → organizationalIdentityEngine (REUSE)                        │
│    → mesErpIntegrationService (WRAP)                             │
│    → industrialTruthEnforcementService (REUSE)                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Módulos a criar no AIOI-P0 (não existem ainda)

| Módulo | Caminho previsto | Depende de |
|--------|-----------------|-----------|
| IOE Engine (schema + adapters) | `backend/src/aioi/ingestion/` | `operationalPrioritizationService`, `industrialEventBackbone` |
| `aioi_outbox` worker | `backend/src/aioi/worker/` | `industrialEventBackbone` (bridge) |
| Classification Engine | `backend/src/aioi/classification/` | `organizationalIdentityEngine`, `mesErpIntegrationService` |
| Priority Engine AIOI | `backend/src/aioi/priority/` | `operationalPrioritizationService` (REUSE) |
| Queue API | `backend/src/aioi/queue/` | IOE Engine |
| Decision Adapter | `backend/src/aioi/decision/` | `operationalDecisionEngine` (WRAP) |
| Learning Adapter | `backend/src/aioi/learning/` | `operationalLearningService` (WRAP) |

---

*AIOI_INTEGRATION_CATALOG — documento forense, nenhum arquivo operacional alterado.*  
*Gerado em: AIOI-GOVERNANCE-01 / Etapa 02*
