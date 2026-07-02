# Etapa 445 — Perfil dashboard: manager_maintenance

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 445 / 1060 |
| **profile_key** | `manager_maintenance` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "manager_maintenance",
  "label": "Gerente de Manutenção",
  "insights_mode": "analytical_tactical",
  "default_period": "7d",
  "data_depth": "detailed",
  "visible_modules": [
    "dashboard",
    "operational",
    "proaction",
    "biblioteca",
    "ai",
    "anomaly_detection",
    "audit",
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
    }
  ],
  "charts": [
    "trend",
    "maintenance_by_asset"
  ],
  "alerts": [
    "critical",
    "high",
    "medium"
  ],
  "widgets": [
    "smart_summary",
    "ai_insights",
    "kpi_request",
    "plc_alerts"
  ],
  "default_filters": {
    "sector": "manutencao"
  }
}
```

## Evidências

- `backend/src/config/dashboardProfiles.js`

---
*Etapa 445 · ICEB auto-gen*
