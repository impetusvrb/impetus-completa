# Etapa 449 — Perfil dashboard: coordinator_environmental

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 449 / 1060 |
| **profile_key** | `coordinator_environmental` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "coordinator_environmental",
  "label": "Coordenador de Meio Ambiente",
  "insights_mode": "operational_tactical",
  "default_period": "7d",
  "data_depth": "detailed",
  "visible_modules": [
    "dashboard",
    "operational",
    "proaction",
    "biblioteca",
    "ai",
    "environment_intelligence",
    "settings"
  ],
  "cards": [
    {
      "key": "environmental_compliance",
      "title": "Compliance ambiental",
      "icon": "alert",
      "color": "teal"
    },
    {
      "key": "emissions_indicator",
      "title": "Emissões",
      "icon": "trending",
      "color": "green"
    },
    {
      "key": "waste_management",
      "title": "Resíduos",
      "icon": "target",
      "color": "amber",
      "route": "/app/environment/operational"
    },
    {
      "key": "water_consumption",
      "title": "Água / ETA",
      "icon": "activity",
      "color": "cyan"
    },
    {
      "key": "operational_insights",
      "title": "Insights ambientais",
      "icon": "brain",
      "color": "teal"
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
    "recent_interactions"
  ],
  "default_filters": {
    "sector": "meio_ambiente"
  }
}
```

## Evidências

- `backend/src/config/dashboardProfiles.js`

---
*Etapa 449 · ICEB auto-gen*
