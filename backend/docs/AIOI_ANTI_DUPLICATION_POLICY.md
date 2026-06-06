# AIOI_ANTI_DUPLICATION_POLICY

**Fase:** AIOI-GOVERNANCE-01 — Etapa 05  
**Data:** 2026-06-05  
**Modo:** READ-ONLY FORENSE — nenhum código alterado  
**Objetivo:** Eliminar antecipadamente todos os riscos de duplicação antes do P0  

---

## 1. Declaração de Política

> **O AIOI orquestra; não reimplementa.**  
> Cada domínio tem um soberano único. Qualquer implementação AIOI que reimplemente lógica já existente constitui uma **violação de política** e deve ser revertida antes do merge.

---

## 2. PRIORITY — Política Antiduplicação

### Regra Absoluta

> **NUNCA recalcular score PLC no AIOI.**  
> **SEMPRE consumir `operationalPrioritizationService`.**

### Evidência da Lógica Existente

`operationalPrioritizationService.computePriorityScore()` implementa:
```
score = (attention_score × w1) + (risk_score × w2) + (event_confidence × w3)
      + (pattern_confidence × w4) + ((100 - telemetry_health) × w5)
```
Pesos definidos em `priorityIntelligenceConfig.weights` — **calibrados e documentados para produção**.

### Contrato Obrigatório

| Regra | Descrição |
|-------|-----------|
| **P-01** | IOE para eventos PLC deve chamar `computePriorityScore(components)` e persistir resultado |
| **P-02** | `priority_band` deve ser calculado via `priorityLevelFromScore(score)` — sem mapeamento manual |
| **P-03** | `evidence_refs` deve incluir saída de `buildPriorityEvidence()` para auditoria |
| **P-04** | Adapter PLC não pode ter função local de scoring |
| **P-05** | Code review deve rejeitar qualquer PR com fórmulas de score PLC fora de `operationalPrioritizationService` |

### Risco se violado

| Classificação | **CRITICAL** |
|--------------|-------------|
| Impacto | CEO vê scores contraditórios para o mesmo equipamento |
| Mitigação | Lint rule: proibir `priority_score =` sem import de `operationalPrioritizationService` |

---

## 3. QUEUE — Política Antiduplicação

### Risco Identificado (CRITICAL)

**F47 pack** (`buildLiveFeedPriorities` / cognitive pulse packs) e **AIOI Queue** são dois mecanismos que podem exibir listas de prioridades distintas ao CEO simultaneamente.

### Estratégia Oficial de Precedência

```
┌─────────────────────────────────────────────────────────────────┐
│  ESTADO ATUAL (P0 - antes de AIOI queue ativo)                  │
│  → F47 packs continuam sendo a visão executiva do CEO           │
│                                                                 │
│  ESTADO P0 (piloto 1 tenant, AIOI ativo)                       │
│  → aioi_executive_queue_snapshot é A fila canônica do CEO       │
│  → F47 packs tornam-se INPUTS do AIOI (não visíveis diretamente)│
│                                                                 │
│  ESTADO P1+ (rollout completo)                                  │
│  → UI CEO exibe APENAS AIOI queue                               │
│  → F47 packs são dados internos; nunca exibidos em paralelo     │
└─────────────────────────────────────────────────────────────────┘
```

### Contrato Obrigatório de Precedência

| Regra | Descrição |
|-------|-----------|
| **Q-01** | Uma única tela de fila executiva por empresa — sem duas listas paralelas |
| **Q-02** | Quando `IMPETUS_AIOI_ENABLED=true` para tenant: UI CEO exibe AIOI queue |
| **Q-03** | Quando `IMPETUS_AIOI_ENABLED=false` para tenant: UI CEO continua com F47 packs |
| **Q-04** | Proibido exibir "AIOI queue" e "F47 packs" lado a lado no mesmo dashboard CEO |
| **Q-05** | Feature flag `IMPETUS_AIOI_QUEUE_ACTIVE` controla transição — padrão `false` |

### Risco se violado

| Classificação | **CRITICAL** |
|--------------|-------------|
| Impacto | CEO vê equipamento A em posição 1 na lista F47 e posição 3 na lista AIOI — perda de confiança |
| Mitigação | `Q-05` + testes de UI automatizados verificando única fonte de fila |

---

## 4. LEARNING — Política Antiduplicação

### Regra Absoluta

> **PROIBIDO criar `aioiLearningService` como serviço novo.**  
> **OBRIGATÓRIO utilizar `operationalLearningService` como soberano.**

### Evidência do Soberano Existente

`operationalLearningService` implementa:
- Taxa de sucesso por `(company_id, machine_id)` com `machineOutcomes`
- Estatísticas por tipo de ação: `machineActionStats`
- Estatísticas por contexto: `machineContextStats` (failure/maintenance/quality)
- Série temporal: `machineOutcomeTimeline` (50 eventos/máquina)
- Persistência PostgreSQL para `machineOutcomes`

### Contrato Obrigatório

