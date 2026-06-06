# AIOI_IOE_SPECIFICATION

**Fase:** AIOI-GOVERNANCE-01 — Etapa 03  
**Data:** 2026-06-05  
**Modo:** READ-ONLY FORENSE — nenhum código criado, nenhuma migration criada  
**Objetivo:** Congelar a especificação oficial do Industrial Operational Event (IOE)  

---

## 1. Declaração de Intenção

O **Industrial Operational Event (IOE)** é a entidade canônica central do AIOI.  
Todo evento operacional industrial — independente de origem (PLC, comunicação, OS, tarefa, MES, qualidade) — é normalizado como IOE antes de entrar na fila executiva.

> **Este documento especifica o schema, ENUMs e contratos. Nenhuma tabela é criada aqui.**

---

## 2. Schema Completo — `industrial_operational_events`

```sql
-- ESPECIFICAÇÃO APENAS — NÃO EXECUTAR
-- Tabela: industrial_operational_events

id                    UUID          PK  DEFAULT gen_random_uuid()
company_id            UUID          NOT NULL  -- FK: companies.id (RLS)
tenant_key            TEXT          NOT NULL  -- chave de tenant (redundante para RLS rápido)

-- Identificação e Rastreabilidade
idempotency_key       TEXT          NOT NULL  -- UNIQUE (company_id, idempotency_key)
correlation_id        TEXT          NOT NULL  -- liga IOE a W2 envelope e workflow
external_ref_id       TEXT          NULL      -- ID na fonte original (plc_collected_data.id, etc.)
source_type           TEXT          NOT NULL  -- ENUM: ver seção 3.1
category              TEXT          NOT NULL  -- ENUM: ver seção 3.2

-- Estado e Ciclo de Vida
status                TEXT          NOT NULL DEFAULT 'open'  -- ENUM: ver seção 3.3
truth_state           TEXT          NOT NULL DEFAULT 'provisional'  -- ENUM: ver seção 3.7
priority_band         TEXT          NOT NULL  -- ENUM: ver seção 3.4
priority_score        SMALLINT      NOT NULL DEFAULT 0  -- 0–100 (de operationalPrioritizationService)
scores_provisional    BOOLEAN       NOT NULL DEFAULT true  -- flag: score baseado em telemetria parcial

-- Scoring detalhado (campos de componentes)
score_attention       SMALLINT      NULL  -- componente attention_score (F47)
score_risk            SMALLINT      NULL  -- componente risk_score
score_event_conf      SMALLINT      NULL  -- componente event_confidence (F44)
score_pattern_conf    SMALLINT      NULL  -- componente pattern_confidence (F45)
score_telemetry_hlth  SMALLINT      NULL  -- componente telemetry_health
classification_conf   SMALLINT      NULL  -- confiança da classificação (0–100)

-- Entidade Operacional
entity_type           TEXT          NOT NULL  -- 'equipment', 'line', 'sector', 'company', 'task', 'communication'
entity_id             UUID          NULL      -- FK dinâmica conforme entity_type
equipment_id          UUID          NULL      -- FK: machines.id (desnormalizado para performance)
sector_id             UUID          NULL      -- FK: sectors.id
department_id         UUID          NULL      -- FK: departments.id

-- Ownership e Escalonamento
assigned_role_id      UUID          NULL      -- FK: company_roles.id (organizationalIdentityEngine)
hierarchy_level       SMALLINT      NULL      -- 0–5 espelhado de company_roles.hierarchy_level
audience_key          TEXT          NOT NULL DEFAULT 'ceo'  -- 'ceo' | 'board' | 'investor' | 'operational'
escalation_level      SMALLINT      NOT NULL DEFAULT 0  -- 0 = sem escalonamento

-- Multi-tenant e Isolamento
visibility_scope      TEXT          NOT NULL DEFAULT 'company'  -- 'plant' | 'company' | 'holding'

-- Evidências
evidence_refs         JSONB         NOT NULL DEFAULT '[]'::jsonb
-- Array de evidências: [{ type, ref_id, source_table, confidence, summary }]
-- Inclui: packs F44 (events), F45 (patterns), F47 (priorities), F43 (correlations)

-- Decisão
decision_type         TEXT          NULL  -- 'workflow' | 'direct_action' | 'suggest_only' | 'escalate'
decision_payload      JSONB         NULL  -- payload para actionRuntimeOrchestrator ou workflowOrchestrator
approved_by_user_id   UUID          NULL  -- HITL
approved_at           TIMESTAMPTZ   NULL

-- KPI Snapshot
kpi_snapshot          JSONB         NULL
-- { oee: null|float, mtbf: null|float, mttr: null|float, source: 'mes'|'estimated'|'unavailable' }

-- Execução
execution_trace_id    UUID          NULL  -- FK: action_execution_traces.trace_id
workflow_instance_id  UUID          NULL  -- FK: industrial_workflow_instances.id
resolved_at           TIMESTAMPTZ   NULL
resolution_notes      TEXT          NULL

-- Metadados
raw_payload           JSONB         NULL  -- payload original do adapter (truncado 64KB)
adapter_version       TEXT          NULL  -- versão do adapter que gerou o IOE
aioi_version          TEXT          NULL  -- versão do engine AIOI

-- Timestamps
created_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
expires_at            TIMESTAMPTZ   NULL  -- TTL de retenção (governance)
```

