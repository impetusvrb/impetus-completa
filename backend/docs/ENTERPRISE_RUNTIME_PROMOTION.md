# ENTERPRISE RUNTIME PROMOTION — PROMOTION-01

**Certificação:** PROMOTION-01 — Enterprise Runtime Promotion  
**Tipo:** Certificação de promoção operacional — **sem novas funcionalidades**  
**Execução:** 2026-07-02  
**Pré-requisitos:** Enterprise v1 ✅ · Event Governance v1 ✅ · INTEG-01 ✅

---

## Decisão formal

| Resultado | **READY COM RESSALVAS** |
|-----------|-------------------------|
| Grupo A (cognitivo EG-12→19) | **Promovível para READY** |
| Grupo B (Controller, Pulse, Backbone) | **NOT ELIGIBLE** |
| Domínios EG-04→11 | **BLOCKED** (promoção futura) |
| Alterações de código | **Nenhuma** |

### Justificação

O **Grupo A** (8 componentes: AIOI + 7 camadas cognitivas) cumpre todos os critérios de promoção: testes EG aprovados, integração pipeline comprovada (INTEG-01), sem NC Alta/Crítica directa. O plano de **Controlled Restart** está documentado com rollback.

As ressalvas reflectem: (1) Grupo B permanece em integração arquitectural futura; (2) adapters de domínio permanecem em shadow; (3) 7 NCs INTEG-01 permanecem abertas ou parcialmente resolvidas.

---

## Restrições (aplicadas)

Nenhuma alteração a algoritmos EG, matching, backbone, Learning/Memory/Intelligence, ou APIs públicas.

---

## Critérios obrigatórios

```json
{
  "event_governance_v1_preserved": true,
  "runtime_components_classified": true,
  "shadow_components_promotable": true,
  "controlled_restart_plan_available": true,
  "rollback_plan_available": true,
  "observability_preserved": true,
  "no_runtime_regressions": true
}
```

---

## PARTE 1 — Inventário

Matriz completa: [`RUNTIME_COMPONENT_MATRIX.md`](./RUNTIME_COMPONENT_MATRIX.md)

| Estado runtime | Componentes |
|----------------|-------------|
| Passive (Grupo A) | 8 flags cognitivas |
| Shadow (domínios) | 10 adapters EG-04→11C |
| Parallel (Grupo B) | Controller, Pulse, Backbone |
| Disabled | `EVENT_GOVERNANCE_EXECUTION_ENABLED` (dry-run) |

---

## PARTE 2 — Classificação

| Classificação | Count | Componentes |
|---------------|-------|-------------|
| **READY** | 8 | AIOI, Learning, Memory, Explainability, Intelligence, Policy Optimization, Executive Insights, Knowledge Base |
| **BLOCKED** | 12 | Núcleo EG + 10 domínios + frontend audit |
| **NOT ELIGIBLE** | 3 | Cognitive Controller, Pulse, Event Backbone |

---

## PARTE 3 — Plano de promoção (Grupo A)

| # | Componente | Flag | Riscos | Critério sucesso | Rollback |
|---|------------|------|--------|------------------|----------|
| 0 | AIOI | `EVENT_GOVERNANCE_AIOI` | Feed adicional | `aioi_integrated` audit OK | flag OFF |
| 1 | Learning | `EVENT_GOVERNANCE_LEARNING` | Buffer learning | métricas `learning_events` > 0 | flag OFF |
| 2 | Memory | `EVENT_GOVERNANCE_MEMORY` | Lookups memória | `memory_hits` audit | flag OFF |
| 3 | Explainability | `EVENT_GOVERNANCE_EXPLAINABILITY` | Traces XAI | `explainability_generated` | flag OFF |
| 4 | Intelligence | `EVENT_GOVERNANCE_INTELLIGENCE` | Recomendações consultivas | `governance_health_score` audit | flag OFF |
| 5 | Policy Optimization | `EVENT_GOVERNANCE_POLICY_OPTIMIZATION` | Análise políticas | `optimization_report` audit | flag OFF |
| 6 | Executive Insights | `EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS` | KPIs executivos | `executive_report` audit | flag OFF |
| 7 | Knowledge Base | `EVENT_GOVERNANCE_KNOWLEDGE_BASE` | Índice institucional | `knowledge_report` audit | flag OFF |

Procedimento restart: [`CONTROLLED_RESTART_PLAN.md`](./CONTROLLED_RESTART_PLAN.md)

---

## PARTE 4 — Enterprise Controlled Restart

- Actualização **apenas** de `.env` / flags PM2
- `pm2 restart impetus-backend --update-env`
- Sem alteração de código
- Rollback documentado (< 2 min)

---

## PARTE 5 — Validação pós-restart

Checklist em `CONTROLLED_RESTART_PLAN.md` — 7 endpoints audit + health + métricas.

---

## PARTE 6 — Reavaliação NCs INTEG-01

| NC | Estado pós-promoção Grupo A |
|----|----------------------------|
| NC-INT-001 (Controller) | **Permanece aberta** |
| NC-INT-002 (Backbone) | **Permanece aberta** |
| NC-INT-003 (Frontend) | **Permanece aberta** |
| NC-INT-004 (bypass chat) | **Permanece aberta** |
| NC-INT-005 (políticas órfãs) | **Permanece aberta** |
| NC-INT-006 (Pulse) | **Permanece aberta** |
| NC-INT-007 (shadow domínios) | **Parcialmente resolvida** — Grupo A activo; domínios permanecem shadow |

**Nenhuma correcção estrutural** aplicada nesta fase.

---

## Grupo A vs Grupo B (ajuste estratégico)

### Grupo A — Promover para READY

Camadas construídas para evoluir de flag OFF → READY via controlled restart.

### Grupo B — Integração arquitectural (não "ligar shadow")

| Componente | Objectivo futuro |
|------------|------------------|
| Cognitive Controller | Consolidar pontos de integração com EG |
| Pulse | Alinhar governança assistiva sem eliminar subsistema |
| Event Backbone | Pontes de correlação com pipeline EG |

---

## Riscos remanescentes

| Risco | Mitigação |
|-------|-----------|
| Buffers in-memory reiniciados no restart | Re-população orgânica; aceite operacional |
| Domínios ainda em shadow + legado | Não activar flags domínio nesta fase |
| Divergência Grupo B | Ciclo INTEG-02+ dedicado |

---

## Documentação gerada

| Documento | Conteúdo |
|-----------|----------|
| [`ENTERPRISE_RUNTIME_PROMOTION.md`](./ENTERPRISE_RUNTIME_PROMOTION.md) | Este relatório |
| [`RUNTIME_COMPONENT_MATRIX.md`](./RUNTIME_COMPONENT_MATRIX.md) | Inventário + classificação |
| [`CONTROLLED_RESTART_PLAN.md`](./CONTROLLED_RESTART_PLAN.md) | Procedimento PM2 |

---

## Re-execução certificação

```bash
cd backend
node src/tests/audit/PROMOTION_01_RUNTIME_PROMOTION.test.js
```

---

## Conclusão

**PROMOTION-01 aprovado como READY COM RESSALVAS.**

A promoção operacional pode iniciar **exclusivamente pelo Grupo A** via Enterprise Controlled Restart. Event Governance v1 permanece **congelado** (baseline certificada). Grupo B e domínios aguardam ciclos de integração/promoção dedicados.