| Regra | Descrição |
|-------|-----------|
| **L-01** | AIOI chama `recordOutcome(companyId, machineId, actionType, success, contextTag)` para todo IOE resolvido |
| **L-02** | AIOI usa `getMachineSuccessRate(companyId, machineId)` como feature na decision engine |
| **L-03** | Tabela `aioi_outcomes` é extensão (versions de pesos); não substitui `operationalLearningService` |
| **L-04** | Proibido: duas variáveis `successRate` para o mesmo par (company, machine) de fontes distintas |
| **L-05** | PR com `class AioiLearningService` ou `aioiLearningService.js` deve ser rejeitado automaticamente |

### Extensão Permitida (WRAP)

```
operationalLearningService (soberano)
       ↑
aioi_outcomes (extensão)
  - ioe_id (FK)
  - correlation_id
  - outcome_type ('resolved' | 'escalated' | 'rejected')
  - weight_version (versioning de pesos futuros)
  - feedback_score (0–100, avaliação do operador)
```

### Risco se violado

| Classificação | **HIGH** |
|--------------|---------|
| Impacto | Dois conjuntos de pesos divergentes → decisões contraditórias para mesma máquina |
| Mitigação | Code review + lint rule + `L-05` |

---

## 5. EXECUTION — Política Antiduplicação

### Regra Absoluta

> **PROIBIDO criar segundo executor.**  
> **OBRIGATÓRIO utilizar `actionRuntimeOrchestrator` como executor único.**

### Evidência do Soberano Existente

`actionRuntimeOrchestrator.executeToolCall()` implementa:
- Fluxo completo: propose → policy check → HITL → execute → trace → rollback
- Shadow mode por `companyId`
- `actionRuntimeFlags` para controle granular
- `approvalQueueService` para HITL
- `actionExecutionTracer` para audit trail imutável
- `operationalToolRegistry` como registro de ferramentas

### Contrato Obrigatório

| Regra | Descrição |
|-------|-----------|
| **E-01** | Todo IOE com `decision_type = 'direct_action'` chama `actionRuntimeOrchestrator.executeToolCall()` |
| **E-02** | `execution_trace_id` do IOE = `traceRecord.trace_id` retornado pelo orchestrator |
| **E-03** | Proibido chamar `operationalToolRegistry.executeTool()` diretamente do AIOI sem passar pelo orchestrator |
| **E-04** | `IMPETUS_AIOI_AUTO_EXECUTE_BAND=none` em P0 — toda execução requer HITL |
| **E-05** | PR com `executeTool()` chamado fora do `actionRuntimeOrchestrator` contexto deve ser rejeitado |

### Risco se violado

| Classificação | **CRITICAL** |
|--------------|-------------|
| Impacto | Ação executada sem HITL, sem audit trail, sem rollback — risco operacional crítico |
| Mitigação | `E-04` obrigatório P0 + `E-05` code review |

---

## 6. WORKFLOW — Política Antiduplicação

### Regra Absoluta

> **OBRIGATÓRIO reutilizar `workflowOrchestrator`.**  
> **PROIBIDO criar engine de fluxo paralelo no AIOI.**

### Evidência do Soberano Existente

`workflowOrchestrator` implementa BPMN + State Machine + compensation + HITL chain + audit trail.  
Localização: `backend/src/workflowEngine/orchestration/workflowOrchestrator.js`

### Contrato Obrigatório

| Regra | Descrição |
|-------|-----------|
| **W-01** | IOE com `decision_type = 'workflow'` chama `workflowOrchestrator.startWorkflow()` |
| **W-02** | `workflow_instance_id` do IOE = ID retornado por `startWorkflow()` |
| **W-03** | `correlation_id` do IOE é passado como `correlationId` para `startWorkflow()` |
| **W-04** | Proibido criar `aioiWorkflowEngine` ou qualquer BPMN paralelo |
| **W-05** | Novos processos BPMN para AIOI são registrados em `bpmnDefinitionRegistry` — sem engine próprio |

### Risco se violado

| Classificação | **HIGH** |
|--------------|---------|
| Impacto | Dois engines de workflow → estados inconsistentes, audit trail fragmentado |
| Mitigação | `W-04` + lint rule |

---

## 7. TRUTH — Política Antiduplicação

### Regra Absoluta

> **OBRIGATÓRIO reutilizar `industrialTruthEnforcementService`.**  
> **PROIBIDO criar lógica de validação de claims no AIOI.**

### Evidência do Soberano Existente

`industrialTruthEnforcementService` implementa:
- Regexps de claims proibidos (OEE inventado, MTBF, MTTR, causalidade, previsão)
- Regexps de claims suportados (tendência observada, anomalia observada)
- Enforcement por fase (F40–F47)
- Modo shadow/enforce configurável

### Contrato Obrigatório

| Regra | Descrição |
|-------|-----------|
| **TR-01** | `truth_state` em todo IOE — obrigatório, sem exceção |
| **TR-02** | Narrativa LLM sobre IOE (P3+) passa por `industrialTruthEnforcementService` antes de exibição |
| **TR-03** | `scores_provisional = true` quando `truth_state != 'grounded'` — verificado pelo enforcement |
| **TR-04** | Dashboard CEO P0: 100% determinístico — sem LLM no path crítico; Truth enforcement irrelevante em P0 |
| **TR-05** | Proibido criar `aioiTruthValidator` ou lógica de validação de claims no AIOI |