---

## 3. ENUMs

### 3.1 `source_type` — Origem do Evento

| Valor | Descrição |
|-------|-----------|
| `plc_telemetry` | Telemetria direta de PLC/SCADA (F40–47 pipeline) |
| `plc_pattern` | Padrão recorrente detectado por `operationalPatternIntelligenceService` |
| `plc_event` | Evento operacional detectado por pipeline F44 |
| `communication` | Comunicação interna (mensagens, incidentes) |
| `work_order` | Ordem de serviço / manutenção |
| `task` | Tarefa operacional vencida ou em risco |
| `mes_erp` | Dado push de MES/ERP via `mesErpIntegrationService` |
| `quality_nc` | Não conformidade de qualidade |
| `safety_event` | Evento de segurança (safety domain) |
| `environmental` | Evento ambiental/emissão |
| `manual` | Registrado manualmente por operador |
| `cognitive_ingestion` | Elevado de `unifiedOperationalIngestionService` por urgência |

### 3.2 `category` — Categoria Operacional

| Valor | Descrição |
|-------|-----------|
| `equipment_failure` | Falha ou atenção de equipamento |
| `equipment_degradation` | Degradação observada (não preditiva) |
| `production_deviation` | Desvio de produção |
| `quality_issue` | Problema de qualidade |
| `safety_incident` | Incidente de segurança |
| `maintenance_required` | Manutenção necessária evidenciada |
| `communication_risk` | Comunicação com flag de risco |
| `task_overdue` | Tarefa vencida com impacto operacional |
| `environmental_alert` | Alerta ambiental |
| `kpi_deviation` | Desvio de KPI MES confirmado |
| `system_event` | Evento de sistema/telemetria |

### 3.3 `status` — Estado do IOE

| Valor | Descrição | Transições Válidas |
|-------|-----------|-------------------|
| `open` | Novo, aguardando triagem | → `triaged`, `auto_closed` |
| `triaged` | Avaliado; aguarda decisão | → `pending_approval`, `in_progress`, `closed` |
| `pending_approval` | Aguardando aprovação HITL | → `approved`, `rejected` |
| `approved` | Aprovado para execução | → `in_progress` |
| `rejected` | Rejeitado pelo aprovador | → `closed` |
| `in_progress` | Em execução | → `resolved`, `escalated` |
| `escalated` | Escalonado para nível superior | → `in_progress`, `closed` |
| `resolved` | Resolvido com sucesso | → `closed` |
| `auto_closed` | Fechado automaticamente (TTL / sem impacto) | — |
| `closed` | Estado terminal | — |

