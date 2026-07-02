# Etapa 451 — Perfil dashboard: supervisor_environmental

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 451 / 1060 |
| **profile_key** | `supervisor_environmental` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "supervisor_environmental",
  "label": "Supervisor de Meio Ambiente",
  "insights_mode": "technical_tactical",
  "default_period": "7d",
  "data_depth": "operational",
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
      "key": "environmental_incidents",
      "title": "Incidentes ambientais",
      "icon": "alert",
      "color": "red"
    },
    {
      "key": "waste_management",
      "title": "Resíduos",
      "icon": "target",
      "color": "amber"
    },
    {
      "key": "water_consumption",
      "title": "Coletas / água",
      "icon": "activity",
      "color": "cyan"
    },
    {
      "key": "pending_evidence",
      "title": "Evidências pendentes",
      "icon": "target",
      "color": "blue"
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
    "ai_insights",
    "recent_interactions"
  ],
  "default_filters": {}
}
```

## Evidências

- `backend/src/config/dashboardProfiles.js`

---
*Etapa 451 · ICEB auto-gen*
