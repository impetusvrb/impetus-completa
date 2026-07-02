# ADR-ECO-002 — Pulse Consumer

**Status:** Aceite (contrato ECO-02)  
**Data:** 2026-07-02  
**Fase de implementação:** ECO-05  
**Relacionado:** ADR-005, NC-INT-006

---

## Motivação

O Pulse Cognitivo (`pulseCognitive/`) possui governança interna (`GOVERNANCE` em `constants.js`), inferência organizacional própria e dashboards executivos independentes das camadas certificadas Learning, Memory e Intelligence do Event Governance. A convergência integra Pulse como **consumidor** das camadas cognitivas EG, preservando ingestão industrial e event backbone.

---

## Arquitetura atual

```text
eventIngestion → cognitiveMotor → organizationalAI (Pulse)
                              → GOVERNANCE interno
                              → executiveDashboard (métricas próprias)
```

- **NC:** NC-INT-006  
- **EG:** não invoca `evaluatePrepareAndExecute`  
- **Backbone:** publica/consume via `cognitiveEventBackboneService` sem subscriber EG

---

## Arquitetura futura

```text
eventIngestion → normalização evento
             → evaluatePrepareAndExecute (quando política Pulse aplicável)
             → Learning / Memory / Intelligence (Grupo A ONLINE)
             → cognitiveMotor (Consumer — inferência complementar)
             → Execution → unifiedMessaging
             → executiveDashboard (métricas via Executive Insights em ECO-07)
```

Governança interna Pulse (`GOVERNANCE`) passa a **delegar** matching de política ao EG; mantém apenas lógica de ingestão industrial e agregação temporal.

---

## Impacto

| Área | Impacto |
|------|---------|
| `pulseCognitive/cognitiveMotor.js` | Consumer EG layers |
| `pulseCognitive/organizationalAI.js` | Alinhar com organizationalAI ECO-03 |
| `pulseCognitive/constants.js` | GOVERNANCE → feature flag legacy |
| `cognitiveEventBackboneService.js` | Bridge publisher → entrada EG (ECO-05) |
| Event Backbone | **Permanece** (ADR-005); não removido |

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Perda de latência ingestão industrial | EG async para eventos não-críticos |
| Dupla governança durante migração | Flag `ECO_PULSE_EG_CONSUME` gradual |
| Dashboards Pulse desalinhados | ECO-07 unifica fonte Executive Insights |

---

## Estratégia de migração

1. **Pré-requisito:** ECO-04 (Controller consumer) completo.
2. **Bridge Backbone:** publishers existentes normalizam para `GovernanceEvent`.
3. **Shadow:** Pulse invoca Learning/Memory em paralelo; compara scores.
4. **Consume:** Flag `ECO_PULSE_EG_CONSUME=true`; desactiva GOVERNANCE interno.
5. **Retirement GOVERNANCE interno:** ECO-08 com ADR-ECO-005.

**Estratégia:** Consumer + Adapter (bridge backbone).

**Rollback:** `ECO_PULSE_EG_CONSUME=false` + GOVERNANCE interno ON.

---

## Alternativas descartadas

| Alternativa | Motivo |
|-------------|--------|
| Substituir Pulse por EG | Perde ingestão industrial especializada |
| Pulse como produtor único | Não cobre domínios já integrados (11 adapters) |
| Desactivar Pulse | Quebra telemetria e executive pulse |

---

## Referências

- `backend/src/services/pulseCognitive/`
- `backend/src/services/cognitiveEventBackboneService.js`
- [`ECO_02_MIGRATION_PLAN.md`](../ECO_02_MIGRATION_PLAN.md)
