# Dashboard Inteligente e Personalizado por Usuário

## Arquitetura

O dashboard é montado pela composição:

```
DASHBOARD FINAL = HIERARQUIA (role) + ÁREA (functional_area) + CARGO (job_title) + PERMISSÕES + KPIs FAVORITOS + HISTÓRICO DE USO
```

### Componentes

| Módulo | Arquivo | Função |
|--------|---------|--------|
| Migração | `backend/src/models/intelligent_dashboard_migration.sql` | Novos campos em users, tabelas de preferências e histórico |
| Matriz de perfis | `backend/src/config/dashboardProfiles.js` | Perfis-base (role + area) com cards, gráficos, widgets |
| Resolução de perfil | `backend/src/services/dashboardProfileResolver.js` | `resolveDashboardProfile(user)` |
| Serviço principal | `backend/src/services/intelligentDashboardService.js` | `buildDashboardPayload(user)` |
| Rotas | `backend/src/routes/dashboard.js` | GET /me, /config, POST /preferences, /track-interaction |

---

## Perfis Disponíveis

| Perfil | Descrição |
|--------|-----------|
| ceo_executive | CEO / Executivo |
| director_operations | Diretor de Operações |
| director_industrial | Diretor Industrial |
| manager_production | Gerente de Produção |
| manager_maintenance | Gerente de Manutenção |
| manager_quality | Gerente de Qualidade |
| coordinator_production | Coordenador de Produção |
| coordinator_maintenance | Coordenador de Manutenção |
| coordinator_quality | Coordenador de Qualidade |
| supervisor_production | Supervisor de Produção |
| supervisor_maintenance | Supervisor de Manutenção |
| supervisor_quality | Supervisor de Qualidade |
| analyst_pcp | Analista de PCP |
| technician_maintenance | Técnico de Manutenção |
| inspector_quality | Inspetor de Qualidade |
| operator_floor | Operador |
| hr_management | RH |
| finance_management | Financeiro |
| admin_system | Admin do Sistema |

---

## APIs

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/dashboard/me` | Payload completo (perfil + KPIs + insights + preferências) |
| GET | `/api/dashboard/config` | Configuração do perfil (cards, widgets, módulos) |
| POST | `/api/dashboard/preferences` | Salva preferências (ordem de cards, período, layout) |
| POST | `/api/dashboard/favorite-kpis` | Atualiza KPIs favoritos |
| POST | `/api/dashboard/track-interaction` | Registra interação para personalização |
| GET | `/api/dashboard/widgets` | Lista widgets do perfil |

---

## Campos do Usuário (novos)

- `functional_area`: production, maintenance, quality, operations, pcp, hr, finance, admin
- `dashboard_profile`: perfil resolvido (ex: supervisor_maintenance)
- `preferred_kpis`: array de chaves de KPI
- `dashboard_preferences`: JSON com favorite_period, compact_mode, cards_order
- `seniority_level`: estrategico, tatico, operacional
- `ai_profile_context`: { focus, language_style }

---

## Resolução de Perfil

1. Se `dashboard_profile` está definido e é válido → usa como override
2. Senão: `role` + `functional_area` (ou inferido de `job_title`)
3. Fallback: operator_floor

Exemplo: `role=supervisor` + `functional_area=maintenance` → `supervisor_maintenance`

---

## Ordem de Implementação Recomendada

1. Executar migration: `node scripts/run-all-migrations.js`
2. Cadastrar `functional_area` e `job_title` nos usuários (Admin > Usuários)
3. Frontend: usar `dashboard.getMe()` no DashboardInteligente
4. Habilitar `dashboard.trackInteraction()` em cliques de cards/KPIs

---

## Melhorias Futuras

- DashboardCustomizerModal: modal para usuário reordenar cards e escolher KPIs favoritos
- KPIs por perfil: dashboardKPIs retornar KPIs específicos por profile_code
- Insights personalizados: adaptar tom e profundidade da IA ao insights_mode do perfil
- Onboarding inteligente: perguntas curtas no primeiro acesso para enriquecer perfil

---

## Riscos e Pontos de Atenção

- **Migration**: tabelas `user_dashboard_preferences` e `dashboard_usage_events` são criadas; se já existirem, ALTER TABLE users usa IF NOT EXISTS
- **Fallback**: se `/me` falhar, o frontend deve usar rotas legadas (visibility, kpis, etc.)
- **Permissões**: o payload inclui `permissions`; o frontend deve esconder módulos não permitidos
