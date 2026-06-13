# AIOI_P0_PILOT_CERTIFICATION_CRITERIA

**Fase:** AIOI-ORG-4 — P0 Production Pilot Certification  
**Etapa:** 2 — Critérios Formais de Certificação do Piloto  
**Data:** 2026-06-10  
**Modo:** CERTIFICATION FIRST · ADDITIVE ONLY

---

## 1. Introdução

Este documento define os critérios mínimos formais que devem ser satisfeitos para que a **fundação P0 do AIOI** seja considerada certificada para piloto em produção.

Os critérios são organizados em 7 domínios: IOE, Outbox, Adapters, Decision Bridge, Evidence Chain, Truth Propagation e Invariantes.

---

## 2. Domínio 1 — Integridade IOE

### PC-IOE-01: ENUMs válidos em todo IOE criado

Todo `industrial_operational_event` deve ter `source_type`, `category`, `entity_type`, `priority_band`, `truth_state`, `audience_key`, `visibility_scope` com valores pertencentes aos ENUMs canonicamente definidos em `AIOI_IOE_SPECIFICATION.md §3`.

**Falha:** `ORPHAN_IOE_EVENT` — IOE com campo ENUM inválido ou NULL não-permitido.

### PC-IOE-02: Idempotência garantida por `(company_id, idempotency_key)`

A combinação `(company_id, idempotency_key)` deve ser UNIQUE em `industrial_operational_events`. Inserções duplicadas devem ser silenciadas (`ON CONFLICT DO NOTHING`), nunca causando erro.

**Falha:** duplo insert com mesma chave causando exceção ou criando dois registros.

### PC-IOE-03: `correlation_id` obrigatório e não-vazio

Toda IOE deve ter `correlation_id` no formato `ioe-{uuid}` ou herdado do W2 envelope. Nunca NULL ou vazio.

**Falha:** `ORPHAN_IOE_EVENT` — IOE sem `correlation_id`.

### PC-IOE-04: `scores_provisional` consistente com `truth_state`

Quando `truth_state != 'grounded'`, `scores_provisional` deve ser `true`. Quando `truth_state = 'grounded'`, `scores_provisional` pode ser `false`.

**Falha:** `INVALID_TRUTH_PROPAGATION` — inconsistência truth_state vs scores_provisional.

### PC-IOE-05: Transação atômica IOE + Outbox

O INSERT de `industrial_operational_events` e o INSERT de `aioi_outbox` devem ocorrer na mesma transação. ROLLBACK total em caso de falha.

**Falha:** `BROKEN_OUTBOX_CHAIN` — IOE criado sem entrada correspondente no outbox.

---

## 3. Domínio 2 — Consistência Outbox

### PC-OUT-01: `FOR UPDATE SKIP LOCKED` obrigatório na leitura de lotes

O worker consumer deve sempre ler `aioi_outbox` com `FOR UPDATE SKIP LOCKED` para prevenir double-pick entre workers concorrentes.

**Falha:** `BROKEN_OUTBOX_CHAIN` — ausência de SKIP LOCKED.

### PC-OUT-02: Backoff exponencial em falhas

Falhas no processamento de entradas devem gerar backoff crescente: 1min → 5min → 15min. Após `MAX_ATTEMPTS=3`, status → `failed` (DLQ).

**Falha:** entradas reinseridas imediatamente sem backoff.

### PC-OUT-03: Idempotência global `UNIQUE(idempotency_key)`

A coluna `idempotency_key` em `aioi_outbox` deve ser UNIQUE globalmente (não por `company_id`). Formato: `classification:{ioe_id}`.

**Falha:** `BROKEN_OUTBOX_CHAIN` — dois registros de outbox para o mesmo IOE/consumer.

### PC-OUT-04: Estados válidos `pending→processing→delivered|failed`

O ciclo de vida do outbox deve ser estritamente: `pending → processing → delivered` (sucesso) ou `pending → processing → failed` (DLQ). Nunca saltar estados.

**Falha:** `BROKEN_OUTBOX_CHAIN` — transição de estado inválida.

### PC-OUT-05: RLS ativo antes de todo INSERT/UPDATE/SELECT no outbox

