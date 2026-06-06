# AIOI_SOVEREIGNTY_MAP

**Fase:** AIOI-GOVERNANCE-01 — Etapa 01  
**Data:** 2026-06-05  
**Modo:** READ-ONLY FORENSE — nenhum código alterado  
**Objetivo:** Formalizar quem é soberano de cada domínio do sistema IMPETUS/AIOI  

---

## 1. Mapa de Soberania por Domínio

| Domínio | Sistema Soberano | Evidência Código | Observações |
|---------|-----------------|-----------------|-------------|
| **PLC Priority** | `operationalPrioritizationService` + `priorityIntelligenceConfig` | `backend/src/services/operationalPrioritizationService.js` — função `computePriorityScore()` com pesos documentados; `backend/src/config/priorityIntelligenceConfig.js` | Soberania plena sobre score 0–100 e níveis (critical/high/medium/low). AIOI deve **consumir**, nunca reescrever. Nenhum outro módulo deve recalcular score PLC. |
| **Truth** | `industrialTruthEnforcementService` | `backend/src/services/industrialTruthEnforcementService.js` — regexps de claims operacionais + enforcement ativo; flags `IMPETUS_INDUSTRIAL_TRUTH_ENFORCEMENT=on` | Soberano sobre toda afirmação operacional: OEE, MTBF, MTTR, previsões, causalidade. `truth_state` é campo obrigatório no IOE. |
| **Workflow** | `workflowOrchestrator` | `backend/src/workflowEngine/orchestration/workflowOrchestrator.js` — startWorkflow, transitions, HITL chain, BPMN registry | Soberano sobre instâncias de processo, transições de estado, compensação. AIOI aciona via `decision_type=workflow`; não cria orquestrador paralelo. |
| **Execution** | `actionRuntimeOrchestrator` | `backend/src/actionRuntime/orchestration/actionRuntimeOrchestrator.js` — propose→HITL→execute→trace→rollback; `operationalToolRegistry` | Único ponto de execução de ferramentas com HITL. Soberano sobre execução, aprovação e rollback. AIOI não cria segundo executor. |
| **Learning** | `operationalLearningService` | `backend/src/services/operationalLearningService.js` — `machineOutcomes`, `machineActionStats`, `machineContextStats`, persistência PostgreSQL | Soberano sobre taxas de sucesso por máquina/contexto, pesos de outcome. AIOI estende via `aioi_outcomes` como extensão, não substituto. |
| **Queue Global** | **AIOI** (a criar) | Inexistente — nenhum arquivo `backend/src/aioi/` ou tabela `aioi_executive_queue` identificada | Será soberano criado no P0. Único dono da fila cross-domain do CEO. Depreca visões fragmentadas (F47 packs, `buildLiveFeedPriorities` isolado). |
| **Decision Global** | **AIOI** (a criar) | `operationalDecisionEngine` existente é plan-centric (sugestões), não event-centric cross-domain | AIOI será soberano da decisão baseada em IOE. `operationalDecisionEngine` permanece como componente de input, não substituto. |
| **KPI MES** | `mesErpIntegrationService` | `backend/src/services/mesErpIntegrationService.js` — processPush, createConnector, `production_shift_data`, `mes_erp_sync_log` | Soberano sobre dados MES/ERP (OEE, turnos, produção). AIOI consome snapshots; não recalcula KPI fora de dados reais MES. |
| **Identity** | `organizationalIdentityEngine` | `backend/src/services/organizationalIdentityEngine.js` — HIERARCHY_LEVELS 0–5 (Presidência→Operacional); `company_roles`, `departments`, `sectors` | Soberano sobre cargos, departamentos, setores, RBAC, `hierarchy_level`. IOE referencia `assigned_role_id` via FK. |

---

## 2. Análise de Dupla Soberania

### 2.1 Domínios sob risco de conflito

