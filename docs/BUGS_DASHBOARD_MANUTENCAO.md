# Bugs Identificados — Dashboard da Manutenção

Varredura realizada em 2025-03-07. Usuários com perfil de manutenção (mecânico, eletricista, técnico, supervisor/coordenador/gerente de manutenção) enfrentam falhas ao acessar o dashboard e módulos.

---

## 1. **APIs `/dashboard/maintenance/*` NÃO EXISTEM**

**Severidade:** Alta  

**Arquivos afetados:**
- `frontend/src/services/api.js` (linhas 291–298): chama endpoints inexistentes
- `frontend/src/features/dashboard/DashboardMecanico.jsx`: depende dessas APIs
- `frontend/src/features/dashboard/centroComando/WidgetManutencao.jsx`: chama `dashboard.maintenance.getSummary()`

**Problema:** O frontend espera:
- `GET /api/dashboard/maintenance/summary`
- `GET /api/dashboard/maintenance/cards`
- `GET /api/dashboard/maintenance/my-tasks`
- `GET /api/dashboard/maintenance/machines-attention`
- `GET /api/dashboard/maintenance/interventions`
- `GET /api/dashboard/maintenance/preventives`
- `GET /api/dashboard/maintenance/recurring-failures`

Porém, `backend/src/routes/dashboard.js` só define `/personalizado` e `/invalidar-cache`. Essas rotas retornam **404**.

**Consequências:**
- DashboardMecanico: todas as chamadas falham → `is_maintenance` permanece `false` → não exibe a camada de manutenção
- WidgetManutencao: exibe "Dados indisponíveis."

---

## 2. **Rota `GET /dashboard/me` NÃO EXISTE**

**Severidade:** Alta  

**Arquivos afetados:**
- `frontend/src/hooks/useDashboardMe.js`: chama `dashboard.getMe()`
- `frontend/src/hooks/useVisibleModules.js`: usa `dashboard.getMe()` para `visible_modules`
- `frontend/src/features/dashboard/DashboardInteligente.jsx`: usa `useDashboardMe`

**Problema:** O comentário em `dashboard.js` diz que `/me` "já pode existir noutro lugar", mas nenhum handler para `/me` foi encontrado no backend. O frontend chama `GET /api/dashboard/me` e recebe **404**.

**Consequências:**
- `payload` em useDashboardMe fica `null`
- `visible_modules` pode ficar vazio (o hook usa fallback para array vazio)
- Dashboard Inteligente pode exibir estado vazio ou erros

---

## 3. **DashboardMecanico NUNCA É RENDERIZADO**

**Severidade:** Alta  

**Arquivos:**
- `frontend/src/pages/Dashboard.jsx`: sempre renderiza `<CentroComando />`
- `frontend/src/features/dashboard/DashboardMecanico.jsx`: componente existente, nunca usado

**Problema:** A rota `/app` sempre renderiza `CentroComando`. Não há lógica para exibir `DashboardMecanico` para perfis de manutenção.

**Consequência:** Usuários de manutenção nunca veem o dashboard específico, mesmo que as APIs fossem criadas.

---

## 4. **Layout.jsx — Perfis de Manutenção sem Menu Adequado**

**Severidade:** Média  

**Arquivo:** `frontend/src/components/Layout.jsx`

**Problema:** O objeto `MENUS` só tem: `admin`, `diretor`, `gerente`, `coordenador`, `supervisor`, `colaborador`, `ceo`.

- Se `user.role` for `technician_maintenance`, `manager_maintenance`, `coordinator_maintenance`, `supervisor_maintenance` ou `mecânico`/`eletricista`, `MENUS[role]` é `undefined`.
- O fallback `MENUS['colaborador']` é usado. Dependendo do perfil, pode não ser o menu adequado.

---

## 5. **LayoutPorCargo.js — Roles em Inglês Não Reconhecidas**

**Severidade:** Média  

**Arquivo:** `frontend/src/features/dashboard/centroComando/LayoutPorCargo.js`