### 3.4 `priority_band` — Banda de Prioridade

| Valor | Score IOE | Mapeamento F47 |
|-------|-----------|---------------|
| `critical` | 80–100 | Equivale a `critical` em `priorityLevelFromScore()` |
| `high` | 55–79 | Equivale a `high` |
| `medium` | 30–54 | Equivale a `medium` |
| `low` | 0–29 | Equivale a `low` |

> **Regra:** `priority_band` é sempre derivado de `priority_score` via `priorityLevelFromScore()`.  
> **Proibido:** Definir `priority_band` manualmente sem calcular `priority_score`.

### 3.5 `truth_state` — Estado de Verdade

| Valor | Descrição |
|-------|-----------|
| `grounded` | Score baseado em dados reais confirmados (MES + PLC + evidências) |
| `provisional` | Score calculado com dados parciais; sujeito a revisão |
| `telemetry_only` | Apenas telemetria PLC; sem KPI MES; scores marcados como provisórios |
| `manual_override` | Revisão manual por operador; razão documentada |
| `insufficient_data` | Dados insuficientes; IOE na fila mas sem score confiável |

> **Contrato Truth:** Qualquer IOE com `truth_state != 'grounded'` deve exibir indicador visual ao CEO.  
> `industrialTruthEnforcementService` valida afirmações antes de narrativas LLM (P3+).

### 3.6 `audience_key` — Audiência Alvo

| Valor | Descrição |
|-------|-----------|
| `ceo` | CEO / Presidência (padrão P0) |
| `operational` | Supervisão / Operacional |
| `board` | Conselho (reservado — P2+) |
| `investor` | Investidor (reservado — P2+) |

### 3.7 `decision_type` — Tipo de Decisão

| Valor | Descrição | Executor |
|-------|-----------|---------|
| `workflow` | Inicia workflow BPMN via `workflowOrchestrator` | `workflowOrchestrator.startWorkflow()` |
| `direct_action` | Executa ferramenta via `actionRuntimeOrchestrator` | `actionRuntimeOrchestrator.executeToolCall()` |
| `suggest_only` | Apenas recomendação; sem execução automática | UI CEO |
| `escalate` | Escalonar para role superior | `assigned_role_id` → `hierarchy_level - 1` |
| `null` | IOE aberto sem decisão atribuída | — |

---

## 4. `correlation_id` — Tracking de Correlação

**Formato:** `ioe-{uuid}` ou herdar de W2 envelope `correlation_id`  
**Regras:**  
- Todo IOE DEVE ter `correlation_id`  
- Se o IOE for gerado a partir de evento W2, usar o mesmo `correlation_id` do envelope  
- `correlation_id` deve ser propagado para `workflow_instance_id` e `execution_trace_id`  
- Permite rastrear: origem → IOE → decisão → execução → outcome  

---

## 5. `idempotency_key` — Regras de Idempotência

**Formato recomendado:**  
```
{source_type}:{entity_type}:{entity_id}:{event_window_bucket}
```

**Exemplo:**  
```
plc_telemetry:equipment:550e8400-e29b-41d4-a716-446655440000:2026-06-05T14:00
```

**Regras:**  
1. `UNIQUE (company_id, idempotency_key)` — constraint obrigatória na tabela  
2. Adapter deve calcular chave ANTES de INSERT  
3. Em caso de conflito (`ON CONFLICT DO NOTHING`), logar e retornar ID existente  
4. Janela temporal no bucket previne duplicatas por polling frequente  
5. Reingestão manual deve usar sufixo `-manual-{timestamp}`  

---

## 6. `evidence_refs` — Estrutura JSONB

