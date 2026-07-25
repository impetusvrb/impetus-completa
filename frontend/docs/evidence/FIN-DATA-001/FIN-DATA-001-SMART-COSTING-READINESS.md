# FIN-DATA-001 — Smart Costing Readiness

**Programa:** FIN-DATA-001  
**Target:** Release 2.1 (FIN-EVOLVE-2.1)  
**Modo:** readiness only — **sem implementação**  
**Fonte:** `SMART_COSTING_READINESS` em `financeReadinessMatrix.js`

---

## Veredicto

**Readiness: partial — gate FECHADO**

Base de custos industriais e leakage está disponível. **Não abrir Smart Costing** até existir modelo driver→rate certificado e wiring de impacto.

---

## Auditoria por dimensão

| Dimensão | Existe? | Status | Notas |
|----------|---------|--------|-------|
| Custos industriais | Sim | available | industrialCostService |
| Impacto eventos→custo | Parcial | partial | impact service sem rota pública |
| Consumo energético | Parcial | partial | telemetria; costing não standard |
| Produção / utilização | Parcial | partial | MES/edge plant-dependent |
| Ordens | Parcial | partial | via operational; sem rate model |
| Perdas | Sim | available | top-loss + leakage |
| Estoque | Parcial | partial | qty WMS; sem valuation $ |
| Manutenção | Parcial | partial | diagnóstico; sem ROI $ |
| Pressão económica | Parcial | partial | C3 proxy |

---

## Perguntas obrigatórias

### Quais dados já existem para custo unitário dinâmico?

- Itens de custo operacional e agregados dia/mês  
- Impacto aninhado em executive-summary  
- Perdas e leakage projectados  
- Séries by-origin  

### Quais ainda não existem?

- Contrato driver→rate (volume, energia, tempo, material)  
- Valuation monetária de inventário  
- Energy rate por planta  
- Impact service como API pública certificada  

---

## Blockers

| Gap | Título |
|-----|--------|
| GAP-FD-011 | No driver→rate model |
| GAP-FD-001 | Impact service não certificado |
| GAP-FD-003 | WMS sem valuation (carrying) |
| GAP-FD-005 | Energy costing não standard |

---

## Critério para abrir FIN-EVOLVE-2.1

1. Driver contract publicado (owner: Finance; consumidores: MES/IoT/WMS)  
2. Impact path certificado (executive-summary ou rota mínima aditiva)  
3. KPI aliases do hub normalizados no compose  
4. Sign-off FIN-DATA-GATE
