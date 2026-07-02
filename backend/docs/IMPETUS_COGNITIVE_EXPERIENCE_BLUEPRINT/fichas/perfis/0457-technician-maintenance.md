# Etapa 457 — Perfil dashboard: technician_maintenance

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 457 / 1060 |
| **profile_key** | `technician_maintenance` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "technician_maintenance",
  "label": "Técnico de Manutenção",
  "insights_mode": "practical_operational",
  "default_period": "7d",
  "data_depth": "operational",
  "visible_modules": [
    "dashboard",
    "operational",
    "chat",
    "biblioteca",
    "ai",
    "manuia",
    "settings"
  ],
  "cards": [
    {
      "key": "my_work_orders",
      "title": "Minhas OS",
      "icon": "target",
      "color": "blue"
    },
    {
      "key": "operational_alerts",
      "title": "Alertas operacionais",
      "icon": "alert",
      "color": "orange"
    },
    {
      "key": "my_interactions",
      "title": "Minhas interações",
      "icon": "message",
      "color": "blue"
    }
  ],
  "charts": [],
  "alerts": [
    "critical",
    "high"
  ],
  "widgets": [
    "ai_insights",
    "recent_interactions"
  ],
  "default_filters": {}
}
```

## Evidências

- `backend/src/config/dashboardProfiles.js`

---
*Etapa 457 · ICEB auto-gen*
