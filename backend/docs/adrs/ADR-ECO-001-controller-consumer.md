# ADR-ECO-001 — Controller Consumer

**Status:** Aceite (contrato ECO-02)  
**Data:** 2026-07-02  
**Fase de implementação:** ECO-04  
**Relacionado:** ADR-004, ADR-005, NC-INT-001

---

## Motivação

O `cognitiveControllerService` executa `runCognitiveCouncil` e decisões paralelas sem consumir o resultado de `evaluatePrepareAndExecute`. Isto cria dois motores de decisão cognitiva: Event Governance v1 (certificado) e o Controller (paralelo). A convergência exige que o Controller **consuma** decisões governadas, não as substitua.

---

## Arquitetura atual

```text
Pedido cognitivo → cognitiveControllerService.handleCognitiveRequest
                 → unifiedDecisionEngine.decide (opcional)
                 → runCognitiveCouncil
                 → eventPipelineGovernanceService (sensor apenas)
                 → resposta LLM / acção directa
```

- **NC:** NC-INT-001  
- **Pipeline EG:** não invocado  
- **Risco:** decisões operacionais sem política, audit trail incompleto

---

## Arquitetura futura

```text
Pedido cognitivo → normalização GovernanceEvent
                 → evaluatePrepareAndExecute (EG v1)
                 → resultado governado (allow/deny/escalate + contexto)
                 → cognitiveControllerService (Consumer)
                    • se allow + requires_llm → runCognitiveCouncil
                    • se deny → resposta bloqueada auditada
                    • se escalate → executores EG já disparados
                 → Execution (unifiedMessaging via executores)
```

O Controller torna-se **orquestrador pós-decisão**, não produtor de decisão operacional.

---

## Impacto

| Área | Impacto |
|------|---------|
| `cognitiveControllerService.js` | Novo path consumer; council só após EG |
| `unifiedDecisionEngine.js` | Deprecar `decide` como autoridade; usar como helper |
| `routes/dashboard.js`, chat council | Entry points redireccionados |
| APIs públicas | **Sem alteração** — comportamento interno |
| Performance | +1 round-trip EG; mitigado por cache de política |

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Regressão em chat executivo | Shadow mode `ECO_CONTROLLER_EG_FIRST` |
| Latência council | Timeout EG configurável; fallback auditado OFF em prod |
| Decisões legadas sem evento | Adapter de entrada normaliza pedidos antigos |

---

## Estratégia de migração

1. **Pré-requisito:** ECO-03 completo (bypasses P0/P1 eliminados).
2. **Fase shadow:** Controller invoca EG em paralelo; compara decisões; não altera saída.
3. **Fase consume:** Flag `ECO_CONTROLLER_EG_FIRST=true`; council só se EG allow.
4. **Fase enforce:** Remover path directo `decide` → council sem EG.
5. **Evidência:** testes audit ECO-04 + métricas `event_governance_controller_*`.

**Estratégia:** Consumer (não Replacement).

**Rollback:** `ECO_CONTROLLER_EG_FIRST=false` restaura comportamento actual.

---

## Alternativas descartadas

| Alternativa | Motivo |
|-------------|--------|
| Fundir Controller no EG | Violaria infraestrutura congelada |
| EG invocar council internamente | Alteraria pipeline certificado |
| Manter paralelo indefinidamente | NC-INT-001 permanece; ecossistema não converge |

---

## Referências

- `backend/src/services/cognitiveControllerService.js`
- `backend/src/services/unifiedDecisionEngine.js`
- [`ECO_02_DEPENDENCY_MATRIX.md`](../ECO_02_DEPENDENCY_MATRIX.md)
