# Etapa 450 — Perfil dashboard: manager_environmental

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 450 / 1060 |
| **profile_key** | `manager_environmental` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "manager_environmental",
  "label": "Gerente de Meio Ambiente",
  "insights_mode": "analytical_tactical",
  "default_period": "7d",
  "data_depth": "detailed",
  "visible_modules": [
    "dashboard",
    "operational",
    "proaction",
    "biblioteca",
    "ai",
    "environment_intelligence",
    "audit",
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
      "key": "esg_score",
      "title": "Indicadores ESG",
      "icon": "trending",
      "color": "green"
    },
    {
      "key": "emissions_indicator",
      "title": "Emissões",
      "icon": "activity",
      "color": "amber"
    },
    {
      "key": "environmental_risks",
      "title": "Riscos ambientais",
      "icon": "alert",
      "color": "red"
    },
    {
      "key": "utilities_consumption",
      "title": "Utilidades",
      "icon": "target",
      "color": "cyan"
    }
  ],
  "charts": [
    "trend"
  ],
  "alerts": [
    "critical",
    "high",
    "medium"
  ],
  "widgets": [
    "smart_summary",
    "ai_insights",
    "kpi_request"
  ],
  "default_filters": {
    "sector": "meio_ambiente"
  }
}
```

## Evidências

- `backend/src/config/dashboardProfiles.js`

---
*Etapa 450 · ICEB auto-gen*