Toda query ao `aioi_outbox` deve definir `set_config('app.current_company_id', ...)` e `set_config('app.bypass_rls', 'false')` antes de operar.

**Falha:** query sem contexto de tenant → leakage de dados.

---

## 4. Domínio 3 — Adapters

### PC-ADP-01: Score PLC exclusivamente via `operationalPrioritizationService`

Nenhum adapter deve calcular `priority_score` ou `priority_band` localmente. A única fonte de score PLC é `computePriorityScore()` do `operationalPrioritizationService`.

**Falha:** `UNCLASSIFIED_ADAPTER` — adapter com cálculo local de score.

### PC-ADP-02: `evidence_refs` não-vazio em todos os adapters ativos

Todo adapter deve popular `evidence_refs` com pelo menos uma entrada contendo `{ type, ref_id, source_table, confidence }`.

**Falha:** `MISSING_EVIDENCE_REFERENCE` — adapter gerando IOE com `evidence_refs = []`.

### PC-ADP-03: MES TC-04 — `oee: null` quando `truth_state = 'telemetry_only'`

O `mesAioiAdapter` deve garantir `kpi_snapshot.oee = null` sempre que `truth_state = 'telemetry_only'`. OEE somente preenchido quando source='mes' real.

**Falha:** `INVALID_TRUTH_PROPAGATION` — OEE inventado.

### PC-ADP-04: Task/Comm adapters com `truth_state = 'provisional'`

Os adapters de tarefas e comunicação devem sempre emitir `truth_state = 'provisional'` e `scores_provisional = true` (sem telemetria real nessas fontes).

**Falha:** `INVALID_TRUTH_PROPAGATION` — task/comm adapter com truth_state grounded.

### PC-ADP-05: Nenhum adapter implementa motor de decisão ou execução local

Adapters são exclusivamente de normalização e persistência. Sem `decision`, `execute`, `approve` ou invocação de `actionRuntimeOrchestrator/workflowOrchestrator`.

**Falha:** `UNCLASSIFIED_ADAPTER` — adapter com lógica de decisão/execução.

---

## 5. Domínio 4 — Decision Bridge

### PC-DEC-01: Soberano `operationalDecisionEngine` obrigatório (WRAP)

O `aioiDecisionBridgeService` deve invocar `operationalDecisionEngine.evaluateOperationalDecisions()` como única fonte de decisão. Nenhum motor de decisão paralelo.

**Falha:** `BROKEN_DECISION_CHAIN` — decisão gerada sem consultar ODE.

### PC-DEC-02: `approved_by_user_id` e `approved_at` obrigatoriamente NULL em P0

A Decision Bridge não deve preencher os campos de aprovação HITL. Eles ficam NULL até aprovação explícita pelo utilizador.

**Falha:** `BROKEN_DECISION_CHAIN` — aprovação automática sem HITL.

### PC-DEC-03: `truth_state` propagado do IOE para o decision_payload

O campo `truth_state` do IOE deve ser incluído no `decision_payload` gerado pela Decision Bridge.

**Falha:** `INVALID_TRUTH_PROPAGATION` — decision_payload sem truth_state do IOE.

### PC-DEC-04: `evidence_refs` propagados do IOE para o context de decisão

Os `evidence_refs` do IOE devem ser consumidos pelo `aioiDecisionPayloadBuilder` para construção do contexto de decisão.

**Falha:** `MISSING_EVIDENCE_REFERENCE` — decision context sem evidence_refs do IOE.

---

## 6. Domínio 5 — Evidence Chain

### PC-EVC-01: `external_ref_id` preenchido por todos os adapters

Todo adapter deve popular `external_ref_id` com o ID do registro original na fonte (ex.: `plc_collected_data.id`, `work_orders.id`).

**Falha:** `MISSING_EVIDENCE_REFERENCE` — IOE sem rastreabilidade à fonte original.

### PC-EVC-02: `evidence_refs` array estruturado conforme spec §6

Cada entrada em `evidence_refs` deve conter `{ type, ref_id, source_table, confidence }`.

**Falha:** `MISSING_EVIDENCE_REFERENCE` — evidence_refs com estrutura inválida.

