# Etapa 447 — Perfil dashboard: coordinator_production

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 447 / 1060 |
| **profile_key** | `coordinator_production` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "coordinator_production",
  "label": "Coordenador de Produção",
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
    "settings"
  ],
  "cards": [
    {
      "key": "department_interactions",
      "title": "Interações do departamento",
      "icon": "message",
      "color": "blue"
    },
    {
      "key": "proposals_in_progress",
      "title": "Propostas em andamento",
      "icon": "target",
      "color": "purple"
    },
    {
      "key": "operational_insights",
      "title": "Insights operacionais",
      "icon": "brain",
      "color": "teal"
    },
    {
      "key": "production_shift",
      "title": "Produção do turno",
      "icon": "trending",
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
*Etapa 447 · ICEB auto-gen*
