# Fase L — Precision Runtime Governance — Implementação

## Objetivo

Transformar o IMPETUS de sistema **semanticamente alinhado** (Fase K) para sistema **operacionalmente preciso** na entrega de módulos, ferramentas, widgets, KPIs, summaries e contexto cognitivo — com confiança mensurável, explainability e audit trail, em modo **shadow-first**.

---

## Arquitetura

```
Dashboard / KPI / Summary routes
        │
        ▼
precisionRuntimeFacade.js  ◄── phaseLFeatureFlags
        │
        ├── preciseModuleDeliveryEngine
        ├── governedToolVisibilityEngine
        ├── governedCardPrecisionEngine (widgets)
        ├── preciseKpiResolver
        ├── preciseSummaryEngine
        ├── governedContextualDelivery
        ├── precisionRuntimeValidator + runtimePrecisionComparator
        ├── deliveryExplainabilityEngine + runtimePrecisionAuditTrail
        └── runtimeDeliveryTelemetry
```

### Fluxo runtime (`GET /dashboard/me`)

1. Resposta legacy + Fases E–K (inalteradas).
2. `enrichDashboardMePrecision` calcula scores e compara legacy vs precise.
3. Resposta JSON ganha bloco opcional `precision_delivery` (additive).
4. `visible_modules` só altera se `IMPETUS_PRECISE_MODULE_DELIVERY=on`.

### Contextual targeting

- `runtimeContextualTargeting` + `contextualPrecisionEngine` → `contextual_precision_score`, `semantic_precision_score`, `runtime_contextual_integrity`.
- `governedContextualDelivery` → `governance_delivery_confidence`.

### Widget / card exactness

- `contextualWidgetEligibility` valida `domain` vs eixo funcional.
- Estados: `semantic_incompatibility`, `contextual_insufficiency`, `dependency_unavailable` (sem inventar dados).
- Enforcement: `IMPETUS_PRECISE_WIDGET_GOVERNANCE=on` (default OFF).

### KPI precision

- `governedKpiDependencyValidator`: source/builder, domain, generic_fallback.
- `preciseKpiResolver`: nega entrega artificial apenas com flag ON.

### Summary precision

- `summaryDependencyValidator`: provenance, sources, corporate residual.
- Indisponibilidade explicada; **não inventa contexto**.

---

## Feature flags

| Variável | Default | Efeito |
|----------|---------|--------|
| `IMPETUS_PRECISE_MODULE_DELIVERY` | off | Filtra `visible_modules` |
| `IMPETUS_PRECISE_TOOL_EXPOSURE` | off | Filtra ferramentas |
| `IMPETUS_PRECISE_WIDGET_GOVERNANCE` | off | Filtra widgets/cards |
| `IMPETUS_PRECISE_KPI_ALIGNMENT` | off | Filtra KPIs |
| `IMPETUS_PRECISE_SUMMARY_ENGINE` | off | Summary indisponível se inválido |
| `IMPETUS_RUNTIME_PRECISION_OBSERVABILITY` | **on** | Telemetria, logs, blocos JSON |

---

## API interna

Montada em `/api/internal/governance` (auth + ACL governance):

| Método | Path |
|--------|------|
| GET | `/runtime-precision/modules` |
| GET | `/runtime-precision/tools` |
| GET | `/runtime-precision/widgets` |
| GET | `/runtime-precision/kpis` |
| GET | `/runtime-precision/summaries` |
| GET | `/runtime-precision/accuracy` |
| GET | `/runtime-precision/overdelivery` |
| GET | `/runtime-precision/underdelivery` |
| GET | `/runtime-precision/report` |

Query úteis: `modules`, `axis`, `widgets` (JSON), `payload` (JSON).

---

## Métricas (telemetria)

- `delivery_precision_score`
- `contextual_accuracy_rate`
- `module_delivery_accuracy` / `widget_delivery_accuracy`
- `governance_precision_score`
- `runtime_delivery_integrity`
- `overdelivery_rate` / `underdelivery_rate`
- `contextual_uncertainty_score`

Consultar: `GET .../runtime-precision/report`.

---

## Testes

```bash
cd backend
npm run test:runtime-delivery-precision
```

Snapshots: `backend/tests/runtime-delivery-precision/snapshots/` (quality, safety, environmental, hr, executive, operational, tenant-shared).

---

## Rollout guidance

1. **Produção inicial:** apenas `IMPETUS_RUNTIME_PRECISION_OBSERVABILITY=on`.
2. Observar `precision_delivery` em logs/API interna por 7–14 dias.
3. Corrigir builders/orphans identificados na Fase K antes de flags de enforcement.
4. Piloto: `IMPETUS_PRECISE_MODULE_DELIVERY=on` num tenant.
5. Sequência sugerida: modules → tools → widgets → KPI → summary.

---

## Rollback guidance

```bash
# Desactivar enforcement e observabilidade opcional
export IMPETUS_PRECISE_MODULE_DELIVERY=off
export IMPETUS_PRECISE_TOOL_EXPOSURE=off
export IMPETUS_PRECISE_WIDGET_GOVERNANCE=off
export IMPETUS_PRECISE_KPI_ALIGNMENT=off
export IMPETUS_PRECISE_SUMMARY_ENGINE=off
export IMPETUS_RUNTIME_PRECISION_OBSERVABILITY=off

pm2 reload impetus-backend --update-env
```

- **Sem rollback automático** — flags apenas.
- Remover blocos `precision_delivery` do cliente não é necessário (ignorados se ausentes).
- Código permanece no repo (additive-only).

---

## Observabilidade

- Logs estruturados: `phaseLLogger` (`MODULE_OVERDELIVERY_DETECTED`, `TOOL_EXPOSURE_DENIED`, etc.).
- Audit trail em memória: `runtimePrecisionAuditTrail` (amostra na API report).
- Comparador legacy vs precise em cada enrich de dashboard.

---

## Integração com Fase K

- Fase K: `semantic_alignment` (publication, orphans, alignment KPI/summary).
- Fase L: `precision_delivery` (confiança de entrega, over/underdelivery, explainability).
- Ambas podem coexistir; L não desliga K nem E→J.

---

## Ficheiros principais

| Componente | Path |
|------------|------|
| Facade | `src/precisionRuntime/precisionRuntimeFacade.js` |
| Flags | `src/precisionRuntime/config/phaseLFeatureFlags.js` |
| Rotas | `src/routes/internal/runtimePrecision.js` |
| Dashboard hooks | `src/routes/dashboard.js` |
| Audit doc | `docs/runtime-delivery-precision-audit.md` |
