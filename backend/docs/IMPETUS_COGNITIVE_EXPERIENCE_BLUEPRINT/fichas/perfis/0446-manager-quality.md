# Etapa 446 — Perfil dashboard: manager_quality

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 446 / 1060 |
| **profile_key** | `manager_quality` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "manager_quality",
  "label": "Gerente de Qualidade",
  "insights_mode": "analytical_tactical",
  "default_period": "7d",
  "data_depth": "detailed",
  "visible_modules": [
    "dashboard",
    "operational",
    "proaction",
    "biblioteca",
    "ai",
    "raw_material_lots",
    "quality_intelligence",
    "audit",
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
      "key": "lot_alerts",
      "title": "Alertas de lotes",
      "icon": "alert",
      "color": "orange",
      "route": "/app/raw-material-lots"
    },
    {
      "key": "quality_dashboard",
      "title": "Painel de Qualidade",
      "icon": "trending",
      "color": "teal",
      "route": "/app/quality"
    },
    {
      "key": "corrective_overdue",
      "title": "Ações corretivas vencidas",
      "icon": "alert",
      "color": "orange"
    },
    {
      "key": "pending_audits",
      "title": "Auditorias pendentes",
      "icon": "target",
      "color": "blue"
    },
    {
      "key": "deviation_recurrence",
      "title": "Reincidência de desvios",
      "icon": "alert",
      "color": "red"
    },
    {
      "key": "sector_conformity",
      "title": "Conformidade por setor",
      "icon": "trending",
      "color": "green"
    }
  ],
  "charts": [
    "trend",
    "quality_by_sector"
  ],
  "alerts": [
    "critical",
    "high",
    "medium"
  ],
  "widgets": [
    "smart_summary",
    "ai_insights",
    "kpi_request"
  ],
  "default_filters": {
    "sector": "qualidade"
  }
}
```

## Evidências

- `backend/src/config/dashboardProfiles.js`

---
*Etapa 446 · ICEB auto-gen*
