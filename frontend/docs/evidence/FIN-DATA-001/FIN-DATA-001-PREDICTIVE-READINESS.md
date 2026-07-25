# FIN-DATA-001 — Predictive Readiness

**Programa:** FIN-DATA-001  
**Target:** Release 2.2+  
**Modo:** readiness only — **sem implementação**  
**Fonte:** `PREDICTIVE_READINESS` em `financeReadinessMatrix.js`

---

## Veredicto

**Readiness: not_ready**

Existem projecções de curto horizonte (projected-loss, leakage projected-impact). **Não existe modelo preditivo Finance certificado.**

---

## Capacidades auditadas

| Source | Papel | Status | Reuso em 2.2? |
|--------|-------|--------|---------------|
| forecasting | projections / alerts / health | partial | Sim, após alinhar mounts live |
| financial_leakage | projected impact | available | Sim (já no hub) |
| industrial_cost_service | projected-loss | available | Sim |
| maintenance_manuia | failure→cost | partial | Só após mapear $ |
| recommendation_engine | insights accionáveis | partial | Após intents finance |
| scenario_engine | what-if | partial | Overlay $ no shell CPL |
| economic_engines | proxy pressão | partial | Como sinal, não P&L |

---

## O que já pode alimentar 2.2 (reuse)

1. `projected-loss` + `projected-impact` no painel executivo  
2. Alertas de forecasting **quando** a API live estiver alinhada ao client  
3. Scenario shell logístico como contentor de parâmetros financeiros  

## O que não reutilizar como “preditivo Finance”

- Engines económicos C3 como se fossem ERP  
- Novos modelos ML sem fonte oficial no inventário  
- Duplicar forecasting noutro serviço Finance  

---

## Gaps

- GAP-FD-006 — Forecasting API incompleta  
- GAP-FD-010 — PdM→$ ausente  
- GAP-FD-007 — Scenario só logistics  

---

## Critério mínimo para “predictive finance”

Contrato forecasting estável + ligação ManuIA failure→cost via industrial_cost_service + overlay scenario — **depois** qualquer UI preditiva.
