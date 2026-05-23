# PROMPT — FASE Z.28 — COGNITIVE ORCHESTRATION & ADAPTIVE DELIVERY

## Pré-requisitos

- **Z.24** orchestration skeleton
- ≥1 domínio nativo verde (Quality Z.23 mínimo; ideal Quality + SST ou RH)
- Flags Z.19–Z.22 estáveis em piloto

---

## Objectivo

Runtime **adaptativo supervisionado** — decide prioridade, densidade, relevância, timing — **sem** autonomia perigosa.

---

## Implementar `backend/src/cognitiveRuntime/adaptive/`

- `adaptiveUsefulnessEngine`
- `cognitivePriorityEngine`
- `contextualAttentionResolver`
- `operationalSignalWeighting`
- `adaptiveDensityControl` (alinhar com `cockpitDensityGovernor` Z.23)
- `dynamicBlockPrioritizer`

---

## Regras determinísticas (exemplos)

| Sinal | Acção |
|-------|--------|
| Incidente grave SST | Prioridade safety ↑ |
| Auditoria crítica quality | Governance ↑ |
| SPC fora de controlo | Telemetry quality ↑ |
| Binding ratio < limiar | Fallback legacy |

Todas as regras: **versionadas, logadas, rollback por flag**.

---

## Cognitive fatigue protection

- Máx. blocos activos por perfil
- Máx. métricas por centro
- Log `COGNITIVE_FATIGUE_CAP`

---

## Proibido

- Auto-remediation
- Auto-expansion de módulos
- Self-modifying governance
- Chat enforcement

---

## Flags

```env
IMPETUS_COGNITIVE_ORCHESTRATION=off
IMPETUS_ADAPTIVE_DELIVERY=off
IMPETUS_COGNITIVE_FATIGUE_PROTECTION=on
IMPETUS_ADAPTIVE_OBSERVABILITY=on
```

---

## Testes

```bash
npm run test:adaptive-delivery
npm run test:cognitive-fatigue
npm run test:priority-engine
npm run test:dynamic-weighting
```

Validar determinismo: mesmos inputs → mesma priorização (sem `Math.random()`).

---

## Relatório final

- Orchestration funcional e estável?
- Usefulness delta mensurável?
- Governance permanece determinística?
