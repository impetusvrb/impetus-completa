# ECO-08 — Architecture Baseline Enterprise v1

**Data:** 2026-07-03 · **Status:** Baseline oficial convergida (shadow)

---

## Princípio fundador

```text
Event Governance v1 = infraestrutura congelada certificada (EG-20)
Ecossistema cognitivo = consumidores via adapters read-only / shadow
Evolução futura = novos ciclos (EG v2+), sem reabrir núcleo v1
```

---

## Diagrama convergido

```text
                    ┌─────────────────────────────────────┐
                    │     Event Governance v1 (EG-20)      │
                    │  Pipeline · Políticas · Execução       │
                    │  Learning · Memory · Explainability    │
                    │  Intelligence · PolicyOpt · ExecIns · KB │
                    └──────────────┬──────────────────────┘
                                   │ read-only / evaluate
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
    ECO-03 Adapters           ECO-04 Controller         ECO-05 Pulse
    (OAE/Chat/OrgAI)          Consumer Adapter          Consumer Adapter
         │                         │                         │
         │                    ECO-06 CCE                  ECO-07 Executive
         │                    KB Consumer                 Insights Consumer
         │                         │                         │
         └─────────────────────────┴─────────────────────────┘
                                   │
                    Shadow (flags OFF) ou Consumer (flags ON)
                                   │
                    UX / Dashboards / Notificações / Prompts
```

---

## Adapters oficiais ECO

| ID | Adapter | ADR | Flag |
|----|---------|-----|------|
| ECO-03a | `chatOperationalGovernanceAdapter` | ECO-02 | `ECO_OAE_VIA_EG` / `ECO_CHAT_VIA_EG` |
| ECO-03b | `ncBridgeMirrorGovernanceAdapter` | ECO-02 | — |
| ECO-03c | org flows via ecoConvergenceFlags | ECO-02 | `ECO_ORG_AI_VIA_EG` |
| ECO-04 | `cognitiveControllerConsumerAdapter` | ADR-ECO-001 | `ECO_CONTROLLER_VIA_EG` |
| ECO-05 | `pulseGovernanceConsumerAdapter` | ADR-ECO-002 | `ECO_PULSE_VIA_EG` |
| ECO-06 | `conversationKnowledgeConsumerAdapter` | ADR-ECO-004 | `ECO_CONTEXT_VIA_EG` |
| ECO-07 | `executiveInsightsConsumerAdapter` | ADR-ECO-003 | `ECO_EXECUTIVE_VIA_EG` |

---

## Rollback oficial

Cada flag OFF + `pm2 restart impetus-backend --update-env` restaura comportamento legacy **sem afectar** outras flags.

Documentação por fase: `ECO_03_ROLLBACK_PLAN.md` … `ECO_07_ROLLBACK.md`

---

## Observabilidade oficial

| Endpoint | Fase |
|----------|------|
| `/api/audit/eco-convergence/status` | ECO-03 |
| `/api/audit/eco-controller/status` | ECO-04 |
| `/api/audit/eco-pulse/status` | ECO-05 |
| `/api/audit/eco-context/status` | ECO-06 |
| `/api/audit/eco-executive/status` | ECO-07 |
| `/api/audit/event-governance/*` | EG-01…20 |

---

## Congelamento EG v1

**Proibido alterar** (baseline):
- `eventGovernanceService.js`
- `eventGovernanceExecutionService.js`
- Serviços cognitivos EG-13…19 (Learning → Knowledge Base)

Adapters **nunca** importados pelo núcleo — verificado em ECO-08.

---

## Roadmap

Programa ECO: **ENCERRADO** (ECO-08).

Próximos ciclos (fora baseline v1):
- Event Governance v2 (se necessário)
- Activação consumer staging → produção
- Retirement legacy (ADR-ECO-005) — **após** flags ON + 30d estável
