# Etapa 453 — Perfil dashboard: supervisor_production

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 453 / 1060 |
| **profile_key** | `supervisor_production` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "supervisor_production",
  "label": "Supervisor de Produção",
  "insights_mode": "technical_tactical",
  "default_period": "7d",
  "data_depth": "operational",
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
      "key": "production_shift",
      "title": "Produção do turno",
      "icon": "trending",
      "color": "blue"
    },
    {
      "key": "meta_realizado",
      "title": "Meta x Realizado",
      "icon": "target",
      "color": "green"
    },
    {
      "key": "line_efficiency",
      "title": "Eficiência da linha",
      "icon": "activity",
      "color": "teal"
    },
    {
      "key": "losses",
      "title": "Perdas",
      "icon": "alert",
      "color": "orange"
    },
    {
      "key": "stops",
      "title": "Paradas",
      "icon": "alert",
      "color": "red"
    },
    {
      "key": "team_shift",
      "title": "Equipe do turno",
      "icon": "users",
      "color": "blue"
    },
    {
      "key": "pending_actions",
      "title": "Ações pendentes",
      "icon": "target",
      "color": "purple"
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
    "recent_interactions",
    "plc_alerts"
  ],
  "default_filters": {}
}
```

## Evidências

- `backend/src/config/dashboardProfiles.js`

---
*Etapa 453 · ICEB auto-gen*
