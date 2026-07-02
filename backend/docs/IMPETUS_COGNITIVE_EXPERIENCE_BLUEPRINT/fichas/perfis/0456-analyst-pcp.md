# Etapa 456 — Perfil dashboard: analyst_pcp

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 456 / 1060 |
| **profile_key** | `analyst_pcp` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "analyst_pcp",
  "label": "Analista de PCP",
  "insights_mode": "operational_analytical",
  "default_period": "7d",
  "data_depth": "detailed",
  "visible_modules": [
    "dashboard",
    "operational",
    "proaction",
    "biblioteca",
    "ai",
    "settings"
  ],
  "cards": [
    {
      "key": "production_planning",
      "title": "Planejamento de produção",
      "icon": "target",
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
*Etapa 456 · ICEB auto-gen*