| Domínio | Soberano Atual | Candidato Conflitante | Classificação | Descrição do Conflito |
|---------|---------------|-----------------------|---------------|-----------------------|
| **Fila Executiva** | F47 pack (`buildLiveFeedPriorities`) | AIOI Queue (a criar) | **CRITICAL** | CEO pode visualizar duas listas distintas sem contrato de precedência. F47 gera packs PLC; AIOI gerará fila cross-domain. Sem regra, o CEO vê prioridades contraditórias. |
| **Score de Prioridade** | `operationalPrioritizationService` | AIOI Priority Engine (risco de recriação) | **HIGH** | Se AIOI recalcular PLC score ignorando `priorityIntelligenceConfig`, haverá dois valores de prioridade para o mesmo equipamento. |
| **Eventos Operacionais** | F44 `machine_detected_events` / packs | IOE (a criar) | **HIGH** | Sem idempotency, o mesmo evento PLC pode existir em `machine_detected_events` e em `industrial_operational_events` com estados divergentes. |
| **Decisão Operacional** | `operationalDecisionEngine` (plan-centric) | AIOI Decision Engine (event-centric) | **MEDIUM** | Dois engines gerando recomendações diferentes para o mesmo contexto. Mitigável com contrato: ODE como input do AIOI Decision. |
| **Aprendizado** | `operationalLearningService` | Risco: `aioiLearningService` (proibido criar) | **HIGH** | Se uma nova implementação de aprendizado for criada, haverá memórias de peso divergentes. Mitigação: proibir criação. |
| **Ingestão de Fatos** | `unifiedOperationalIngestionService` (chat/voz) | IOE Adapters (eventos industriais) | **MEDIUM** | Dois caminhos de memória operacional (cognitiva vs operacional industrial). Contrato: cada caminho tem domínio exclusivo. |

### 2.2 Domínios com soberania única confirmada (sem conflito)

| Domínio | Soberano | Estado |
|---------|---------|--------|
| Truth Enforcement | `industrialTruthEnforcementService` | ÚNICO — sem candidato conflitante |
| Workflow | `workflowOrchestrator` | ÚNICO — sem candidato conflitante |
| Execution / HITL | `actionRuntimeOrchestrator` | ÚNICO — proibido duplicar |
| KPI MES | `mesErpIntegrationService` | ÚNICO — AIOI consome, não recalcula |
| Identity / RBAC | `organizationalIdentityEngine` | ÚNICO — sem candidato conflitante |
| Industrial Event Bus | `industrialEventBackbone` (W2) | ÚNICO — AIOI cria `aioi_outbox` dedicado com bridge |

---

## 3. Classificação de Conflitos por Severidade

| Classificação | Domínios Afetados | Ação Obrigatória |
|--------------|-------------------|-----------------|
| **CRITICAL** | Fila Executiva (CEO) | UI única; deprecar F47 pack UI; AIOI é a fila canônica cross-domain |
| **HIGH** | Score PLC, Eventos duplicados, Aprendizado | Delegar PLC ao serviço existente; idempotency obrigatório; proibir `aioiLearningService` |
| **MEDIUM** | Decisão operacional, Ingestão | Contrato explícito: ODE como input; domínios exclusivos por tipo de fato |
| **LOW** | — | — |

---

## 4. Princípio de Soberania Única (Obrigatório)

> **Nenhum domínio pode possuir dois soberanos simultâneos.**  
> Quando um módulo AIOI for criado em área já coberta, ele deve **consumir** o soberano existente como dependência, nunca reimplementar a lógica.

### Regras derivadas:

1. AIOI Priority Engine → chama `operationalPrioritizationService.computePriorityScore()` para eventos PLC.  
2. AIOI Decision Engine → usa `operationalDecisionEngine` como fonte de planos; não substitui.  
3. AIOI Learning → estende `operationalLearningService` via `aioi_outcomes`; não cria serviço paralelo.  
4. AIOI Queue → é a **única** fila executiva visível ao CEO; F47 packs tornam-se inputs internos.  
5. AIOI Execution → delega 100% ao `actionRuntimeOrchestrator`; não executa diretamente.  
6. AIOI Workflow → aciona `workflowOrchestrator`; não cria BPM paralelo.  
7. AIOI Truth → qualifica todo IOE com `truth_state`; respeita `industrialTruthEnforcementService`.  
8. AIOI Identity → referencia `company_roles` / `organizationalIdentityEngine`; não cria segundo RBAC.

---

## 5. Mapa Visual de Soberania

```
AIOI (Orquestrador)
├── [CONSOME] operationalPrioritizationService  → Soberano: PLC Priority
├── [CONSOME] industrialTruthEnforcementService → Soberano: Truth
├── [DELEGA]  workflowOrchestrator              → Soberano: Workflow
├── [DELEGA]  actionRuntimeOrchestrator         → Soberano: Execution
├── [ESTENDE] operationalLearningService        → Soberano: Learning
├── [SOBERANO PRÓPRIO] AIOI Queue               → Domínio: Queue Global
├── [SOBERANO PRÓPRIO] AIOI Decision            → Domínio: Decision Global
├── [CONSOME] mesErpIntegrationService          → Soberano: KPI MES
└── [REFERENCIA] organizationalIdentityEngine   → Soberano: Identity
```

---

*AIOI_SOVEREIGNTY_MAP — documento forense, nenhum arquivo operacional alterado.*  
*Gerado em: AIOI-GOVERNANCE-01 / Etapa 01*
