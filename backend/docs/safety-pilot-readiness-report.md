# SST — Relatório de Pilot Readiness

**Motor:** `SafetyPilotReadinessEngine`  
**Classificações:** `NOT_READY` | `SHADOW_READY` | `PILOT_READY` | `STAGED_READY` | `FULL_READY`

---

## Critérios (resumo)

| Factor | Impacto no score |
|--------|------------------|
| Health `readiness.ready` | Bloqueia se false → `NOT_READY` |
| Estágio shadow | +10 |
| Estabilidade publication ≥80% | +10 |
| UX score ≥70 | +10 |
| Overload cognitivo | −30 |
| Audience failure rate >20% | −20 |
| denied_route_rate >15% | −15 |
| abandonment >40% | −15 |
| ≥10 amostras comportamento | +5 |

---

## Estado actual (runtime)

| Ambiente | Nível típico | Notas |
|----------|--------------|-------|
| Dev (flags off) | `NOT_READY` | health: operational/navigation/publication off |
| Prod shadow (flags on) | `SHADOW_READY` → `PILOT_READY` | após amostras e UX ok |

`rollback_safe: true` em todas as classificações — sem full rollout automático.

---

## Dashboard pilot

Rota: `/app/safety/operational?view=pilot`  
Manifest: `safety_pilot_validation`  
API pack: `POST /api/safety-operational-validation/pack`

---

## Decisão operacional (Fase 12)

```
Ação sugerida: REMAIN_IN_SHADOW
Promote stage: false
Target stage (manual only): pilot — após scope registado e direção SST
```

**Não** executar `FULL_READY` nem `STAGED_READY` sem revisão enterprise explícita.

---

## Governança pilot

`SafetyPilotGovernanceRuntime` — pilot por tenant, planta, audiência, capability, maturidade.  
Endpoints: `POST /pilot/scope`, `GET /pilot/scopes`.
