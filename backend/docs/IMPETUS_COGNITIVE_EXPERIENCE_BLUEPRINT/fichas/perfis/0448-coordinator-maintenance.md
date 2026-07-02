# Etapa 448 — Perfil dashboard: coordinator_maintenance

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 448 / 1060 |
| **profile_key** | `coordinator_maintenance` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "coordinator_maintenance",
  "label": "Coordenador de Manutenção",
  "insights_mode": "operational_tactical",
  "default_period": "7d",
  "data_depth": "detailed",
  "visible_modules": [
    "dashboard",
    "operational",
    "proaction",
    "biblioteca",
    "ai",
    "anomaly_detection",
    "manuia",
    "settings"
  ],
  "cards": [
    {
      "key": "open_work_orders",
      "title": "OS abertas",
      "icon": "target",
      "color": "blue"
    },
    {
      "key": "operational_insights",
      "title": "Insights operacionais",
      "icon": "brain",
      "color": "teal"
    },
    {
      "key": "recurring_failures",
      "title": "Falhas recorrentes",
      "icon": "alert",
      "color": "orange"
    },
    {
      "key": "department_interactions",
      "title": "Interações do departamento",
      "icon": "message",
      "color": "blue"
    }
  ],
  "charts": [
    "trend"
  ],
  "alerts": [
    "critical",
    "high"
  ],
  "widgets": [
    "ai_insights",
    "recent_interactions",
    "plc_alerts"
  ],
  "default_filters": {}
}
```

## Evidências

- `backend/src/config/dashboardProfiles.js`

---
*Etapa 448 · ICEB auto-gen*
