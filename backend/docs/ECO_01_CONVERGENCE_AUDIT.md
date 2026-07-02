# ECO-01 — Cognitive Ecosystem Convergence (Fase 1)

**Programa:** Cognitive Ecosystem Convergence  
**Fase:** 1 — Inventário completo de convergência  
**Data:** 2026-07-02  
**Tipo:** Auditoria read-only — **sem alterações de código**

---

## Contexto

| Marco | Estado |
|-------|--------|
| Event Governance v1 | Certificado (EG-20) |
| Grupo A cognitivo | **ONLINE** (PROMOTION-02) |
| Domínios EG-04→11 | Shadow (flags OFF) |
| Grupo B (Controller, Pulse, Backbone) | Paralelo / desacoplado |

**Event Governance v1 é infraestrutura congelada.** ECO-01 não altera Learning, Memory, Explainability, Intelligence, Executive Insights nem Knowledge Base.

---

## Decisão Fase 1

**AUDITORIA CONCLUÍDA** — inventário completo com evidências, classificação por criticidade e esforço.

**Próximo passo:** ECO-02 (Mapa de convergência detalhado) — **após aprovação** deste inventário.

---

## Perguntas respondidas (Fase 1)

### Quem ainda toma decisões fora do Governance?

| Módulo | Função | Tipo |
|--------|--------|------|
| `unifiedDecisionEngine` | `decide` | Motor paralelo |
| `operationalRealtimeCoordinator` | `processChatMessage` + Gemini routing | Bypass + IA |
| `organizationalAI` | `processMessage` + `notifyRecipients` | Bypass notificação |
| `cognitiveControllerService` | `handleCognitiveRequest` | Council paralelo |
| `unifiedOrchestrator` | `executeCognitiveFlow` | LLM + backbone |
| `pulseCognitive/cognitiveMotor` | inferência organizacional | Governança interna |
| `chatAIService` / `routes/dashboard.js` | chat + council | Bypass |

### Quem ainda possui lógica própria?

- **Pulse:** `GOVERNANCE` interno em `pulseCognitive/constants.js`
- **Event Backbone:** fila + replay sem subscriber EG
- **Workflow:** `workflowOrchestrator` publica eventos próprios
- **Conversation Context:** classificação de contexto (prompt only)
- **Executive dashboards:** agregação DB + runtime Z.27 (não Executive Insights EG)

### Quem ainda executa IA paralela?

- `runCognitiveCouncil` (múltiplos entry points)
- `organizationalAI` / `organizationalIntelligenceEngine`
- `pulseCognitive/organizationalAI.js`
- `intelligentRegistrationService.processWithAI`
- `operationalRealtimeCoordinator` (Gemini classify)
- `digitalTwinApplied` (Gemini diagnóstico)

---

## Resumo quantitativo

| Classificação | Quantidade (aprox.) |
|---------------|---------------------|
| **Integrado** (adapter EG) | 11 produtores |
| **Bypass** (notificação/decisão sem EG) | 12+ caminhos |
| **Parallel** (subsistema independente) | 8 subsistemas |
| **Legacy fallback** (shadow) | 11 adapters |

---

## Prioridades de convergência (Fases 3+)

| Prioridade | Gap | NC | Severidade | Esforço |
|------------|-----|-----|------------|---------|
| **P0** | `operationalRealtimeCoordinator` → unifiedMessaging | — | Alta | 1–2 sprints |
| **P0** | `operationalActionExecutor` bypass | NC-INT-004 | Alta | 1 sprint |
| **P1** | `organizationalAI.notifyRecipients` | — | Alta | 1–2 sprints |
| **P1** | Políticas órfãs catálogo | NC-INT-005 | Média | 0.5 sprint |
| **P2** | `unifiedDecisionEngine` + chat council | — | Média-Alta | 2–3 sprints |
| **P2** | Cognitive Controller | NC-INT-001 | Média | 2+ sprints |
| **P3** | Pulse Cognitive | NC-INT-006 | Média | 3+ sprints |
| **P3** | Event Backbone bridge | NC-INT-002 | Média | 1–2 sprints |
| **P4** | Scheduler, admin incidents, ManuIA push | — | Baixa-Média | 0.5 sprint cada |

---

## NCs INTEG-01 — reclassificação ECO

| NC | Estado | Tipo ECO |
|----|--------|----------|
| NC-INT-001 | Aberta | Convergência Controller |
| NC-INT-002 | Aberta | Convergência Backbone |
| NC-INT-003 | Aberta | Frontend audit (baixa prioridade) |
| NC-INT-004 | Aberta | **Bypass P0** |
| NC-INT-005 | Aberta | Catálogo / adapter |
| NC-INT-006 | Aberta | Convergência Pulse |
| NC-INT-007 | Parcial | Domínios ainda shadow |

---

## Documentação Fase 1

| Documento | Conteúdo |
|-----------|----------|
| [`ECO_01_PARALLEL_FLOWS_INVENTORY.md`](./ECO_01_PARALLEL_FLOWS_INVENTORY.md) | Inventário detalhado por módulo |
| [`ECO_01_CONVERGENCE_MAP.md`](./ECO_01_CONVERGENCE_MAP.md) | Mapa alvo entrada→EG→Controller→execução |
| [`ECO_01_CONVERGENCE_AUDIT.md`](./ECO_01_CONVERGENCE_AUDIT.md) | Este relatório |

---

## Regra ECO (herdada)

```
Não alterar Event Governance v1 (infraestrutura).
Convergência aditiva, módulo por módulo, com evidências.
Bypass encontrado → NC ECO → correcção em fase dedicada.
```

---

## Certificação Fase 1

```bash
cd backend
node src/tests/audit/ECO_01_CONVERGENCE_AUDIT.test.js
```

```json
{
  "convergence_audit_complete": true,
  "parallel_flows_inventoried": true,
  "bypasses_classified": true,
  "event_governance_v1_preserved": true,
  "no_code_changes": true
}
```
