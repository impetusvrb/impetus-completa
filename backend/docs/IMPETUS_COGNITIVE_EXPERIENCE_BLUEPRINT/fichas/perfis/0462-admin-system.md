# Etapa 462 — Perfil dashboard: admin_system

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 462 / 1060 |
| **profile_key** | `admin_system` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "admin_system",
  "label": "Admin do Sistema",
  "insights_mode": "strategic_executive",
  "default_period": "7d",
  "data_depth": "consolidated",
  "visible_modules": [
    "dashboard",
    "operational",
    "proaction",
    "chat",
    "biblioteca",
    "ai",
    "admin",
    "audit",
    "settings"
  ],
  "cards": [
    {
      "key": "interactions_week",
      "title": "Interações (semana)",
      "icon": "message",
      "color": "blue"
    },
    {
      "key": "critical_alerts",
      "title": "Alertas críticos",
      "icon": "alert",
      "color": "red"
    },
    {
      "key": "open_proposals",
      "title": "Propostas em aberto",
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
    "smart_summary",
    "ai_insights",
    "recent_interactions",
    "kpi_request",
    "communication_panel"
  ],
  "default_filters": {}
}
```

## Evidências

- `backend/src/config/dashboardProfiles.js`

---
*Etapa 462 · ICEB auto-gen*
