# PROMPT 25 — Industrial Workflow Engine (BPMN + State Machine)

**Data:** 2026-05-27  
**Fase:** T3 — Workflow runtime industrial (governado)  
**Estado:** `on` — produção piloto (execução real pós-HITL, 2026-05-27)

## Resumo

Motor de workflow industrial **aditivo** com definições BPMN-like (JSON), state machine **determinística**, execution graph, approval chain (HITL), compensação, recovery seguro, audit trail e eventos no backbone.

**Não substitui:** SZ4 workflow assistive, Motor A, Engine V2, Action Runtime (complementar).

## Flags

| Variável | Default piloto | Função |
|----------|----------------|--------|
| `IMPETUS_WORKFLOW_ENGINE_MODE` | `on` | `off` \| `shadow` \| `audit` \| `on` |
| `IMPETUS_WORKFLOW_ENGINE_PILOT_TENANTS` | 3 UUIDs | Rollout por tenant |

**Rollback:** `IMPETUS_WORKFLOW_ENGINE_MODE=off` + `pm2 reload impetus-backend --update-env`.

## Modos

| Modo | Comportamento |
|------|----------------|
| `off` | API responde; orchestrator inactivo para tenant |
| `shadow` | Simula transições; sem persistência |
| `audit` | Persiste grafo + audit; aprovação sem EXECUTE real |
| `on` | Transições + EXECUTE/COMPLETE após HITL |

## Processos built-in (BPMN registry)

| process_key | Uso |
|-------------|-----|
| `governance.approval_chain.v1` | Cadeia supervisor → execução |
| `operational.task_lifecycle.v1` | open → assigned → done/cancelled |

## Rotas API (`/api/workflow-engine`)

| Método | Rota | RBAC |
|--------|------|------|
| GET | `/health` | Auth |
| GET | `/definitions` | Auth |
| POST | `/instances/start` | Auth + tenant |
| POST | `/instances/:id/signal` | Auth |
| GET | `/approvals/pending` | Auth |
| POST | `/approvals/:id/approve` | hierarchy ≤ 4 |
| POST | `/approvals/:id/reject` | hierarchy ≤ 4 |
| GET | `/instances/:id/graph` | Auth |
| GET | `/instances/:id/audit` | Auth |
| POST | `/instances/:id/rollback` | hierarchy ≤ 4 |
| POST | `/instances/:id/recover` | hierarchy ≤ 3 |

## Base de dados

`backend/migrations/industrial_workflow_engine_migration.sql`

- `industrial_workflow_definitions`
- `industrial_workflow_instances`
- `industrial_workflow_execution_graph`
- `industrial_workflow_approval_chain`
- `industrial_workflow_compensation_log`
- `industrial_workflow_audit_trail`

## Serviços

- `workflowEngine/config/workflowEngineFlags.js`
- `workflowEngine/bpmn/bpmnDefinitionRegistry.js`
- `workflowEngine/stateMachine/stateMachineEngine.js`
- `workflowEngine/graph/executionGraphService.js`
- `workflowEngine/hitl/approvalChainService.js`
- `workflowEngine/compensation/compensationService.js`
- `workflowEngine/recovery/workflowRecoveryService.js`
- `workflowEngine/audit/workflowAuditTracer.js`
- `workflowEngine/orchestration/workflowOrchestrator.js`
- `workflowEngine/integration/workflowBackboneEvents.js`

## Catálogo backbone

- `governance.workflow.started`
- `governance.workflow.transitioned`
- `governance.workflow.completed`
- `governance.workflow.compensated`
- `governance.workflow.recovered`

## Garantias

| Requisito | Implementação |
|-----------|----------------|
| Execução determinística | Uma transição por `(from, event)` marcada `deterministic: true` |
| Recovery safety | `recoverInstance` — não avança estado automaticamente |
| Tenant isolation | Todas as queries com `company_id` |
| Auditabilidade | `industrial_workflow_audit_trail` + logs estruturados |
| Observabilidade | `[WORKFLOW_*]` logs + backbone events |

## Testes

```bash
cd backend && node src/tests/waveIndustrialWorkflowEngineScenarios.js
```

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Duplicar SZ4 workflow | Flags separadas; não altera SZ4 |
| Execução autónoma | HITL + modos shadow/audit |
| Estado inconsistente | Recovery read-only + compensation log |

## Promoção produção (2026-05-27)

| Passo | Estado |
|-------|--------|
| `shadow` — definições + API | ✅ |
| `audit` — persistência + HITL sem EXECUTE | ✅ (cenários de teste) |
| `on` — 3 tenants piloto | ✅ |

**Rollback:** `IMPETUS_WORKFLOW_ENGINE_MODE=off` (ou `shadow`/`audit`) + `pm2 reload impetus-backend --update-env`.

## Dependências

- PostgreSQL (migração)
- `industrialEventCatalog` (domínio `governance`)
- `requireAuth` / `requireHierarchy` (RBAC)
