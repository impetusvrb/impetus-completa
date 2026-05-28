# PROMPT 24 — Action Runtime + HITL

**Data:** 2026-05-27  
**Fase:** T2 — Action Runtime supervisionado  
**Estado:** Produção piloto — modo `on` (execução pós-aprovação HITL)

## Resumo

Runtime de execução de ferramentas IA com **tool calling governado**, **HITL** (Human-in-the-Loop), filas de aprovação, rastreio, rollback e explainability. Sem autonomia irrestrita: mutações exigem aprovação humana; modo `shadow`/`audit` impedem efeitos laterais não validados.

## Flags

| Variável | Valor piloto | Função |
|----------|--------------|--------|
| `OPERATIONAL_TOOL_CALLING_ENABLED` | `true` | Liga registry legado de tools |
| `OPERATIONAL_TOOL_SHADOW_MODE` | `false` | Shadow legado (bypass quando HITL aprovado) |
| `IMPETUS_ACTION_RUNTIME_MODE` | `on` | `off` \| `shadow` \| `audit` \| `on` |
| `IMPETUS_ACTION_RUNTIME_PILOT_TENANTS` | 3 tenants activos | Isolamento rollout |
| `IMPETUS_ACTION_RUNTIME_REQUIRE_APPROVAL_ALL` | (opcional) | Força HITL em todas as tools |
| `IMPETUS_ACTION_RUNTIME_STANDALONE` | (opcional) | Runtime sem `OPERATIONAL_TOOL_CALLING_ENABLED` |

**Rollback de flags:** repor `IMPETUS_ACTION_RUNTIME_MODE=off` ou `shadow`; manter `OPERATIONAL_TOOL_CALLING_ENABLED=false` restaura comportamento legado pré-P24.

## Modos

- **off:** orchestrator inactivo; fluxo legado em `operationalToolRegistry`.
- **shadow:** regista trace; zero side effects.
- **audit:** fila HITL + aprovação registada; execução real bloqueada.
- **on:** execução real apenas após aprovação (`requireHierarchy(4)`).

## Rotas API

| Método | Rota | RBAC |
|--------|------|------|
| GET | `/api/action-runtime/health` | Auth |
| GET | `/api/action-runtime/approvals/pending` | Auth + tenant |
| POST | `/api/action-runtime/approvals/:id/approve` | Auth + hierarchy ≤ 4 |
| POST | `/api/action-runtime/approvals/:id/reject` | Auth + hierarchy ≤ 4 |
| GET | `/api/action-runtime/traces` | Auth + tenant |
| POST | `/api/action-runtime/rollback/:traceId` | Auth + hierarchy ≤ 4 + mode `on` |

## Frontend

- **Painel:** `/app/admin/action-approvals` — `ActionApprovalDashboard.jsx`
- Menu admin: «Aprovações IA (HITL)»

## Serviços / módulos

- `backend/src/actionRuntime/config/actionRuntimeFlags.js`
- `backend/src/actionRuntime/governance/actionToolPolicyRegistry.js`
- `backend/src/actionRuntime/explainability/actionExplainabilityService.js`
- `backend/src/actionRuntime/execution/actionExecutionTracer.js`
- `backend/src/actionRuntime/execution/actionRollbackService.js`
- `backend/src/actionRuntime/hitl/approvalQueueService.js`
- `backend/src/actionRuntime/orchestration/actionRuntimeOrchestrator.js`
- `backend/src/routes/actionRuntime.js`
- Integração chat: `operationalToolRegistry.executeTool` → orchestrator

## Base de dados

Migração: `backend/migrations/ai_action_runtime_migration.sql`

- `ai_action_approval_queue`
- `ai_action_execution_traces`

## Observabilidade

- Logs: `[ACTION_RUNTIME_TRACE]`, `[ACTION_APPROVAL_QUEUE]`, `[ACTION_RUNTIME_API]`, `[ACTION_ROLLBACK]`, `[ACTION_RUNTIME_BOOT]`
- Eventos backbone (catálogo `industrialEventCatalog`): `governance.action.executed`, `governance.action.rejected`, `governance.action.rolled_back`

## Testes

```bash
cd backend && node src/tests/waveActionRuntimeHitlScenarios.js
```

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Execução não autorizada | HITL + policy por tool; modo audit/on gradual |
| Cross-tenant | Queries scoped por `company_id` |
| Rollback incompleto | Apenas tools com `rollback_supported` e metadata |
| Regressão Motor A / chat | Fallback para `executeToolApproved` legado se runtime off |

## Dependências

- PostgreSQL (tabelas HITL)
- `operationalToolRegistry` (tools existentes)
- Industrial event backbone (publicação opcional pós-execução)

## Rollback operacional

1. `IMPETUS_ACTION_RUNTIME_MODE=off` + `pm2 reload impetus-backend --update-env`
2. Rejeitar fila pendente via API ou SQL
3. Rollback por trace: `POST /api/action-runtime/rollback/:traceId` (modo `on`)

## Promoção produção (2026-05-27)

| Passo | Estado | Evidência |
|-------|--------|-----------|
| 1. Validar `audit` (sem execução) | ✅ | `audit_approved_not_executed`, 0 tarefas criadas |
| 2. Expandir pilotos | ✅ | 3 empresas activas na lista |
| 3. `IMPETUS_ACTION_RUNTIME_MODE=on` | ✅ | Execução real só após HITL |
| 4. Monitorização contínua | ✅ | `node scripts/action-runtime-monitor.js` |

**Tenants piloto:** `21dd3cee-…` (find fish), `ffd94fb8-…` (industria de teste), `511f4819-…` (Fresh & Fit).

**Monitorização (cron sugerido):**
```bash
cd /var/www/impetus-completa/backend && node scripts/action-runtime-monitor.js --json >> /var/log/impetus/action-runtime-monitor.log 2>&1
```
Alerta: exit code `2` se existirem aprovações `pending` com mais de 24h.

**Rollback:** `IMPETUS_ACTION_RUNTIME_MODE=audit` ou `off` + `pm2 reload impetus-backend --update-env`.

## Catálogo backbone (governance)

Domínio `governance` registado em `industrialEventCatalog.js`:

| Evento | Quando |
|--------|--------|
| `governance.action.executed` | Após HITL + execução real (`mode=on`) |
| `governance.action.rejected` | Rejeição humana na fila |
| `governance.action.rolled_back` | Rollback de trace executado |

Publicação centralizada: `actionRuntime/integration/governanceBackboneEvents.js`.
