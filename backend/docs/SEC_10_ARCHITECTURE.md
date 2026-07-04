# SEC-10 — Arquitectura

## Camada aditiva

```
SEC-01 Observatory ──┐
SEC-02 Correlation ──┤
SEC-03 Threat Intel ─┤
SEC-04 Integrity ────┼──► securityActiveDefense/ ──► Defense Recommendations
SEC-05 Notification ─┤         (read-only consume)
SEC-06 Response ─────┤
SEC-07 SOC ──────────┘
```

**Regra:** SEC-10 **nunca** mistura código com SEC-01→09. Apenas consome APIs públicas.

---

## Componentes

| Componente | Ficheiro | Função |
|----------|----------|--------|
| Active Defense Engine | `engine/activeDefenseEngine.js` | Orquestrador consultivo |
| Attack Escalation | `engine/attackEscalationService.js` | LOW→CRITICAL |
| Threat Pattern | `engine/threatPatternService.js` | 11 padrões |
| Adaptive Surface | `engine/adaptiveSurfaceProtection.js` | `recommended_actions` |
| Security Mode Manager | `engine/securityModeManager.js` | NORMAL→PROTECTED (lógico) |
| Operator Package | `notification/operatorNotificationPackage.js` | Wellington/Gustavo |
| Adapters | `notification/adapters/notificationAdapters.js` | Preparação only |
| Collector | `collectors/secModuleCollector.js` | Read-only SEC-01→07 |

---

## Desacoplamento

- Sem imports de `eventGovernance*`, `conversationContext`, `cognitiveController`
- SEC-01→09 não importam `securityActiveDefense`
- Rollback: `SECURITY_ACTIVE_DEFENSE=false`

---

## Estados lógicos

`NORMAL` → `MONITORING` → `ELEVATED` → `DEFENSE` → `PROTECTED`

Mudança de estado **apenas em memória** — nunca altera runtime.
