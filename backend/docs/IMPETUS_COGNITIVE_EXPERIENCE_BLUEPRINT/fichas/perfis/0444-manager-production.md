# Etapa 444 — Perfil dashboard: manager_production

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 444 / 1060 |
| **profile_key** | `manager_production` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "manager_production",
  "label": "Gerente de Produção",
  "insights_mode": "analytical_tactical",
  "default_period": "7d",
  "data_depth": "detailed",
  "visible_modules": [
    "dashboard",
    "operational",
    "proaction",
    "biblioteca",
    "ai",
    "anomaly_detection",
    "audit",
    "settings"
  ],
  "cards": [
    {
      "key": "production_shift",
      "title": "Produção do turno",
      "icon": "trending",
      "color": "blue"
    },
    {
      "key": "meta_realizado",
      "title": "Meta x Realizado",
      "icon": "target",
      "color": "green"
    },
    {
      "key": "line_efficiency",
      "title": "Eficiência da linha",
      "icon": "activity",
      "color": "teal"
    },
    {
      "key": "losses",
      "title": "Perdas",
      "icon": "alert",
      "color": "orange"
    },
    {
      "key": "bottlenecks",
      "title": "Gargalos",
      "icon": "alert",
      "color": "red"
    }
  ],
  "charts": [
    "trend",
    "production_by_line"
  ],
  "alerts": [
    "critical",
    "high",
    "medium"
  ],
  "widgets": [
    "smart_summary",
    "ai_insights",
    "kpi_request",
    "plc_alerts"
  ],
  "default_filters": {
    "sector": "producao"
  }
}
```

## Evidências

- `backend/src/config/dashboardProfiles.js`

---
*Etapa 444 · ICEB auto-gen*
