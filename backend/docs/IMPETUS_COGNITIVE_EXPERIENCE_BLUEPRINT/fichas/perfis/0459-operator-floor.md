# Etapa 459 — Perfil dashboard: operator_floor

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 459 / 1060 |
| **profile_key** | `operator_floor` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "operator_floor",
  "label": "Operador",
  "insights_mode": "objective_practical",
  "default_period": "7d",
  "data_depth": "operational",
  "visible_modules": [
    "dashboard",
    "operational",
    "chat",
    "biblioteca",
    "ai",
    "settings"
  ],
  "cards": [
    {
      "key": "my_interactions",
      "title": "Minhas interações",
      "icon": "message",
      "color": "blue"
    },
    {
      "key": "my_proposals",
      "title": "Minhas propostas",
      "icon": "target",
      "color": "purple"
    }
  ],
  "charts": [],
  "alerts": [
    "critical"
  ],
  "widgets": [
    "ai_insights"
  ],
  "default_filters": {}
}
```

## Evidências

- `backend/src/config/dashboardProfiles.js`

---
*Etapa 459 · ICEB auto-gen*
