# SST — Relatório de Validação Cognitiva

**Componente:** `SafetyCognitivePressureAnalyzer`  
**Integração:** orquestrador + telemetria `safety_cognitive_pressure`

---

## Objetivo

Detectar sobrecarga cognitiva sem alterar WAVE 4 / cognitive budget existentes — apenas **medição e alerta assistivo**.

---

## Scores gerados

| Score | Descrição |
|-------|-----------|
| `cognitive_risk_score` | 0–100 — menu extra, vistas, eventos/min, widgets, branching, budget |
| `operational_overload_score` | saturação operacional |
| `dashboard_density_score` | densidade de dashboards |
| `overload_detected` | `true` quando risco ≥ limiar (78 backend / 78 frontend client) |

---

## Cenários de teste

- Carga moderada (`menu_extra_count: 5`, `view_count: 2`) → risco ~38, overload **não** detectado.
- Carga extrema (teste backend) → `overload_detected: true`.

---

## Recomendações

1. Manter operador em densidade **compact** (`resolveSafetyUxDensity`).
2. Se `overload_detected` em produção: reduzir itens de menu publicados e vistas simultâneas no workspace.
3. Não activar governance enforce automático — apenas ajuste manual de flags/publication.

**Decisão:** cognitivo **aceitável para shadow**; rever antes de pilot se overload persistir >24h.
