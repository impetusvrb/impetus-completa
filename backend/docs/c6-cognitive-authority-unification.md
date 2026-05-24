# C6 — Cognitive Authority Unification

**IMPETUS · Fase C6**  
**Tipo:** Aditivo · Controlado · Reversível

---

## Objectivo

Resolver a fragmentação de autoridade cognitiva: **um motor soberano (Runtime Z)**, Motor A como fallback supervisionado, Engine V2 em `retired_shadow_reference` (auditável, sem delivery activo dominante).

---

## Princípio central

| Runtime | Papel pós-C6 |
|---------|----------------|
| **Runtime Z** | Soberano · `controlled_primary_authority` |
| **Motor A** | `supervised_fallback` · rollback · resiliência |
| **Engine V2** | `retired_shadow_reference` · comparável · não domina delivery |

---

## C6.1 — Cognitive Sovereignty Runtime

`backend/src/cognitiveRuntime/sovereignty/`

- `cognitiveSovereigntyRuntime.js` — declaração de soberania, detecção de conflito multi-runtime
- `runtimeAuthorityUnifier.js` — unificação de canais (delivery, insight, timeline, graph, economic, trust, confidence, memory)

---

## C6.2 — Engine V2 Retirement

`backend/src/cognitiveRuntime/retirement/`

- `engineV2RetirementRuntime.js` — modos: `active_legacy` | `shadow_reference` | `retired_shadow_reference`
- `legacyCompetitionSuppressor.js` — detecção de competição (advisory; `executed: false`)

V2 **não é removido** do código — apenas reclassificado para shadow auditável.

---

## C6.3 — Motor A Fallback Governance

`backend/src/cognitiveRuntime/fallback/`

- `motorAFallbackGovernanceRuntime.js` — fallback supervisionado, não dominante
- `fallbackVisibilityEnforcer.js` — transparência de fallback (sem mascaramento)

---

## C6.4 — Frontend Authority Enforcement

`backend/src/cognitiveRuntime/frontendAuthority/`

- `frontendAuthorityEnforcementRuntime.js` — obediência a Runtime Z (advisory)
- `runtimeDeliveryAuthorityMap.js` — mapa widget → authority / fallback / legacy

---

## C6.5 — Governance Consolidation

`backend/src/cognitiveRuntime/governance/`

- `cognitiveGovernanceConsolidationRuntime.js` — estado único (C0–C5 agregados)
- `runtimeSovereigntyCertification.js` — certificação de unificação

---

## Integração `/dashboard/me`

Após C5:

- `cognitive_sovereignty_runtime`
- `runtime_authority_unification`
- `engine_v2_retirement_runtime`
- `motor_a_fallback_runtime`
- `frontend_authority_runtime`
- `governance_consolidation_runtime`
- `cognitive_c6_summary`

Facade: `backend/src/cognitiveRuntime/c6/cognitiveC6Facade.js`

---

## Flags

```
IMPETUS_C6_RUNTIME_SOVEREIGNTY=controlled
IMPETUS_C6_ENGINE_V2_RETIREMENT=retired_shadow_reference
IMPETUS_C6_FALLBACK_GOVERNANCE=on
IMPETUS_C6_FRONTEND_AUTHORITY=on
IMPETUS_C6_GOVERNANCE_CONSOLIDATION=on
IMPETUS_C6_OBSERVABILITY=on
```

---

## Telemetria `[COGNITIVE_C6]`

RUNTIME_SOVEREIGNTY_ESTABLISHED · AUTHORITY_UNIFIED · ENGINE_V2_RETIRED · FALLBACK_GOVERNANCE_UPDATED · FRONTEND_AUTHORITY_ENFORCED · GOVERNANCE_CONSOLIDATED · HIDDEN_LEGACY_DETECTED

---

## Rollback strategy

| Acção | Flag / procedimento |
|-------|---------------------|
| Desactivar soberania | `IMPETUS_C6_RUNTIME_SOVEREIGNTY=off` |
| Reactivar V2 delivery | `IMPETUS_C6_ENGINE_V2_RETIREMENT=shadow_reference` |
| Motor A dominante | Reverter C4/C6; Motor A permanece |
| PM2 | `pm2 reload impetus-backend --update-env` |

Nenhum rollback automático é executado.

---

## Invariantes

- Sem `AUTHORITATIVE_GLOBAL` irreversível
- Motor A e V2 permanecem no código
- Sem auto-remediation, auto-decisions, adaptive mutation
- Sem alteração estrutural React
- `enforcement_executed: false` / `advisory_only: true` onde aplicável

---

## Limitações

- C6 é camada de **governança e observabilidade** — não desliga fisicamente pipelines legacy sem flags operacionais adicionais
- Certificação depende de payloads C4/C5 já presentes em `/dashboard/me`
- Mapa de widgets reflecte estado do payload, não DOM real

---

## Readiness

| Critério | Estado |
|----------|--------|
| Runtime Z soberano (controlled) | ✔ |
| Motor A fallback-only (governado) | ✔ |
| V2 retired_shadow_reference | ✔ |
| Authority unificada (observável) | ✔ |
| Frontend convergence (certificável) | ✔ |
| Infraestrutura cognitiva unificada | ✔ |

---

## Testes

```bash
npm run test:runtime-sovereignty
npm run test:authority-unification
npm run test:engine-v2-retirement
npm run test:fallback-governance
npm run test:frontend-authority-enforcement
npm run test:governance-consolidation
```

---

*C6 — Um cérebro enterprise: Runtime Z soberano, fallback auditável, V2 em referência shadow.*
