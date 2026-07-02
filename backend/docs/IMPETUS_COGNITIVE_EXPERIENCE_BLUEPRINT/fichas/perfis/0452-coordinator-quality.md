# Etapa 452 — Perfil dashboard: coordinator_quality

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 452 / 1060 |
| **profile_key** | `coordinator_quality` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "coordinator_quality",
  "label": "Coordenador de Qualidade",
  "insights_mode": "operational_tactical",
  "default_period": "7d",
  "data_depth": "detailed",
  "visible_modules": [
    "dashboard",
    "operational",
    "proaction",
    "biblioteca",
    "ai",
    "quality_intelligence",
    "settings"
  ],
  "cards": [
    {
      "key": "open_nc",
      "title": "Não conformidades abertas",
      "icon": "alert",
      "color": "red"
    },
    {
      "key": "quality_dashboard",
      "title": "Painel de Qualidade",
      "icon": "trending",
      "color": "teal",
      "route": "/app/quality"
    },
    {
      "key": "operational_insights",
      "title": "Insights operacionais",
      "icon": "brain",
      "color": "teal"
    },
    {
      "key": "department_interactions",
      "title": "Interações do departamento",
      "icon": "message",
      "color": "blue"
    },
    {
      "key": "pending_inspections",
      "title": "Inspeções pendentes",
      "icon": "target",
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
    "recent_interactions"
  ],
  "default_filters": {}
}
```

## Evidências

- `backend/src/config/dashboardProfiles.js`

---
*Etapa 452 · ICEB auto-gen*
