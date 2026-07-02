# Etapa 443 — Perfil dashboard: director_industrial

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 443 / 1060 |
| **profile_key** | `director_industrial` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "director_industrial",
  "label": "Diretor Industrial",
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
      "key": "production_consolidated",
      "title": "Produção consolidada",
      "icon": "trending",
      "color": "blue"
    },
    {
      "key": "global_efficiency",
      "title": "Eficiência global",
      "icon": "target",
      "color": "green"
    },
    {
      "key": "critical_stops",
      "title": "Paradas críticas",
      "icon": "alert",
      "color": "red"
    },
    {
      "key": "strategic_actions",
      "title": "Ações estratégicas vencidas",
      "icon": "target",
      "color": "orange"
    },
    {
      "key": "sectors_alert",
      "title": "Setores em alerta",
      "icon": "alert",
      "color": "purple"
    }
  ],
  "charts": [
    "trend",
    "sector_comparison"
  ],
  "alerts": [
    "critical",
    "high"
  ],
  "widgets": [
    "smart_summary",
    "ai_insights",
    "kpi_request",
    "communication_panel"
  ],
  "default_filters": {}
}
```

## Evidências

- `backend/src/config/dashboardProfiles.js`

---
*Etapa 443 · ICEB auto-gen*
