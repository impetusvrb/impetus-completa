# OPM-008 — Cognitive Heuristic Rules Catalog

**Fase:** OPM-008  
**Fonte canónica:** `clHeuristicRules.js`

---

## Princípio

Regras **determinísticas e explicáveis** nesta fase. Interface preparada para modelos estatísticos/IA futuros sem alterar contratos públicos.

---

## Catálogo

| ID | Nome | Categoria | Confiança base | Módulos |
|----|------|-----------|----------------|---------|
| RULE-CAP-SAT | Tendência saturação capacidade | predictive | 0.82 | warehouses, warehouse_intelligence |
| RULE-QUEUE-GROWTH | Crescimento filas operacionais | predictive | 0.75 | receiving, picking, shipping, transfers |
| RULE-SLA-DEG | Degradação SLA consolidado | predictive | 0.88 | receiving, picking, shipping |
| RULE-HOTSPOT | Hotspot recorrente zona/bin | predictive | 0.70 | warehouse_intelligence, transfers |
| RULE-REPLEN | Antecipar replenishment | recommendation | 0.78 | transfers, picking |
| RULE-REDIST | Redistribuir estoque | recommendation | 0.85 | transfers, inventory |
| RULE-DOCK-BAL | Balancear docas | recommendation | 0.72 | receiving, shipping |
| RULE-XFR-RESCH | Reprogramar transferências | recommendation | 0.80 | transfers |

---

## Entradas por regra

Cada regra declara `inputs` e `threshold` quando aplicável. O motor cognitivo (`clPredictiveUtils`, `clRecommendationEngine`) aplica estas regras sobre dados OPM-007.

---

## Evolução IA

GAP `GAP-OPM-CL-001`: substituição/augmentação via adaptadores plugáveis mantendo:

- `ruleId` rastreável
- `confidence` numérico
- `evidence[]` estruturado
- `decisionTrace` inalterado