### Risco se violado

| Classificação | **HIGH** |
|--------------|---------|
| Impacto | CEO vê afirmações inventadas sobre OEE/parada baseadas em score PLC (sem MES) |
| Mitigação | `TR-01` obrigatório + `TR-03` em toda exibição de score |

---

## 8. Matriz de Riscos de Duplicação

| ID | Área | Descrição do Risco | Classificação | Mitigação |
|----|------|--------------------|--------------|-----------|
| R-P1 | PRIORITY | AIOI reimplementa fórmula de score PLC | **CRITICAL** | Lint rule + code review + contratos P-01/P-04 |
| R-Q1 | QUEUE | Duas filas CEO simultâneas (F47 + AIOI) | **CRITICAL** | Feature flag Q-05 + contrato Q-01/Q-04 |
| R-Q2 | QUEUE | CEO migra para AIOI queue sem desligar F47 pack UI | **HIGH** | Checklist de rollout; contrato Q-02/Q-03 |
| R-L1 | LEARNING | Criação de `aioiLearningService` paralelo | **HIGH** | Code review + contrato L-05 |
| R-L2 | LEARNING | Dois conjuntos de pesos para mesma máquina | **HIGH** | Contrato L-04 + queries de validação |
| R-E1 | EXECUTION | AIOI executa ferramentas sem passar por orchestrator | **CRITICAL** | Contrato E-01/E-03 + `E-04` (HITL obrigatório P0) |
| R-W1 | WORKFLOW | Criação de engine BPMN paralelo | **HIGH** | Contrato W-04 + lint rule |
| R-T1 | TRUTH | Afirmações inventadas em narrativa LLM (P3+) | **HIGH** | Contratos TR-01/TR-02 + enforcement ativo |
| R-T2 | TRUTH | `priority_score` exibido como OEE sem MES | **HIGH** | Contrato TR-03 + UI "Indisponível" |
| R-E2 | EVENTS | Duplicação IOE e `machine_detected_events` | **HIGH** | Idempotency_key + contrato IOE §5 |
| R-B1 | BUS | Dois outboxes sem `correlation_id` compartilhado | **MEDIUM** | Bridge bidirecional W2↔AIOI + contrato §4 |
| R-D1 | DECISION | `operationalDecisionEngine` e AIOI Decision gerando recomendações paralelas | **MEDIUM** | WRAP: ODE como input do AIOI Decision |
| R-I1 | INGESTION | `unifiedOperationalIngestionService` e IOE duplicando fatos operacionais | **MEDIUM** | Domínios exclusivos: cognitivo vs industrial |
| R-P2 | PM2 | Workers AIOI no mesmo processo HTTP (P0 temporário) | **MEDIUM** | Monitorar lag; worker dedicado P1 |
| R-T3 | TENANT | Leakage `company_id` em worker | **CRITICAL** | RLS PostgreSQL + testes de fuzz tenant |
| R-M1 | MES | OEE calculado sem conector MES | **HIGH** | `truth_state = 'telemetry_only'`; proibir OEE sem MES |

---

## 9. Checklist Obrigatório de Code Review AIOI

Para todo PR de implementação AIOI, verificar:

- [ ] `computePriorityScore()` importado de `operationalPrioritizationService` — não reimplementado  
- [ ] Sem `priority_score =` calculado localmente  
- [ ] UI CEO exibe APENAS uma fila (AIOI queue quando `AIOI_ENABLED=true`)  
- [ ] Sem `aioiLearningService` ou arquivo de learning novo  
- [ ] Toda execução passa por `actionRuntimeOrchestrator.executeToolCall()`  
- [ ] Sem engine BPMN paralelo (`aioiWorkflowEngine`, etc.)  
- [ ] `truth_state` presente em todo IOE  
- [ ] `idempotency_key` calculado antes de INSERT  
- [ ] RLS ativo em toda query de IOE (via `db.query()` existente com RLS)  
- [ ] `correlation_id` propagado de IOE → W2 → workflow → trace  

---

## 10. Veredito

```
ANTI_DUPLICATION_PASS
```

**Justificativa:**  
- Todos os domínios críticos têm soberanos identificados  
- Contratos formalizados por domínio (P, Q, L, E, W, TR)  
- Matriz de riscos completa com mitigações documentadas  
- Checklist de code review definido  
- Nenhum código duplicado identificado no estado atual (AIOI não existe ainda)  
- Política preventiva: se seguida, elimina todos os riscos CRITICAL antes do P0  

**Condição:** ANTI_DUPLICATION_PASS vale **somente** se o checklist de code review for aplicado em **todo PR** de implementação AIOI.

---

*AIOI_ANTI_DUPLICATION_POLICY — documento forense, nenhum arquivo operacional alterado.*  
*Gerado em: AIOI-GOVERNANCE-01 / Etapa 05*