```json
[
  {
    "type": "plc_event",
    "ref_id": "uuid-do-evento-F44",
    "source_table": "machine_detected_events",
    "confidence": 85,
    "summary": "SIGNAL_INSTABILITY observada em sensor T01"
  },
  {
    "type": "plc_pattern",
    "ref_id": "uuid-do-padrao-F45",
    "source_table": "operational_pattern_packs",
    "confidence": 72,
    "summary": "RECURRING_ALARM_ESCALATION (3x em 7 dias)"
  },
  {
    "type": "priority_pack",
    "ref_id": "uuid-do-pack-F47",
    "source_table": "priority_packs",
    "confidence": 90,
    "summary": "Priority score 87 — attention+risk+event_confidence"
  }
]
```

---

## 7. Campos de Scoring

| Campo | Tipo | Origem | Regra |
|-------|------|--------|-------|
| `priority_score` | SMALLINT 0–100 | `operationalPrioritizationService.computePriorityScore()` | Obrigatório para eventos PLC; NULL para outros (ex.: `work_order`) |
| `score_attention` | SMALLINT | `attention_score` do F47 | Componente individual |
| `score_risk` | SMALLINT | `risk_score` do F47 | Componente individual |
| `score_event_conf` | SMALLINT | `event_confidence` do F44 | Componente individual |
| `score_pattern_conf` | SMALLINT | `pattern_confidence` do F45 | Componente individual |
| `score_telemetry_hlth` | SMALLINT | `telemetry_health` | Componente individual |
| `classification_conf` | SMALLINT | Motor de classificação AIOI | Confiança na categoria atribuída |
| `scores_provisional` | BOOLEAN | Automático | `true` quando `truth_state != 'grounded'` |

---

## 8. Campos de Ownership

| Campo | Tipo | Regra |
|-------|------|-------|
| `assigned_role_id` | UUID → `company_roles.id` | Cargo responsável pelo IOE; pode ser NULL se não classificado |
| `hierarchy_level` | SMALLINT 0–5 | Espelho de `company_roles.hierarchy_level` para queries rápidas |
| `audience_key` | TEXT | Define qual dashboard exibe; padrão `'ceo'` |
| `escalation_level` | SMALLINT | Número de vezes que o IOE foi escalado |
| `visibility_scope` | TEXT | `'company'` padrão P0; `'holding'` reservado |

---

## 9. Campos Multi-Tenant

| Campo | Tipo | Regra |
|-------|------|-------|
| `company_id` | UUID | NOT NULL — RLS PostgreSQL obrigatório |
| `tenant_key` | TEXT | Redundante para RLS eficiente; sincronizado com `company_id` |
| `visibility_scope` | TEXT | Filtra visibilidade entre plantas/empresas do mesmo holding |

**RLS Policy (especificação):**
```sql
-- ESPECIFICAÇÃO APENAS
CREATE POLICY ioe_tenant_isolation ON industrial_operational_events
  USING (company_id = current_setting('app.current_company_id')::uuid);
```

---

## 10. Índices Recomendados

```sql
-- ESPECIFICAÇÃO APENAS — NÃO EXECUTAR

-- Fila executiva (query principal da UI CEO)
CREATE INDEX idx_ioe_queue ON industrial_operational_events
  (company_id, status, priority_score DESC, created_at DESC)
  WHERE status IN ('open', 'triaged', 'pending_approval');

-- Idempotência (constraint única)
CREATE UNIQUE INDEX idx_ioe_idempotency
  ON industrial_operational_events (company_id, idempotency_key);

-- Busca por equipamento
CREATE INDEX idx_ioe_equipment
  ON industrial_operational_events (company_id, equipment_id, created_at DESC)
  WHERE equipment_id IS NOT NULL;

-- Busca por correlation_id (rastreabilidade)
CREATE INDEX idx_ioe_correlation
  ON industrial_operational_events (correlation_id);

-- Retenção (TTL governance)
CREATE INDEX idx_ioe_expires
  ON industrial_operational_events (expires_at ASC)
  WHERE expires_at IS NOT NULL;

-- Status + truth_state (UI: indicadores de confiança)
CREATE INDEX idx_ioe_truth_status
  ON industrial_operational_events (company_id, truth_state, status);
```

