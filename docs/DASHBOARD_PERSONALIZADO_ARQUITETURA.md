# Arquitetura do Dashboard Inteligente e Personalizado

## Regra Central de Negócio

```
DASHBOARD FINAL = HIERARQUIA + ÁREA + CARGO + PERMISSÕES + KPIs FAVORITOS + HISTÓRICO
```

## Componentes Principais

### Backend

| Módulo | Arquivo | Responsabilidade |
|--------|---------|------------------|
| Matriz de perfis | `config/dashboardProfiles.js` | Define cards, gráficos, alertas, widgets por perfil (role+area) |
| Resolução de perfil | `services/dashboardProfileResolver.js` | Resolve `dashboard_profile` de role + functional_area + job_title |
| Dashboard inteligente | `services/intelligentDashboardService.js` | Monta payload completo: perfil + preferências + histórico + KPIs |
| KPIs dinâmicos | `services/dashboardKPIs.js` | KPIs por nível e área (produção, manutenção, qualidade) |
| Controle de acesso | `services/dashboardAccessService.js` | Filtra módulos, cards e KPIs por permissões |
| Insights personalizados | `services/personalizedInsightsService.js` | Adapta tom e foco dos insights ao perfil |
| Smart Summary | `services/smartSummary.js` | Resumo IA adaptado ao perfil do usuário |

### APIs

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/dashboard/me` | Payload completo personalizado |
| GET | `/api/dashboard/config` | Configuração do perfil (cards, widgets, módulos) |
| POST | `/api/dashboard/preferences` | Salvar preferências (ordem, período, layout) |
| POST | `/api/dashboard/favorite-kpis` | Salvar KPIs favoritos |
| POST | `/api/dashboard/track-interaction` | Registrar interação para personalização |
| GET | `/api/dashboard/widgets` | Widgets do perfil |
| PATCH | `/api/admin/users/:id/profile-context` | Atualizar contexto (ai_profile_context, etc.) |

### Frontend

| Componente | Responsabilidade |
|------------|------------------|
| `DashboardInteligente` | Layout principal, blocos dinâmicos, modal de personalização |
| `DashboardMecanico` | Camada de manutenção sobre o base |
| `DashboardCustomizerModal` | Personalizar painel (período, favoritos, layout) |
| `useDashboardMe` | Hook para payload e trackInteraction |
| `useDashboardVisibility` | Seções visíveis por perfil |

## Perfis Base

- `ceo_executive`, `director_operations`, `director_industrial`
- `manager_production`, `manager_maintenance`, `manager_quality`
- `coordinator_production`, `coordinator_maintenance`, `coordinator_quality`
- `supervisor_production`, `supervisor_maintenance`, `supervisor_quality`
- `analyst_pcp`, `technician_maintenance`, `inspector_quality`, `operator_floor`
- `hr_management`, `finance_management`, `admin_system`

## Fluxo de Resolução

1. `role` + `functional_area` (ou inferido de `job_title`) → `profile_code`
2. Override administrativo em `dashboard_profile` (whitelist)
3. Perfil define: visible_modules, cards, charts, alerts, widgets, insights_mode
4. Filtro de permissões: módulos e KPIs sensíveis por `permissions`
5. Preferências do usuário: cards_order, favorite_kpis, default_period
6. Histórico: `dashboard_usage_events` para priorizar cards mais acessados

## Fallback

- Perfil inválido ou desconhecido → `operator_floor`
- Sem preferências → perfil base
- Sem histórico → ordem padrão do perfil

## Melhorias Futuras

- Onboarding de primeiro acesso com perguntas curtas
- Ordem drag-and-drop dos cards
- Widgets configuráveis por perfil
- Integração RBAC completa (roles + permissions)
- Cache de payload por usuário com TTL
