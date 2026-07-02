# Etapa 442 — Perfil dashboard: director_unassigned

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 442 / 1060 |
| **profile_key** | `director_unassigned` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "director_unassigned",
  "label": "Direção",
  "insights_mode": "strategic_analytical",
  "default_period": "7d",
  "data_depth": "consolidated",
  "visible_modules": [
    "dashboard",
    "operational",
    "proaction",
    "chat",
    "biblioteca",
    "ai",
    "hr_intelligence",
    "anomaly_detection",
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
      "key": "weekly_growth",
      "title": "Crescimento semanal",
      "icon": "trending",
      "color": "green"
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
    "high"
  ],
  "widgets": [
    "smart_summary",
    "ai_insights",
    "recent_interactions",
    "communication_panel"
  ],
  "default_filters": {}
}
```

## Evidências

- `backend/src/config/dashboardProfiles.js`

---
*Etapa 442 · ICEB auto-gen*