### PC-EVC-03: `correlation_id` propagado do IOE ao outbox e ao W2

O `correlation_id` do IOE deve ser copiado ao `aioi_outbox.correlation_id` na mesma transação, garantindo rastreabilidade ponta-a-ponta.

**Falha:** `MISSING_EVIDENCE_REFERENCE` — outbox com correlation_id diferente do IOE.

---

## 7. Domínio 6 — Truth Propagation

### PC-TRU-01: `truth_state` validado como ENUM em ingestão

`aioiEventIngestionService._validateIoePayload()` deve rejeitar qualquer `truth_state` fora do conjunto: `{grounded, provisional, telemetry_only, manual_override, insufficient_data}`.

**Falha:** `INVALID_TRUTH_PROPAGATION` — truth_state inválido aceito.

### PC-TRU-02: `industrialTruthEnforcementService` permanece soberano

Nenhum componente P0 deve reimplementar lógica de Truth. O `industrialTruthEnforcementService` é o único soberano. Adapters apenas qualificam `truth_state` de forma declarativa.

**Falha:** `INVALID_TRUTH_PROPAGATION` — lógica Truth reimplementada.

### PC-TRU-03: `scores_provisional = true` quando truth_state != 'grounded'

Todos os adapters e o serviço de ingestão devem garantir: se `truth_state != 'grounded'`, então `scores_provisional = true`.

**Falha:** `INVALID_TRUTH_PROPAGATION` — scores marcados como definitivos sem grounding.

---

## 8. Domínio 7 — Invariantes P0

### PC-INV-01: `runtime_enabled`, `runtime_active`, `runtime_authorized` = false

Nenhum componente P0 deve ativar ou consultar flags de runtime cognitivo.

**Falha:** `BROKEN_DECISION_CHAIN` — runtime ativado em P0.

### PC-INV-02: `cognitive_execution_allowed` = false

Nenhum componente P0 deve invocar LLM, Gemini, OpenAI ou Claude no path crítico da fila.

**Falha:** LLM invocado no path de ingestão/outbox/classificação P0.

### PC-INV-03: Queue Governance ORG-1 e Truth ORG-2 intactos

Nenhuma alteração deve comprometer os contratos Q-01..Q-05 (ORG-1) ou TC-01..TC-07 (ORG-2).

**Falha:** contrato violado.

---

## 9. Critérios Mínimos para PASS

| Domínio | Critérios | Condição de PASS |
|---------|-----------|-----------------|
| IOE | PC-IOE-01..05 | Todos obrigatórios |
| Outbox | PC-OUT-01..05 | Todos obrigatórios |
| Adapters | PC-ADP-01..05 | Todos obrigatórios |
| Decision Bridge | PC-DEC-01..04 | Todos obrigatórios |
| Evidence Chain | PC-EVC-01..03 | Todos obrigatórios |
| Truth Propagation | PC-TRU-01..03 | Todos obrigatórios |
| Invariantes | PC-INV-01..03 | Todos obrigatórios |

**Resultado global:** PASS somente se **TODOS** os 23 critérios forem satisfeitos.

---

## 10. Falhas Detectáveis (triggers automáticos)

| Código de Falha | Critérios Relacionados |
|----------------|----------------------|
| `ORPHAN_IOE_EVENT` | PC-IOE-01, PC-IOE-03 |
| `INVALID_TRUTH_PROPAGATION` | PC-IOE-04, PC-ADP-03, PC-ADP-04, PC-DEC-03, PC-TRU-01..03 |
| `MISSING_EVIDENCE_REFERENCE` | PC-ADP-02, PC-DEC-04, PC-EVC-01..03 |
| `BROKEN_OUTBOX_CHAIN` | PC-IOE-05, PC-OUT-01..05 |
| `BROKEN_DECISION_CHAIN` | PC-DEC-01, PC-DEC-02, PC-INV-01..02 |
| `UNCLASSIFIED_ADAPTER` | PC-ADP-01, PC-ADP-05 |

---

*AIOI_P0_PILOT_CERTIFICATION_CRITERIA — Etapa 2 AIOI-ORG-4.*
