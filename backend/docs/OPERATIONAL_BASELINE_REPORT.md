# Operational Baseline Report (Fase 41-B)

**Função:** `computeOperationalBaseline()`  
**Config:** `backend/src/config/trendBaselineConfig.js`

---

## Estados

| Estado | Critério (|variação %|) |
|--------|-------------------------|
| `normal` | ≤ 10% |
| `warning` | > 10% e ≤ 25% |
| `critical` | > 25% |

---

## Método

- Mediana por janela SQL (`percentile_cont 0.5`)
- Variação percentual entre mediana 24h/7d e período anterior
- MAD disponível para extensão; reforço se dispersão robusta elevada

---

## Sem LLM

Toda classificação é determinística e reproduzível a partir de `plc_collected_data`.
