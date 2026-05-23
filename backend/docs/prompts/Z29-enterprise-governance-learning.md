# PROMPT — FASE Z.29 — ENTERPRISE COGNITIVE GOVERNANCE & LEARNING

## Pré-requisitos

- **Z.28** adaptive delivery base
- Observability acumulada Z.18–Z.28
- Política de dados: learning **recommendation-first**, não auto-act

---

## Objectivo

Fechar ciclo **enterprise cognitivo supervisionado** — aprender usefulness e interação **sem** autonomia perigosa.

---

## Implementar `backend/src/cognitiveRuntime/learning/`

- `usefulnessLearningEngine` — scores por bloco/widget (agregado tenant)
- `operatorInteractionLearning` — eventos `dashboard.trackInteraction` existentes
- `cognitiveEfficiencyScoring`
- `contextualPreferenceRuntime`
- `adaptiveGovernanceLearning` — sugestões apenas, nunca mutação automática de governance

---

## Governed learning (invariantes)

| Permitido | Proibido |
|-----------|----------|
| Scores observáveis | Auto-remediation |
| Recomendações em report | Auto-expansion módulos |
| Shadow suggestions | Alterar terminal lock automaticamente |
| Rollback por flag | Self-modifying rules |

---

## Payload aditivo (exemplo)

```json
{
  "cognitive_learning_report": {
    "phase": "Z.29",
    "mode": "supervised",
    "usefulness_scores": {},
    "ignored_blocks": [],
    "recommendations": [],
    "auto_actions_taken": 0
  }
}
```

---

## Flags

```env
IMPETUS_COGNITIVE_LEARNING=off
IMPETUS_USEFULNESS_LEARNING=off
IMPETUS_GOVERNED_LEARNING=on
IMPETUS_LEARNING_OBSERVABILITY=on
```

---

## Testes

```bash
npm run test:governed-learning
npm run test:usefulness-learning
npm run test:cognitive-efficiency
npm run test:adaptive-governance-learning
```

Validar: `auto_actions_taken === 0` em todos os cenários de teste.

---

## Relatório final global (programa Z.23–Z.29)

Responder:

1. Runtime tornou-se cognitivamente adaptativo (supervisionado)?
2. Usefulness melhorou (métricas)?
3. Orchestration inteligente sem perder determinismo?
4. Governance determinística intacta?
5. Pronto para: multi-tenant expansion? cockpit specialization global? **chat cognitivo supervisionado** (ainda OFF até critérios explícitos)?

---

## Critérios sugeridos para activar chat cognitivo (futuro, pós-Z.29)

- `specialized_ratio` ≥ 0.75 em piloto quality
- `cross_domain_isolation` ≥ 0.9
- 0 leakage em regressão Z.17
- `cockpit_cognitive_health.usefulness` ≥ 0.7 estável 7 dias

**Não implementar chat nesta fase.**