**Problema:** As condições usam termos em português:
- `r.includes('gerente')` → não cobre `manager_maintenance`
- `r.includes('coordenador')` → não cobre `coordinator_maintenance`
- `r.includes('supervisor')` → cobre `supervisor_maintenance`
- `r.includes('técnico')` ou `r.includes('tecnico')` → não cobre `technician_maintenance`

Perfis como `technician_maintenance`, `manager_maintenance`, `coordinator_maintenance` caem no layout genérico (operador/colaborador) em vez do layout de manutenção.

---

## 6. **dashboardPersonalizadoService — Falta Tratamento para Manutenção**

**Severidade:** Média  

**Arquivo:** `backend/src/services/dashboardPersonalizadoService.js`

**Problema:** `gerarConfigPorRegras` trata:
- `role === 'gerente' && (dept.includes('manuten') || dept.includes('mecan'))` — OK para gerente de manutenção
- Não trata `role === 'colaborador'` + `dept === 'maintenance'` para técnico/mecânico
- Não trata roles compostos como `technician_maintenance`, `supervisor_maintenance` etc.

Técnicos de manutenção (`colaborador` + `maintenance`) caem no bloco "Default" e não recebem o widget de manutenção.

---

## 7. **Middleware roleVerification — Possível Bloqueio**

**Severidade:** Baixa (depende da configuração)

**Arquivo:** `backend/src/middleware/roleVerification.js`

**Problema:** As rotas `/dashboard/me` e `/dashboard/maintenance` estão em `STRATEGIC_PATHS`. Se o usuário tiver `role_verified = false` e o `role` for considerado estratégico (ex.: `gerente`), o middleware retorna 403.

`isStrategicRole` usa apenas `['diretor','gerente','coordenador','supervisor']`. Roles como `technician_maintenance` ou `manager_maintenance` não são considerados estratégicos, então provavelmente não bloqueiam. O bloqueio afetaria mais perfis “gerente”/“supervisor” sem verificação.

---

## 8. **useVisibleModules — Fallback com visible_modules Vazios**

**Severidade:** Baixa  

**Arquivo:** `frontend/src/hooks/useVisibleModules.js`

**Problema:** Quando `dashboard.getMe()` falha (404), `visibleModules` fica `[]`.  
`canAccessPath` retorna `true` se `!visibleModules?.length`, então o acesso continua liberado.  
`filterMenu` retorna o menu completo quando `visibleModules` está vazio.

Ou seja, o problema principal não é o bloqueio de acesso, e sim o fato de que o frontend não sabe quais módulos o usuário pode ver.

---

## Resumo de Prioridades

| # | Problema                          | Prioridade |
|---|-----------------------------------|-----------|
| 1 | Criar rotas `/dashboard/maintenance/*` | Crítica   |
| 2 | Implementar `GET /dashboard/me`    | Crítica   |
| 3 | Usar DashboardMecanico para perfis de manutenção em `/app` | Crítica   |
| 4 | Ajustar mapeamento de roles em Layout.jsx | Média     |
| 5 | Incluir roles em inglês em LayoutPorCargo.js | Média     |
| 6 | Tratar manutenção em dashboardPersonalizadoService | Média     |

---

## Próximos Passos Sugeridos

1. **Backend:** Criar router `dashboardMaintenance.js` com as rotas `/summary`, `/cards`, `/my-tasks`, etc., e montá-lo em `/api/dashboard/maintenance`.
2. **Backend:** Implementar `GET /api/dashboard/me` em `dashboard.js` (ou em um serviço dedicado) retornando perfil, KPIs, `visible_modules` e dados de contexto.
3. **Frontend:** Em `Dashboard.jsx`, escolher entre `CentroComando` e `DashboardMecanico` conforme `user.role` e `user.functional_area` (ou `dashboard_profile`).
4. **Frontend:** Expandir mapeamento de roles no Layout e em LayoutPorCargo para incluir os perfis de manutenção (português e inglês).
