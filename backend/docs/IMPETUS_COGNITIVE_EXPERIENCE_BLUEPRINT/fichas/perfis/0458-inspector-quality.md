# Etapa 458 — Perfil dashboard: inspector_quality

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 458 / 1060 |
| **profile_key** | `inspector_quality` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "inspector_quality",
  "label": "Inspetor de Qualidade",
  "insights_mode": "practical_operational",
  "default_period": "7d",
  "data_depth": "operational",
  "visible_modules": [
    "dashboard",
    "operational",
    "chat",
    "biblioteca",
    "ai",
    "quality_intelligence",
    "settings"
  ],
  "cards": [
    {
      "key": "pending_inspections",
      "title": "Inspeções pendentes",
      "icon": "target",
      "color": "blue"
    },
    {
      "key": "quality_dashboard",
      "title": "Painel de Qualidade",
      "icon": "trending",
      "color": "teal",
      "route": "/app/quality"
    },
    {
      "key": "operational_alerts",
      "title": "Alertas operacionais",
      "icon": "alert",
      "color": "orange"
    },
    {
      "key": "my_interactions",
      "title": "Minhas interações",
      "icon": "message",
      "color": "blue"
    }
  ],
  "charts": [],
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
*Etapa 458 · ICEB auto-gen*
