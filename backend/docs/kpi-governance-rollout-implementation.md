# Fase T — KPI Governance Controlled Rollout — Implementação

## Objetivo

Primeiro **rollout cognitivo real em produção** focado em **KPI governance**: entrega correcta por domínio, hierarquia, cargo e tenant — shadow-first, sem activação global automática.

---

## Arquitetura

```
GET /dashboard/kpis
        │
        ▼
kpiRolloutFacade.enrichKpiGovernanceRollout
        │
        ├── kpiTargetingValidator / hierarchyKpiValidator / domainKpiValidator
        ├── operationalKpiDeliveryValidator
        ├── kpiDeliveryStabilization (+ leakage / underdelivery / authority)
        ├── kpiPrecisionRuntime
        ├── kpiGovernanceTelemetry
        └── kpiGovernanceActivationEngine (activate/deactivate)
```

Coordenação com Phase S: `activateKpiGovernance` chama `controlledActivation.activateChannelForTenant('kpi')` quando `execute=true`.

---

## Feature flags (T.11)

| Variável | Default |
|----------|---------|
| `IMPETUS_KPI_GOVERNANCE_ROLLOUT` | **off** |
| `IMPETUS_KPI_TARGETING_VALIDATION` | **off** |
| `IMPETUS_KPI_PRECISION_RUNTIME` | **off** |
| `IMPETUS_KPI_DELIVERY_STABILIZATION` | **off** |
| `IMPETUS_KPI_GOVERNANCE_OBSERVABILITY` | **on** |
| `IMPETUS_KPI_GOVERNANCE` | off (canal legacy Phase I) |

---

## API interna

Base: `/api/internal/kpi-rollout`

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/status` | Estado Phase T |
| GET | `/readiness` | Readiness E→S + KPI score |
| GET | `/precision` | Métricas de precisão |
| GET | `/leakage` | Detecção de leakage |
| GET | `/stability` | Estabilização de entrega |
| GET | `/tenants` | Supervisão tenant |
| GET | `/report` | Relatório + telemetria |
| POST | `/activate` | Activar KPI governance |
| POST | `/deactivate` | Desactivar |

**POST /activate** exige:
- `execute: true`
- `approved_by`
- `readiness_score >= threshold` (default **0.75**)

---

## Integração runtime (T.9)

`GET /dashboard/kpis` — blocos opcionais aditivos:

- `kpi_governance`
- `kpi_precision`
- `kpi_delivery_validation`
- `kpi_targeting_integrity`

Payload `kpis` legacy **inalterado** em shadow. Filtragem de leakage só com rollout + stabilization ON.

---

## Modelo de targeting KPI

- **Domínio:** `kpiDomainRegistry` + `inferKpiDomain`  
- **Hierarquia:** `executive_only`, `min_hierarchy`, `max_hierarchy`  
- **Cross-domain:** mapa `FORBIDDEN_CROSS_DOMAIN` (ex.: financial em operator)  

---

## Tenant-safe rollout (T.7)

- `tenantKpiIsolation` — estado por tenant  
- `tenantKpiRollbackCoordinator` — rollback supervisionado  
- Sem activação cross-tenant automática  

---

## Deploy (T.13)

```bash
npm run kpi-governance:deploy:dry
npm run kpi-governance:deploy
```

Passos: backup → build frontend (opcional) → verify dist → PM2 plan/reload → health → validação KPI governance.

---

## Plano de rollout

| Etapa | Acção |
|-------|--------|
| 1 | Observabilidade ON; monitorizar `/report` |
| 2 | Tenant piloto; validar `/readiness` ≥ 0.75 |
| 3 | `POST /activate` com `approved_by` |
| 4 | `IMPETUS_KPI_GOVERNANCE=on` + PM2 reload |
| 5 | Validar `/dashboard/kpis` + leakage/stability |

---

## Rollback

1. `POST /deactivate` com `execute` + `approved_by`  
2. Flags `IMPETUS_KPI_GOVERNANCE*` → off  
3. PM2 reload  
4. Backup em `backend/backups/kpi-governance-rollout-*`

---

## Testes

```bash
npm run test:kpi-governance-rollout
```

Snapshots: executive, director, coordinator, supervisor, operator, hr, quality, environmental, safety, financial, logistics.

---

## Observabilidade

Métricas: `KPI_delivery_accuracy`, `KPI_contextual_precision`, `KPI_hierarchy_integrity`, `KPI_operational_alignment`, `KPI_delivery_confidence`, `KPI_runtime_stability`.

Eventos: `KPI_LEAKAGE_DETECTED`, `KPI_UNDERDELIVERY_DETECTED`, `KPI_AUTHORITY_CONFLICT`, `KPI_HIERARCHY_MISMATCH`, `KPI_CONTEXTUAL_AMBIGUITY`.
