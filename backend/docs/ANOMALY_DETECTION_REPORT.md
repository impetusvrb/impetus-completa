# Anomaly Detection Report (Fase 42-B)

**Serviço:** `plcAnomalyAnalysisService.detectOperationalAnomalies()`

---

## Método determinístico

| Técnica | Uso |
|---------|-----|
| Mediana histórica | 7d–24h vs mediana 24h recente |
| Desvio % | `(observado − baseline) / |baseline|` |
| MAD | z-score robusto na janela histórica |
| Percentil P95 | observado > P95 → `attention` |
| Ruptura tendência | trend `increasing` + desvio (Fase 41) |
| Queda abrupta | mediana 2h vs 22h anteriores |

---

## Classificações

| Classe | |desvio %| típico |
|--------|----------------|
| `normal` | < 10% |
| `attention` | 10–25% |
| `anomaly` | 25–50% |
| `critical_anomaly` | > 50% |

---

## Sinais

`temperature`, `vibration`, `electrical_current`, `pressure`, `hydraulic_pressure`, `water_flow`, `rpm`, `alarm_state`

Colunas inexistentes são ignoradas automaticamente.
