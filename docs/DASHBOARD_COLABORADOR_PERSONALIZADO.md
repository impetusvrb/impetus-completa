# Dashboard Colaborador — Personalização por Função e Área

## Por que está acontecendo?

O **Auxiliar de Stretch** e o **Monitor de Qualidade** veem o mesmo dashboard porque a personalização hoje usa apenas o **cargo genérico** (`role`), e não a **área funcional** (`functional_area`) nem o **cargo específico** (`job_title`).

### Fluxo atual

```
Login → user.role = "colaborador"
         ↓
Dashboard.jsx: isColaboradorProfile(user) → true (para ambos)
         ↓
Todos recebem DashboardColaborador (conteúdo fixo para produção)
```

Ou seja: qualquer pessoa com `role` em `['colaborador', 'auxiliar_producao', 'auxiliar']` recebe o mesmo componente, independente de:
- `functional_area` (production, quality, maintenance...)
- `job_title` (Auxiliar de Stretch, Monitor de Qualidade, Inspetor...)

### O que o backend já tem

O backend **já oferece** diferenciação por área:

1. **`dashboardProfileResolver`** — combina `role + functional_area + job_title`:
   - `colaborador` + `quality` → `inspector_quality` (cards de qualidade)
   - `colaborador` + `production` → `operator_floor` (cards operacionais)

2. **`dashboardProfiles.js`** — perfil `inspector_quality`:
   - Inspeções pendentes
   - Painel de Qualidade
   - Alertas operacionais

3. **`JOB_TITLE_TO_AREA`** — infere área a partir do cargo (`inspetor` → quality).

### Pontos quebrados

| Ponto | Situação |
|-------|----------|
| **Login não retorna `functional_area`, `job_title`, `dashboard_profile`** | O frontend nunca recebe esses dados no `impetus_user` |
| **Dashboard.jsx usa só `role`** | Ignora `functional_area` e `job_title` |
| **`ROLE_AREA_TO_PROFILE` sem `auxiliar`** | `auxiliar_producao` e `auxiliar` caem em fallback `operator_floor` |
| **`JOB_TITLE_TO_AREA` incompleto** | Faltam "monitor de qualidade", "auxiliar de stretch" |
| **Um único componente DashboardColaborador** | Conteúdo fixo pensado para produção |

---

## O que fazer para dashboards personalizados

### 1. Backend — Login retornar `functional_area`, `job_title`, `dashboard_profile`

Incluir esses campos no `user` do `/auth/login` e garantir que o middleware de auth os carregue na sessão.

### 2. Backend — Mapear cargos e áreas

- Incluir `auxiliar` e `auxiliar_producao` em `ROLE_AREA_TO_PROFILE` (como `colaborador`).
- Em `JOB_TITLE_TO_AREA`, adicionar:
  - "monitor de qualidade" → quality
  - "monitor de qualidade" → quality
  - "auxiliar de stretch" → production
  - "auxiliar stretch" → production

### 3. Frontend — Usar perfil para escolher dashboard

Trocar a lógica de seleção:

**Antes (só role):**
```javascript
// Colaborador → sempre DashboardColaborador
const useColaboradorDashboard = ['colaborador', 'auxiliar_producao', 'auxiliar'].includes(role);
```

**Depois (role + functional_area + dashboard_profile):**
```javascript
// Resolver qual dashboard de colaborador:
// - inspector_quality → DashboardColaboradorQualidade
// - operator_floor → DashboardColaborador (produção)
const profile = user.dashboard_profile || resolveFromRoleAndArea(user);
const useColaboradorQualidade = profile === 'inspector_quality';
const useColaboradorProducao = ['operator_floor', 'colaborador_producao'].includes(profile);
```

### 4. Frontend — Variantes de DashboardColaborador

Criar componentes ou variantes por área:

- **DashboardColaborador** (produção): tarefas, meta turno, pró-ação — para auxiliar de stretch, auxiliar de produção.
- **DashboardColaboradorQualidade**: inspeções pendentes, NC abertas, indicadores de qualidade, lotes — para monitor de qualidade, inspetor.

Alternativa: um único `DashboardColaborador` que carrega widgets dinâmicos conforme `dashboard_profile` ou `functional_area`.

### 5. Cadastro de usuários

Ao criar/editar usuários, preencher corretamente:

- **`functional_area`**: `quality`, `production`, `maintenance`, etc.
- **`job_title`**: "Monitor de Qualidade", "Auxiliar de Stretch", etc.

---

## Resumo da implementação

| Etapa | Onde | O quê |
|-------|------|-------|
| 1 | `backend/routes/auth.js` | Incluir `functional_area`, `job_title`, `dashboard_profile` no user do login |
| 2 | `backend/config/dashboardProfiles.js` | Adicionar `auxiliar`, `auxiliar_producao` em ROLE_AREA_TO_PROFILE; mapear job titles em JOB_TITLE_TO_AREA |
| 3 | `frontend/pages/Dashboard.jsx` | Usar `functional_area` e `dashboard_profile` para escolher entre DashboardColaborador e DashboardColaboradorQualidade |
| 4 | `frontend/features/dashboard/` | Criar `DashboardColaboradorQualidade.jsx` (ou widget dinâmico por perfil) |
| 5 | `frontend/pages/AdminUsers.jsx` | Garantir que `functional_area` e `job_title` sejam salvos e usados |

Com isso, o sistema passa a exibir dashboards específicos para cada função e área.
