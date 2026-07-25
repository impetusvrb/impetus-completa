# FIN-DATA-001 — Gap Analysis

**Programa:** FIN-DATA-001  
**Fonte:** `financeGapAnalysis.js` / `buildGapSummary()`  
**Gate:** Smart Costing / Twin / Predictive **fechados**

---

## Resumo

| Severidade | Qtd |
|------------|-----|
| blocker | 3 |
| high | 5 |
| medium | 4 |
| low | 0 |
| **total** | **12** |

Readiness: twin=`partial` · smartCosting=`partial` · predictive=`not_ready`

---

## Gaps por release

### Release 2.1 — Smart Costing / Performance Económica

| Gap | Sev | Status implícito | O que falta |
|-----|-----|------------------|-------------|
| GAP-FD-011 | blocker | inexistente | Modelo driver→rate |
| GAP-FD-001 | high | parcial | Impact API certificada |
| GAP-FD-005 | high | parcial | Energy costing standard |
| GAP-FD-002 | high | parcial | Aliases KPI compose |
| GAP-FD-003 | blocker | inexistente ($) | Valuation inventário (carrying) |
| GAP-FD-012 | medium | parcial | Documentar C3 como proxy |

**Classificação agregado 2.1:** parcialmente disponível (base custo+leakage); **bloqueado** para implementação.

### Release 2.2 — Financial Digital Twin / What-if

| Gap | Sev | Status | O que falta |
|-----|-----|--------|-------------|
| GAP-FD-004 | blocker | inexistente | cost↔asset mapping |
| GAP-FD-007 | medium | parcial | Overlay $ no scenario CPL |
| GAP-FD-006 | high | parcial | Forecasting mounts alinhados |

**Classificação agregado 2.2:** twin operacional disponível; financeiro **inexistente** até GAP-FD-004.

### Release 2.3 — Estoque Financeiro / PdM Financeira / NL

| Gap | Sev | Status | O que falta |
|-----|-----|--------|-------------|
| GAP-FD-003 | blocker | inexistente ($) | Valuation WMS |
| GAP-FD-010 | high | inexistente | PdM→ROI $ |
| (NL) | — | parcial | recommendation_engine intents finance |
| GAP-FD-008 | medium | parcial | CAPEX Supply vestigial (backlog) |

---

## Catálogo completo

| ID | Título | Blocks |
|----|--------|--------|
| GAP-FD-001 | Cost impact service not public-API certified | 2.1 |
| GAP-FD-002 | Hub KPI field path mismatches | 2.0 quality, 2.1 |
| GAP-FD-003 | WMS inventory without monetary valuation | 2.3, 2.1 carrying |
| GAP-FD-004 | No cost↔asset mapping for Financial Twin | 2.2 |
| GAP-FD-005 | Energy costing not standardized | 2.1 energy |
| GAP-FD-006 | Forecasting API incomplete vs client | 2.2 predictive |
| GAP-FD-007 | Scenario engine logistics-only | 2.2 what-if |
| GAP-FD-008 | CAPEX / budget vestigial in Supply | backlog CAPEX |
| GAP-FD-009 | Nexus wallet admin-gated for CFO hub | 2.0 billing KPI |
| GAP-FD-010 | PdM → financial ROI absent | 2.3, predictive |
| GAP-FD-011 | No driver→rate model for Smart Costing | 2.1 |
| GAP-FD-012 | Economic engines are proxy | 2.1 económica |

---

## Plano técnico sólido para FIN-EVOLVE-2.1 (sem retrabalho)

1. Fechar **GAP-FD-011** — publicar contrato driver→rate (documento + schema; sem UI ainda).  
2. Certificar path de impacto (**GAP-FD-001**) via nesting existente ou rota aditiva mínima.  
3. Normalizar aliases no compose (**GAP-FD-002**) — escopo evolve mínimo.  
4. Definir estratégia de valuation (**GAP-FD-003**) como adapter (pode ser paralelo pós-2.1 se carrying não for MVP).  
5. Só então abrir implementação Smart Costing sob FIN-EVOLVE-2.1.

**Proibido nesta fase:** implementar Smart Costing, Twin, What-if ou novos cálculos.
