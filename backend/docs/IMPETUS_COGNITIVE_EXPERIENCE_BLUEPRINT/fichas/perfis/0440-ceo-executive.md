# Etapa 440 — Perfil dashboard: ceo_executive

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 440 / 1060 |
| **profile_key** | `ceo_executive` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "ceo_executive",
  "label": "CEO / Executivo",
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
    "hr_intelligence",
    "anomaly_detection",
    "settings"
  ],
  "cards": [
    {
      "key": "interactions_week",
      "title": "Interações (semana)",
      "icon": "message",
      "color": "blue",
      "route": "/app/operacional"
    },
    {
      "key": "critical_alerts",
      "title": "Alertas críticos",
      "icon": "alert",
      "color": "red",
      "route": "/app/chatbot"
    },
    {
      "key": "operational_anomalies",
      "title": "Anomalias operacionais",
      "icon": "alert",
      "color": "orange",
      "route": "/app/anomalies"
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
      "color": "purple",
      "route": "/app/proacao"
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
    "executive_query"
  ],
  "default_filters": {}
}
```

## Evidências

- `backend/src/config/dashboardProfiles.js`

---
*Etapa 440 · ICEB auto-gen*
