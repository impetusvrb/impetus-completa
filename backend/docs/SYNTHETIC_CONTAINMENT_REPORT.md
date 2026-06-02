# Synthetic Containment — Fase 36-D

**Data:** 2026-06-01  
**Prioridade:** Máxima (pedido explícito)  
**Estado:** **VERIFIED** (contenção API + UI feed)

---

## Mapa synthetic (auditoria)

| Etapa | Local | `verification_state` |
|-------|--------|----------------------|
| Geração | `syntheticOperationalEventGenerator.js` | `synthetic` ✓ |
| Armazenamento timeline | `operationalContextEngine` + store | Propagado via tag F36 |
| C2 convergência | `cognitiveConvergenceFacade.js` | Eventos tagged antes de `appendOperationalContext` |
| Dashboard `/me` | `operational_context_runtime.events_sample` | `syntheticVisibilityGuard.applyToDashboardPayload` |
| Prompts cognitivos | Timeline em memória tenant | Eventos marcados `[SIM]` no `operational_context` |
| Feed UI | `LiveOperationalFeed.jsx` | `synthetic` / `verification_state === 'synthetic'` |
| PLC/KPI real | — | Synthetic **não** deve usar `source_runtime: runtime_z` sem tag |

---

## Implementação: `syntheticVisibilityGuard`

**Ficheiro:** `backend/src/services/syntheticVisibilityGuard.js`

Garantias:

- `verification_state: "synthetic"` obrigatório em eventos synthetic
- `synthetic: true`, `display_label`, `must_not_present_as_plc`, `must_not_present_as_kpi`
- Prefixo `[SIM]` em `operational_context` quando ausente
- Bloco `synthetic_containment` em payload dashboard
- `synthetic_visibility_guard` em `operational_context_runtime` e `cognitive_convergence_runtime`

---

## Onde synthetic pode chegar ao utilizador

| Superfície | Risco antes | Depois F36 |
|------------|-------------|------------|
| `GET /dashboard/me` → `operational_context_runtime` | Amostra sem label claro | Tagged + guard metadata |
| `cognitive_convergence_runtime.synthetic_memory_ratio` | Ratio alto sem aviso | `user_facing_label` quando ratio > 0 |
| Feed centro cognitivo | Só flag `ev.synthetic` opcional | Também `verification_state`, badge **SIM** |
| Chat/Council | Não injeta synthetic directamente do generator C2 | Timeline tagged; prompts devem tratar `[SIM]` |

---

## Ficheiros alterados

- `backend/src/services/syntheticVisibilityGuard.js` (novo)
- `backend/src/cognitiveRuntime/convergence/reporting/cognitiveConvergenceFacade.js`
- `backend/src/cognitiveRuntime/context/operationalContextEngine.js`
- `backend/src/routes/dashboard.js` (pós-C2 em `/me`)
- `frontend/.../LiveOperationalFeed.jsx`

**Não alterado:** `IMPETUS_C2_SYNTHETIC_EVENTS_WHEN_SPARSE` (continua default true — apenas contenção visual/semântica).

---

## Testes

```javascript
tagOperationalEvent({ verification_state: 'synthetic', operational_context: 'NC aberta' })
// → synthetic: true, display_label: 'SIMULAÇÃO · não é dado PLC/real'
```

---

## Gaps restantes

- Pulse `live_feed` (`cognitivePulseService`) usa eventos orgânicos/ living — não passa pelo generator C2; risco separado (baixo se não misturar synthetic store).
- Cockpits especializados: validar se algum widget lê timeline sem passar pelo guard (auditoria futura).

---

## Veredito

**Synthetic = VERIFIED** para propagação obrigatória na cadeia C2 → dashboard/me → UI feed.
