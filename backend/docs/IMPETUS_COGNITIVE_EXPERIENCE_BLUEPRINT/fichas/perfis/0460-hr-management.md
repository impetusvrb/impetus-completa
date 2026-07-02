# Etapa 460 — Perfil dashboard: hr_management

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 460 / 1060 |
| **profile_key** | `hr_management` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "hr_management",
  "label": "RH",
  "insights_mode": "analytical_tactical",
  "default_period": "7d",
  "data_depth": "detailed",
  "visible_modules": [
    "dashboard",
    "operational",
    "biblioteca",
    "ai",
    "chat",
    "hr_intelligence",
    "settings"
  ],
  "cards": [
    {
      "key": "team_indicators",
      "title": "Indicadores da equipe",
      "icon": "users",
      "color": "blue",
      "route": "/app/pulse-rh"
    },
    {
      "key": "hr_alerts",
      "title": "Alertas de RH",
      "icon": "alert",
      "color": "orange",
      "route": "/app/pulse-rh"
    },
    {
      "key": "department_interactions",
      "title": "Interações do departamento",
      "icon": "message",
      "color": "blue"
    },
    {
      "key": "operational_insights",
      "title": "Insights operacionais",
      "icon": "brain",
      "color": "teal"
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
    "recent_interactions"
  ],
  "default_filters": {}
}
```

## Evidências

- `backend/src/config/dashboardProfiles.js`

---
*Etapa 460 · ICEB auto-gen*
