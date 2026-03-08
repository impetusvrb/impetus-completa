# Dashboard por Hierarquia — Implementação

**Data:** 2025  
**Registro INPI:** BR512025007048-9

---

## Resumo das alterações

### 1. Remoção do `.slice(0, 6)` em AdminSettings

- **Antes:** Apenas 6 das 12 seções configuravam visibilidade.
- **Depois:** Todas as 12 seções podem ser configuradas por nível (Gerente, Coordenador, Supervisor, Colaborador).
- **Layout:** Grid em `visibility-checkboxes--grid` para melhor uso do espaço.

### 2. Chat interativo em todos os dashboards

- **ExecutiveDashboard (CEO):** Chat com resumo inteligente.
- **AdminDashboard:** Mantido como estava.
- **DashboardInteligente:** Novo bloco com chat compacto.
- **Componente:** `DashboardChatWidget.jsx` reutilizável, com props `compact` e `greetingSummary`.

### 3. Filtragem por hierarquia no backend

- **Serviço:** `backend/src/services/dashboardFilter.js`
- **Lógica:**
  - **Nível 0–1 (CEO, Diretor):** KPIs agregados da empresa (totais).
  - **Nível 2–3 (Gerente, Coordenador):** Dados filtrados por `department_id` do usuário.
  - **Nível 4–5 (Supervisor, Colaborador):** Somente registros do próprio usuário (`sender_id` / `created_by`).

- **Rotas alteradas:**
  - `GET /api/dashboard/summary` — summary com filtro por hierarquia.
  - `GET /api/dashboard/recent-interactions` — interações filtradas + `limit` e `offset`.
  - `GET /api/dashboard/insights` — insights filtrados + `limit` e `offset`.

### 4. Paginação nas listas

- **API:** `limit` e `offset` em `recent-interactions` e `insights`.
- **Frontend:** `getRecentInteractions(10)` e `getInsights(10)` com limite padrão 10.
- **Sem slice fixo:** Dados controlados por parâmetros da API.

### 5. Tipos de visão por nível

- **Estratégico (0–1):** `aggregated` — KPIs globais.
- **Tático (2–3):** `comparative` — comparativo por área/departamento.
- **Operacional (4–5):** `detailed` — listas detalhadas individuais.

O campo `viewType` é retornado no summary para uso futuro no frontend.

---

## Tabelas e filtros

| Tabela          | CEO (0–1) | Gerente/Coord (2–3) | Operacional (4–5) |
|-----------------|-----------|----------------------|-------------------|
| communications  | company_id | + department sender | sender_id = user |
| proposals       | company_id | + department_id     | created_by = user |
| monitored_points| company_id | + department_id     | department_id ou NULL |

---

## Arquivos modificados/criados

| Arquivo | Ação |
|---------|------|
| `frontend/src/pages/AdminSettings.jsx` | Remoção do slice, layout com grid |
| `frontend/src/pages/AdminSettings.css` | Estilos para grid e descrição |
| `frontend/src/components/DashboardChatWidget.jsx` | Novo componente |
| `frontend/src/components/DashboardChatWidget.css` | Estilos do widget |
| `frontend/src/features/dashboard/ExecutiveDashboard.jsx` | Integração do chat |
| `frontend/src/features/dashboard/ExecutiveDashboard.css` | Seção do chat |
| `frontend/src/features/dashboard/DashboardInteligente.jsx` | Bloco de chat |
| `frontend/src/components/RecentInteractions.jsx` | Fallback `text_content` |
| `frontend/src/services/api.js` | Parâmetros `limit` e `offset` |
| `backend/src/services/dashboardFilter.js` | Novo serviço de filtro |
| `backend/src/routes/dashboard.js` | Aplicação dos filtros por hierarquia |

---

## Observações

- Usuários sem `department_id` nos níveis 2–3: recebem dados apenas por `company_id` (comportamento anterior).
- Proposals: depende de `created_by` e `department_id`.
- Monitored_points: filtro por `department_id` quando existir.
