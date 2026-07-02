# Etapa 461 — Perfil dashboard: finance_management

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 461 / 1060 |
| **profile_key** | `finance_management` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "finance_management",
  "label": "Financeiro",
  "insights_mode": "analytical_strategic",
  "default_period": "7d",
  "data_depth": "detailed",
  "visible_modules": [
    "dashboard",
    "operational",
    "biblioteca",
    "ai",
    "settings"
  ],
  "cards": [
    {
      "key": "financial_indicators",
      "title": "Indicadores financeiros",
      "icon": "trending",
      "color": "blue"
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
*Etapa 461 · ICEB auto-gen*
