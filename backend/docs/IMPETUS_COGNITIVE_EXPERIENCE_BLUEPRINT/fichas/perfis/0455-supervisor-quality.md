# Etapa 455 — Perfil dashboard: supervisor_quality

> ICEB v1.0 · dashboardProfiles

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 455 / 1060 |
| **profile_key** | `supervisor_quality` |
| **Classificação** | AB |

## Configuração

```json
{
  "profile_code": "supervisor_quality",
  "label": "Supervisor de Qualidade",
  "insights_mode": "technical_tactical",
  "default_period": "7d",
  "data_depth": "operational",
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
    },
    {
      "key": "pop_adherence",
      "title": "Aderência a POP",
      "icon": "target",
      "color": "teal"
    },
    {
      "key": "pending_inspections",
      "title": "Inspeções pendentes",
      "icon": "target",
      "color": "blue"
    },
    {
      "key": "critical_deviations",
      "title": "Desvios críticos",
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
    "recent_interactions"
  ],
  "default_filters": {}
}
```

## Evidências

- `backend/src/config/dashboardProfiles.js`

---
*Etapa 455 · ICEB auto-gen*
