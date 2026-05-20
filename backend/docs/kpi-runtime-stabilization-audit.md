# Fase U — KPI Runtime Stabilization — Auditoria

**Data:** 2026-05-19  
**Escopo:** Estabilização real pós-rollout KPI (Phase T)  
**Classificação:** CRITICAL | HIGH | MEDIUM | LOW

---

## Resumo executivo

| Área | Severidade | Estado |
|------|------------|--------|
| KPI leakage residual | HIGH | `leakageSupervisor` + recomendações |
| KPI underdelivery residual | MEDIUM | `underdeliverySupervisor` |
| KPI hierarchy mismatch | HIGH | `hierarchyDeliveryStabilizer` |
| KPI authority conflicts | MEDIUM | `authorityConflictSupervisor` |
| KPI targeting inconsistencies | MEDIUM | `contextualTargetingCorrection` |
| KPI contextual ambiguity | MEDIUM | Detecção + log |
| KPI semantic drift | MEDIUM | `kpiSemanticCorrectionResolver` |
| KPI operational irrelevance | LOW | `operationalKpiRelevanceAnalyzer` |
| KPI overlap residual | HIGH | `DOMAIN_SEPARATION` rules |
| KPI delivery instability | MEDIUM | `deliveryPrecisionSupervisor` |

**Veredicto:** **APTO** para estabilização supervisionada em shadow; enforcement OFF por defeito.

---

## Dependências E→T

| Fase | Contribuição |
|------|--------------|
| T | KPI rollout, leakage/underdelivery base |
| L | precision KPI |
| P/Q/R | contextual, consistency, reliability |
| S | controlled activation canal KPI |

---

## Princípios U.10

- **Nunca** auto-remover KPIs em produção  
- **Nunca** auto-reestruturar targeting/hierarquia  
- **Sempre** detectar → sugerir → recomendar → auditar  

---

## Checklist operacional

- [ ] `IMPETUS_KPI_STABILIZATION_OBSERVABILITY=on`
- [ ] Flags enforcement U → `off`
- [ ] `npm run test:kpi-runtime-stabilization` verde
- [ ] Monitorizar `GET /api/internal/kpi-stabilization/report`
- [ ] Acções humanas apenas após revisão de recomendações

---

## Rollback

1. Flags U → `off`  
2. `pm2 reload impetus-backend --update-env`  
3. Phase T rollback se necessário (canal KPI)
