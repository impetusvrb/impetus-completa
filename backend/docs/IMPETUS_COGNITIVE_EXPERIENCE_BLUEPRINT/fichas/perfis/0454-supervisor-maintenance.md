# Etapa 454 — Perfil dashboard: supervisor_maintenance

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 454 / 1060 |
| **profile_key** | `supervisor_maintenance` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "supervisor_maintenance",
  "label": "Supervisor de Manutenção",
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
    "manuia",
    "settings"
  ],
  "cards": [
    {
      "key": "open_work_orders",
      "title": "OS abertas",
      "icon": "target",
      "color": "blue"
    },
    {
      "key": "critical_assets",
      "title": "Ativos críticos",
      "icon": "alert",
      "color": "red"
    },
    {
      "key": "recurring_failures",
      "title": "Falhas recorrentes",
      "icon": "alert",
      "color": "orange"
    },
    {
      "key": "mttr",
      "title": "Tempo médio de reparo",
      "icon": "activity",
      "color": "orange"
    },
    {
      "key": "preventive_overdue",
      "title": "Preventivas vencidas",
      "icon": "alert",
      "color": "red"
    },
    {
      "key": "asset_availability",
      "title": "Disponibilidade dos ativos",
      "icon": "trending",
      "color": "green"
    },
    {
      "key": "machines_stopped",
      "title": "Máquinas paradas",
      "icon": "alert",
      "color": "red"
    },
    {
      "key": "technical_urgencies",
      "title": "Urgências técnicas",
      "icon": "alert",
      "color": "red"
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
*Etapa 454 · ICEB auto-gen*
