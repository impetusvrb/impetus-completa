# SST — Relatório de Validação Operacional

**Fase:** Safety Operational Validation & Pilot Rollout  
**Data:** 2026-05-17  
**Domínio:** `safety` (SST/EHS)  
**Modo:** assistivo — sem promoção automática de rollout

---

## Resumo executivo

Camada de **validação operacional real** implementada de forma aditiva: analytics de comportamento, orquestrador de pacote, API `/api/safety-operational-validation`, dashboard pilot (`?view=pilot`) e testes estáticos.

| Artefacto | Local |
|-----------|--------|
| Analytics backend | `backend/src/domains/safety/analytics/` |
| Analytics frontend | `frontend/src/domains/safety/analytics/` |
| API | `backend/src/routes/safetyOperationalValidation.js` |
| Dashboard | `frontend/src/domains/safety/pilot/SafetyPilotOperationalDashboard.jsx` |
| Testes backend | `npm run test:safety-operational-validation` → **9/9** |
| Testes frontend | `npm run test:safety-operational-validation` → **8/8** |

---

## Métricas coletadas (por perfil)

Perfis alvo: operador, técnico SST, coordenador, diretor, auditor.

| Métrica | Origem |
|---------|--------|
| `route_open_ms` | `SafetyOperationalBehaviorAnalytics` |
| `screen_dwell_ms` | eventos de comportamento |
| `navigation_depth` | agregados UX |
| `click_density` | validador contextual |
| `repeated_navigation` | `repeated_navigation` em summary |
| `abandonment_rate` | summary comportamento |
| `failed_navigation_attempts` | telemetria + eventos |
| `denied_route_attempts` | `noteSafetyNavigationDenied` |
| `cognitive_pressure_score` | `SafetyCognitivePressureAnalyzer` |
| `operational_focus_score` | derivado em summary |
| `runtime_visibility_resolution_ms` | observability + behavior |
| `lazy_chunk_load_ms` | eventos opcionais |
| `operational_task_completion_ms` | eventos opcionais |

---

## Comportamento operacional

- **Registo de rotas:** `markSafetyRouteOpen` no `SafetyOperationalShell` (pathname + query).
- **POST** `/api/safety-operational-validation/behavior/event` — ingestão autenticada.
- **GET** `/behavior/summary` — agregados por tenant.

Em ambiente de desenvolvimento sem flags SST, o pacote de validação pode reportar `NOT_READY` por health (`operational_off`, `navigation_off`). Em **produção shadow** (flags activas conforme `SAFETY_SHADOW_ACTIVATION_DEPLOY_REPORT.md`), espera-se `SHADOW_READY` após amostras reais.

---

## Decisão operacional (Fase 12)

| Opção | Estado |
|-------|--------|
| Permanecer em **SHADOW** | **Recomendado** |
| Avançar para **PILOT** | Condicional — tenant/planta com `safety_intelligence` + ≥10 amostras multi-perfil |
| Bloquear rollout | Se `NOT_READY` ou overload cognitivo |
| Ajustar UX / publication / audience | Se `ADJUST_UX_AND_PUBLICATION` |

**Não** promover automaticamente para `FULL` nem remover fallback navigation.

---

## Próximos passos

1. Recolher eventos reais em shadow (48–72h).
2. Reexecutar `POST /pack` por tenant piloto.
3. Registar scope em `POST /pilot/scope` antes de `ACTIVATION_STAGE=pilot` manual.