---

## 11. Regras de Idempotência

1. **Adapter obrigatório:** Todo adapter deve calcular `idempotency_key` antes do INSERT  
2. **Constraint DB:** `UNIQUE (company_id, idempotency_key)` — conflito → retornar ID existente  
3. **ON CONFLICT:** `ON CONFLICT (company_id, idempotency_key) DO NOTHING RETURNING id`  
4. **Log de conflito:** Em caso de conflito, registrar em `aioi_idempotency_log` (id existente, adapter, timestamp)  
5. **Reingestão:** Sufixo `-reingested-{iso_timestamp}` na chave; cria novo IOE com `correlation_id` do original  
6. **Janela temporal:** Bucket de 1 hora mínimo para evitar duplicatas de polling frequente  

---

## 12. Regras de Correlation Tracking

1. Todo IOE emite evento W2 `ioe.created` via `publishIndustrialEvent()` após persist  
2. `correlation_id` é propagado: IOE → W2 envelope → workflow_instance → execution_trace  
3. Queries de rastreabilidade: `SELECT * FROM industrial_operational_events WHERE correlation_id = $1`  
4. Dashboard CEO deve exibir `correlation_id` para drill-down  
5. Workers de outcome devem correlacionar `aioi_outcomes.correlation_id = ioe.correlation_id`  

---

## 13. Contratos Truth

| Contrato | Regra |
|---------|-------|
| **TC-01** | `truth_state = 'telemetry_only'` quando não há MES conectado; proibido usar score PLC como OEE |
| **TC-02** | `scores_provisional = true` obrigatório quando `truth_state != 'grounded'` |
| **TC-03** | Narrativa LLM sobre IOE (P3+) deve passar por `industrialTruthEnforcementService` antes de exibição |
| **TC-04** | `kpi_snapshot.oee = null` quando `truth_state = 'telemetry_only'`; UI exibe "Indisponível" |
| **TC-05** | `priority_score` calculado com dados insuficientes deve ter `scores_provisional = true` |
| **TC-06** | IOE com `truth_state = 'insufficient_data'` entra na fila mas com indicador visual de baixa confiança |
| **TC-07** | Proibido exibir MTBF/MTTR no dashboard CEO sem `kpi_snapshot.source = 'mes'` |

---

## 14. Contratos F47

| Contrato | Regra |
|---------|-------|
| **F47-01** | Score PLC no IOE = resultado de `operationalPrioritizationService.computePriorityScore()` — nunca recalculado |
| **F47-02** | `evidence_refs` deve incluir ref ao pack F47 quando `source_type = 'plc_*'` |
| **F47-03** | `priority_band` derivado via `priorityLevelFromScore(priority_score)` — sem mapeamento manual |
| **F47-04** | Adapter PLC deve incluir `score_attention`, `score_risk`, `score_event_conf`, `score_pattern_conf` |
| **F47-05** | `traceability` do F47 (`buildPriorityEvidence()`) deve estar em `evidence_refs[].summary` |

---

## 15. Status da Especificação

```
IOE_SPEC_READY
```

**Justificativa:**  
- Schema completo especificado com todos os campos obrigatórios  
- ENUMs definidos para todos os domínios críticos  
- Regras de idempotência e correlation tracking documentadas  
- Contratos Truth e F47 formalizados  
- Índices recomendados definidos  
- Nenhuma migration criada — apenas especificação  

**Bloqueadores para implementação (não para especificação):**  
- Nenhum bloqueador arquitetural identificado  
- `organizationalIdentityEngine` cobre ownership P0 (níveis 0–5)  
- MES connector opcional em P0 (`truth_state = 'telemetry_only'` como fallback)  

---

*AIOI_IOE_SPECIFICATION — documento forense, nenhum código ou migration criado.*  
*Gerado em: AIOI-GOVERNANCE-01 / Etapa 03*
