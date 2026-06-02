# PLC Trend Analysis Report (Fase 41-A)

**Serviço:** `backend/src/services/plcTrendAnalysisService.js`

---

## Janelas comparadas

| Janela | Uso |
|--------|-----|
| 24 h | Mediana recente |
| 7 d | Mediana semanal vs período anterior (24h–7d) |
| 30 d | Mediana 7d vs período 8–30 dias |

---

## Variáveis elegíveis

Detectadas via `information_schema` (ignoradas se ausentes):

`temperature`, `vibration` (COALESCE vibration_level, vibration), `electrical_current`, `pressure`, `hydraulic_pressure`, `water_flow`, `rpm`

---

## Classificação de tendência

Config: `backend/src/config/trendBaselineConfig.js`

| |variation_percent| | Tendência |
|--|-------------------|-----------|
| < 10% | `stable` |
| ≥ 10% | `increasing` |
| ≤ −10% | `decreasing` |

---

## API principal

```javascript
await buildTrendSnapshot(companyId);
await buildOperationalTrendPack(companyId);
```

Saída por equipamento:

```json
{
  "equipment_id": "LAB-EQ-001",
  "temperature": {
    "trend": "stable",
    "variation_percent": 0,
    "baseline_state": "normal"
  }
}
```
