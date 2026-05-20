# Fase P — Contextual Delivery Stabilization — Implementação

## Objetivo

Garantir **exatidão contextual final** na entrega de módulos, dashboards, widgets, KPIs, summaries e insights — por cargo, hierarquia, domínio funcional e `runtime_truth_state`, em modo shadow-first.

---

## Arquitetura

```
GET /dashboard/me (após E→O)
        │
        ▼
contextualDeliveryStabilizationFacade
        │
        ├── enterpriseContextualTargetingEngine
        │     ├── contextualHierarchyResolver
        │     ├── operationalAuthorityResolver
        │     └── contextualDomainTargeting
        ├── hierarchyStabilizationEngine
        ├── functionalDomainStabilizer
        ├── governedModuleTargeting
        ├── dashboardDeliveryStabilizer
        ├── stabilizedKpiResolver / stabilizedSummaryResolver / contextualInsightStabilizer
        ├── contextualConflictDetector + hierarchy + authority
        └── deliveryStabilityTelemetry
```

---

## Feature flags

| Variável | Default |
|----------|---------|
| `IMPETUS_CONTEXTUAL_DELIVERY_STABILIZATION` | off |
| `IMPETUS_HIERARCHY_STABILIZATION` | off |
| `IMPETUS_FUNCTIONAL_DOMAIN_STABILIZATION` | off |
| `IMPETUS_GOVERNED_MODULE_TARGETING` | off |
| `IMPETUS_DASHBOARD_STABILIZATION` | off |
| `IMPETUS_CONTEXTUAL_STABILIZATION_OBSERVABILITY` | **on** |

---

## API interna

`/api/internal/contextual-delivery`:

| GET | Descrição |
|-----|-----------|
| `/status` | Flags e modo |
| `/hierarchy` | Isolamento hierárquico |
| `/domains` | Estabilização funcional |
| `/modules` | Module targeting |
| `/dashboards` | Widgets/cards |
| `/kpis` | KPI stabilization |
| `/conflicts` | Conflitos contextuais |
| `/report` | Telemetria |

---

## Integração dashboard

| Rota | Bloco |
|------|--------|
| `GET /dashboard/me` | `contextual_delivery` |
| `GET /dashboard/kpis` | `contextual_delivery` (kpi) |
| `GET /dashboard/smart-summary` | `contextual_delivery` (summary) |

`visible_modules` só altera com `IMPETUS_GOVERNED_MODULE_TARGETING=on`.

---

## Métricas

- `contextual_delivery_stability`
- `hierarchy_integrity`, `authority_integrity`
- `module_targeting_precision`, `dashboard_targeting_precision`
- `KPI_targeting_precision`, `summary_targeting_precision`
- `contextual_delivery_confidence`

---

## Logs

- `CONTEXTUAL_CONFLICT_DETECTED`
- `HIERARCHY_CONFLICT_DETECTED`
- `AUTHORITY_OVERLAP_DETECTED`

---

## Testes

```bash
cd backend
npm run test:contextual-delivery-stabilization
```

Snapshots: 12 personas (executive → engineering).

---

## Rollout

1. Produção: observabilidade ON apenas.
2. Piloto: `HIERARCHY_STABILIZATION` + `FUNCTIONAL_DOMAIN_STABILIZATION`.
3. Depois: `GOVERNED_MODULE_TARGETING` por tenant.
4. Dashboard/KPI: flags separadas após métricas ≥ 0.9.

---

## Rollback

```bash
export IMPETUS_CONTEXTUAL_DELIVERY_STABILIZATION=off
export IMPETUS_HIERARCHY_STABILIZATION=off
export IMPETUS_FUNCTIONAL_DOMAIN_STABILIZATION=off
export IMPETUS_GOVERNED_MODULE_TARGETING=off
export IMPETUS_DASHBOARD_STABILIZATION=off
export IMPETUS_CONTEXTUAL_STABILIZATION_OBSERVABILITY=off
pm2 reload impetus-backend --update-env
```

Fases E→O permanecem intactas.

---

## Stack completa E→P

| Fase | Função |
|------|--------|
| E–J | Policy & operations |
| K | Semantic alignment |
| L | Delivery precision |
| M | Cognitive convergence |
| N | Enterprise operations |
| O | Runtime stabilization |
| **P** | Contextual delivery exactness |
