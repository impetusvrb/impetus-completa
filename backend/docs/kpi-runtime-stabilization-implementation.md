# Fase U — KPI Runtime Stabilization — Implementação

## Objetivo

**Estabilizar delivery KPI real** pós Phase T: corrigir targeting residual, leakage, underdelivery e desalinhamento hierárquico/semântico — **sem enforcement automático global**.

---

## Arquitetura

```
GET /dashboard/kpis
        │
        ▼
kpiStabilizationFacade.enrichKpiRuntimeStabilization
        │
        ├── runtimeDeliveryCorrectionEngine
        ├── hierarchyDeliveryStabilizer
        ├── kpiSemanticAlignmentEngine
        ├── deliveryPrecisionSupervisor
        ├── leakageSupervisor / underdeliverySupervisor
        └── tenantStabilizationSupervisor
```

Reutiliza detetores Phase T (`kpiRollout/`) — **additive**, sem substituir.

---

## Feature flags (U.11)

| Variável | Default |
|----------|---------|
| `IMPETUS_KPI_RUNTIME_STABILIZATION` | **off** |
| `IMPETUS_KPI_SEMANTIC_ALIGNMENT` | **off** |
| `IMPETUS_KPI_HIERARCHY_STABILIZATION` | **off** |
| `IMPETUS_KPI_DELIVERY_PRECISION_SUPERVISION` | **off** |
| `IMPETUS_KPI_STABILIZATION_OBSERVABILITY` | **on** |

---

## API interna (U.8)

Base: `/api/internal/kpi-stabilization`

| GET | Rota | Descrição |
|-----|------|-----------|
| | `/status` | Estado Phase U |
| | `/precision` | Supervisão de precisão |
| | `/leakage` | Leakage residual |
| | `/underdelivery` | Underdelivery |
| | `/hierarchy` | Integridade hierárquica |
| | `/semantic-alignment` | Alinhamento semântico KPI |
| | `/tenants` | Estabilização por tenant |
| | `/report` | Relatório + telemetria |

---

## Integração `GET /dashboard/kpis` (U.9)

Blocos aditivos (prefixados para não colidir com `semantic_alignment` da Phase K):

| Bloco JSON | Conteúdo |
|------------|----------|
| `kpi_runtime_stabilization` | Estabilização geral Phase U |
| `kpi_delivery_precision` | Métricas de precisão de entrega |
| `kpi_semantic_stabilization` | Alinhamento semântico KPI |
| `kpi_hierarchy_delivery_integrity` | Integridade hierárquica |

Payload `kpis` **inalterado** em shadow.

---

## Estratégia de correção (U.2)

1. **Detectar** — leakage, underdelivery, conflitos  
2. **Sugerir** — `recommendations[]` com `auto_apply: false`  
3. **Estabilizar** — scores e telemetria  
4. **Recomendar** — supervisão humana obrigatória  

---

## Hierarquia (U.3)

Regras exemplificadas:

- executivos ≠ painel operacional puro  
- supervisão ≠ diretoria  
- operador ≠ governança executiva/financeira  
- SST ≠ ESG (separação de domínios)  

---

## Métricas (U.5 / U.6)

- `delivery_precision_score`  
- `contextual_alignment_score`  
- `hierarchy_integrity_score`  
- `semantic_relevance_score`  
- `operational_delivery_accuracy`  

Eventos: `KPI_RUNTIME_LEAKAGE_DETECTED`, `KPI_RUNTIME_UNDERDELIVERY_DETECTED`, `KPI_AUTHORITY_OVERLAP_DETECTED`, `KPI_HIERARCHY_DELIVERY_CONFLICT`

---

## Tenant-safe (U.7)

- `tenantDeliveryIsolation` — observações por tenant  
- `tenantPrecisionProtection` — sem correção cross-tenant  
- Rollback supervisionado via flags + PM2  

---

## Deploy (U.13)

```bash
npm run kpi-stabilization:deploy:dry
npm run kpi-stabilization:deploy
```

Valida: backup, frontend dist, PM2, health, KPI governance + stabilization observability.

---

## Plano de rollout

| Semana | Acção |
|--------|--------|
| 1 | Observabilidade U ON; `/report` diário |
| 2 | Revisar recomendações leakage/underdelivery |
| 3 | Tenant piloto; validar hierarchy + semantic |
| 4 | Considerar flags enforcement ON (supervisionado) |

---

## Rollback

1. Flags U → `off`  
2. PM2 reload  
3. Manter Phase T observability se KPI rollout activo  

---

## Testes

```bash
npm run test:kpi-runtime-stabilization
```

Snapshots: executive, director, coordinator, supervisor, operator, hr, quality, environmental, safety, financial, logistics, engineering.
