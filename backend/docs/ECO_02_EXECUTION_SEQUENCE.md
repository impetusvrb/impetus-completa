# ECO-02 — Sequência Oficial de Execução

**Programa:** Cognitive Ecosystem Convergence  
**Fase:** 2 — Contrato arquitectural  
**Data:** 2026-07-02

---

## Decisão

A sequência abaixo está **congelada**. Nenhuma fase ECO pode ser executada fora desta ordem. ECO-02 não implementa integração — apenas certifica o contrato.

```text
ECO-01 ✅ Inventário
ECO-02 ✅ Contrato arquitectural (esta fase)
ECO-03 → ECO-04 → ECO-05 → ECO-06 → ECO-07 → ECO-08
```

**Regra inviolável:** ECO-03 (bypasses P0/P1) **antes** de Controller, Pulse ou Event Backbone.

---

## PARTE 5 — Sequenciamento Oficial

| Ordem | Fase | Objectivo | ADR |
|-------|------|-----------|-----|
| 1 | **ECO-03** | Eliminar bypasses P0/P1 | — |
| 2 | **ECO-04** | Controller consome Event Governance | ADR-ECO-001 |
| 3 | **ECO-05** | Pulse integra camadas cognitivas EG | ADR-ECO-002 |
| 4 | **ECO-06** | Conversation Context + Knowledge Base | ADR-ECO-004 |
| 5 | **ECO-07** | Dashboards executivos → Executive Insights | ADR-ECO-003 |
| 6 | **ECO-08** | Certificação final ecossistema convergido | ADR-ECO-005 |

---

## PARTE 6 — Critérios de Aceite por Fase

### ECO-03 — Eliminar bypasses P0/P1

| Critério | Detalhe |
|----------|---------|
| **Entradas** | ECO-02 certificado; contrato congelado; Grupo A ONLINE |
| **Saídas** | Adapters CHAT_OPERATIONAL + NC_BRIDGE_MIRROR; zero bypass P0 em métricas |
| **Aprovação** | Teste audit ECO-03 pass; NC-INT-004, NC-INT-005 fechadas; shadow 7d sem regressão |
| **Bloqueio** | Qualquer alteração em `eventGovernanceExecutionService`; bypass P0 ainda activo em prod |
| **Evidências** | `docs/evidence/eco-03/`; diff métricas `unifiedMessaging` pre/post; flags ON |

**Módulos:** operationalActionExecutor, operationalRealtimeCoordinator, organizationalAI, políticas órfãs, intelligentRegistrationService (escalation).

---

### ECO-04 — Controller Consumer

| Critério | Detalhe |
|----------|---------|
| **Entradas** | ECO-03 certificado; bypasses P0/P1 eliminados |
| **Saídas** | Controller invoca EG antes de council; `ECO_CONTROLLER_EG_FIRST=true` |
| **Aprovação** | ADR-ECO-001 implementada; NC-INT-001 fechada; shadow compare 100% amostra |
| **Bloqueio** | ECO-03 incompleto; alteração APIs públicas; council sem EG em prod |
| **Evidências** | `docs/evidence/eco-04/`; logs `event_governance_controller_*`; teste audit |

**Módulos:** cognitiveControllerService, unifiedDecisionEngine, routes/dashboard council.

---

### ECO-05 — Pulse Consumer

| Critério | Detalhe |
|----------|---------|
| **Entradas** | ECO-04 certificado; Controller consumer activo |
| **Saídas** | Pulse consome Learning/Memory/Intelligence; bridge backbone; GOVERNANCE interno OFF |
| **Aprovação** | ADR-ECO-002 implementada; NC-INT-006 fechada; ingestão industrial estável |
| **Bloqueio** | ECO-04 incompleto; remoção Event Backbone (ADR-005); GOVERNANCE interno ON em prod |
| **Evidências** | `docs/evidence/eco-05/`; métricas pulse + EG correlacionadas |

**Módulos:** pulseCognitive/*, cognitiveEventBackboneService (bridge only).

---

### ECO-06 — Knowledge Base Integration

| Critério | Detalhe |
|----------|---------|
| **Entradas** | ECO-05 certificado |
| **Saídas** | Conversation Context consome KB audit API; `ECO_CONVERSATION_KB_ENRICH=true` |
| **Aprovação** | ADR-ECO-004 implementada; prompts enriquecidos auditados; sem alteração EG-19 |
| **Bloqueio** | Alteração `governanceKnowledgeBaseService`; ECO-05 incompleto |
| **Evidências** | `docs/evidence/eco-06/`; log refs KB por sessão |

**Módulos:** conversationContext/*, governanceKnowledgeBaseService (read-only).

---

### ECO-07 — Executive Consumer

| Critério | Detalhe |
|----------|---------|
| **Entradas** | ECO-06 certificado |
| **Saídas** | Dashboards consomem Executive Insights; `ECO_EXECUTIVE_INSIGHTS_ONLY=true` |
| **Aprovação** | ADR-ECO-003 implementada; NC-INT-003 fechada; KPI parity shadow ≥ 95% |
| **Bloqueio** | Alteração `governanceExecutiveInsightsService`; dashboards legacy única fonte |
| **Evidências** | `docs/evidence/eco-07/`; screenshots boardroom; teste E2E executivo |

**Módulos:** executiveDashboard, dashboardContextAdapter, cognitivePulseService, frontend audit UI.

---

### ECO-08 — Certificação Final

| Critério | Detalhe |
|----------|---------|
| **Entradas** | ECO-03 a ECO-07 certificados |
| **Saídas** | Legacy retired; `ECO_ECOSYSTEM_CERTIFIED=true`; relatório final |
| **Aprovação** | ADR-ECO-005 executada; zero NC P0/P1 abertas; 30d estável |
| **Bloqueio** | Qualquer fase anterior incompleta; remoção legacy sem evidência |
| **Evidências** | `ECO_08_ECOSYSTEM_CERTIFICATION.md`; `docs/evidence/eco-08/`; teste audit final |

---

## Gates entre fases

```text
[GATE-03] bypasses == 0 em prod P0/P1
    ↓
[GATE-04] Controller 100% EG-first
    ↓
[GATE-05] Pulse EG consume + backbone bridge
    ↓
[GATE-06] KB enrich ON em conversation
    ↓
[GATE-07] Executive Insights only dashboards
    ↓
[GATE-08] Legacy retired + certificação
```

Nenhum gate pode ser ignorado ou executado em paralelo com fase posterior.

---

## Restrições globais (todas as fases)

- ❌ Alterar Event Governance v1 (serviços core, pipeline exec)
- ❌ Alterar APIs públicas / DTOs públicos
- ❌ Alterar Controller/Pulse/Backbone **antes** da fase designada
- ✅ Feature flags reversíveis por fase
- ✅ Shadow mode obrigatório antes de enforce
- ✅ Evidências timestamped em `docs/evidence/eco-NN/`

---

## Próxima acção autorizada

**ECO-03** — única fase implementável após conclusão deste documento.

```bash
# Após aprovação humana do contrato ECO-02:
# Iniciar ECO-03 conforme ECO_02_MIGRATION_PLAN.md § Módulos P0
```

---

## Referências

- [`ECO_02_CONVERGENCE_ARCHITECTURE.md`](./ECO_02_CONVERGENCE_ARCHITECTURE.md)
- [`ECO_02_MIGRATION_PLAN.md`](./ECO_02_MIGRATION_PLAN.md)
- [`ECO_02_ADR_INDEX.md`](./ECO_02_ADR_INDEX.md)
