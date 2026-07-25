# FIN-DATA-001 — Financial Digital Twin Readiness

**Programa:** FIN-DATA-001  
**Target:** Release 2.2  
**Modo:** readiness only — **sem implementação**  
**Fonte:** `DIGITAL_TWIN_READINESS` em `financeReadinessMatrix.js`

---

## Veredicto

**Readiness: partial**

Twin operacional existe (layout, estado de máquina, ManuIA Applied). **Camada financeira nativa ausente.** Overlay $ bloqueado até mapeamento custo↔activo.

---

## Fontes requeridas

| Source | Papel | Status |
|--------|-------|--------|
| digital_twin | base espacial / estado | partial |
| industrial_cost_service | overlay de custo | available |
| financial_leakage | hotspots de perda | available |
| production_mes | drivers de máquina | partial |
| iot_energy | drivers de energia | partial |
| scenario_engine | shell what-if | partial (logistics) |

---

## O que já existe

- Representação digital de activos / layout (`digitalTwinService`, `/api/integrations/digital-twin/*`, ManuIA twin)  
- Custos e leakage como séries económicas reutilizáveis  
- Scenario shell CPL (não financeiro)

## O que falta

- Atributos $ nos nós do twin  
- Tabela / contrato de join cost↔asset  
- Overlay financeiro no scenario engine (sem fork)  
- Forecasting alinhado para cenários temporais

## Gaps associados

- GAP-FD-004 (blocker) — cost↔asset  
- GAP-FD-007 — scenario logistics-only  
- GAP-FD-006 — forecasting incompleto

---

## Plano técnico (não executar nesta fase)

1. Publicar contrato de mapeamento asset_id → cost_origin / cost_item  
2. Compose read-only: twin state + cost/leakage overlays  
3. What-if: reutilizar ScenarioProvider + parâmetros $  
4. Só então UI Financial Digital Twin no domínio Finance
