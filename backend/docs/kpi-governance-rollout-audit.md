# Fase T — KPI Governance Controlled Rollout — Auditoria

**Data:** 2026-05-19  
**Escopo:** Primeiro rollout cognitivo real — canal KPI  
**Classificação:** CRITICAL | HIGH | MEDIUM | LOW

---

## Resumo executivo

| Área | Severidade | Estado |
|------|------------|--------|
| KPI leakage | HIGH | Detetado por `kpiLeakageDetector` + `domainKpiValidator` |
| KPI underdelivery | MEDIUM | `kpiUnderdeliveryDetector` |
| KPI hierarchy mismatch | HIGH | `hierarchyKpiValidator` (executive_only) |
| KPI authority conflicts | MEDIUM | `kpiAuthorityConflictDetector` |
| KPI contextual conflicts | MEDIUM | `kpiTargetingValidator` |
| KPI domain overlap | CRITICAL | Mapa `FORBIDDEN_CROSS_DOMAIN` |
| KPI targeting precision | MEDIUM | Threshold 0.7+ |
| KPI operational ambiguity | MEDIUM | Eixo `general` penalizado |
| KPI executive leakage | CRITICAL | operator + executive KPI |
| KPI cross-domain exposure | CRITICAL | hr↔operations, quality↔financial |

**Veredicto:** **APTO** para rollout supervisionado KPI com flags enforcement OFF e observabilidade ON.

---

## Dependências E→S

| Fase | Contribuição |
|------|--------------|
| L | `preciseKpiResolver`, precision KPI |
| P | contextual delivery KPI |
| Q | interchannel consistency |
| R | decision reliability |
| S | `activateChannelForTenant('kpi')` coordenado |

---

## Riscos residuais

1. **HIGH** — Activar `IMPETUS_KPI_GOVERNANCE=on` sem readiness ≥ 0.75  
2. **MEDIUM** — Estado tenant em memória (restart limpa)  
3. **LOW** — Payload legacy preservado em shadow  

---

## Checklist pré-activação KPI

- [ ] `IMPETUS_KPI_GOVERNANCE_ROLLOUT=off` (inicial)
- [ ] `IMPETUS_KPI_GOVERNANCE_OBSERVABILITY=on`
- [ ] `npm run test:kpi-governance-rollout` verde
- [ ] `GET /api/internal/kpi-rollout/readiness` ≥ threshold
- [ ] `POST /activate` com `execute` + `approved_by`
- [ ] PM2 manual: `IMPETUS_KPI_GOVERNANCE=on` + reload

---

## Rollback

1. `POST /api/internal/kpi-rollout/deactivate` com `execute` + `approved_by`  
2. `IMPETUS_KPI_GOVERNANCE=off` + `IMPETUS_KPI_GOVERNANCE_ROLLOUT=off`  
3. `pm2 reload impetus-backend --update-env`
