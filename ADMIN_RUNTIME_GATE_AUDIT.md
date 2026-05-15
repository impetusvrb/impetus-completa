# Auditoria — Gates de runtime administrativo (IMPETUS)

**Data:** 2026-05-05  
**Objectivo:** Mapear dependências de `role` textual / hardcode vs identidade contextual (`company_role`, capabilities) antes da fase de administração contextual.

## Resumo executivo

- **Problema:** O cargo organizacional *Administrador do Sistema (Admin IMPETUS)* existia na base estrutural mas o runtime continuava a exigir, em vários pontos, `role === 'admin'` ou equivalência a diretoria (`requireHierarchy(1)`, menus `diretor`).
- **Correção (híbrida):** Serviço `contextualSystemAdminService` + capability canónica `system_administration` (e satélites `governance_access`, `organizational_management`, `structural_management`), activação por nome de `company_roles.name` normalizado, com **rollback** `IMPETUS_CONTEXTUAL_SYSTEM_ADMIN=false`.

## Backend

| Área | Ficheiro / padrão | Comportamento legado | Evolução |
|------|-------------------|----------------------|----------|
| Sessão / JWT | `middleware/auth.js` | `applyCanonicalHierarchy`; sem capabilities | Após `requireAuth`: `enrichUserWithContextualCapabilities` em `req.user` |
| Hierarquia | `requireHierarchy(1)` em rotas `/api/admin/*` | Só `hierarchy_level <= 1` | Bypass se `userPassesDirectorLevelHierarchyGate` (capability + flag) |
| Role admin | `requireRole('admin')` | Só `users.role === admin` | `requireTenantAdminRole` — admin OU `system_administration` |
| Rotas afectadas | `adminLearning`, `equipmentLibrary`, `technicalLibrary`, `incidents`, `aiAudit`, `aiPolicies`, `pulse` `/admin/settings` | `requireRole('admin')` | Migradas para `requireTenantAdminRole` |
| Dashboard V2 insights | `routes/dashboard.js` `/v2/decision-trace`, `/v2/divergence`, `/v2/identity-audit` | admin / CEO / diretor | Inclui admin contextual |
| Módulos visíveis | `dashboardAccessService.getAllowedModules` | Perfil + permissões | Se `system_administration`: garante `admin` + `audit` no vocabulário |
| Login | `routes/auth.js` | Sem `company_role_name` no payload | JOIN `company_roles`; `contextual_capabilities` + `hierarchy` canónica na resposta |
| Identidade V2 | `dashboardEngineV2/identity/identityResolver.js` | Só `deriveCapabilities` | Merge de capabilities organizacionais |

## Frontend

| Área | Ficheiro | Padrão legado | Evolução |
|------|----------|---------------|----------|
| Menu lateral | `Layout.jsx` | `MENUS[resolveMenuRole]` | `resolveMenuRole` prioriza `system_administration` → chave `admin` |
| Módulos | `useVisibleModules.js` | `visible_modules` sem `admin` bloqueava `/app/admin` | Bypass `admin` para utilizador com capability; sync de `contextual_capabilities` via `/dashboard/me` |
| Rotas admin | `App.jsx` `StrictAdminRouteGuard` | `role === admin` | `isStrictAdminRole` (inclui contextual) |
| RoleGuard | `App.jsx` | `allowedRoles.includes(role)` | `roleGuardAllows` + fallback para admin contextual em rotas de liderança |
| Saúde do sistema | `SystemHealthPanel.jsx` | Set fixo de roles | Inclui `userHasSystemAdministrationCapability` |
| Empresa / ManuIA / Live panel | `CompanyAdminSettings`, `ManuIA`, `LiveDashboardUnifiedPanel`, `Dashboard` | `role === admin` | Alinhado a `isStrictAdminRole` |

## Capabilities canónicas (organização)

- `system_administration` — gate principal (paridade com `requireTenantAdminRole` e menu admin).
- `governance_access` — governança / políticas cognitivas (semântica; futuros gates finos).
- `organizational_management` — gestão organizacional (paridade hierárquica diretoria em `requireHierarchy(1)`).
- `structural_management` — base estrutural (semântica; alinhada ao mesmo pacote que organizacional).

## Rollback

1. Definir `IMPETUS_CONTEXTUAL_SYSTEM_ADMIN=false` — desliga detecção por cargo e bypass de hierarquia; mantém apenas `users.role === admin` nos novos middlewares (comportamento equivalente ao legado para rotas já migradas para `requireTenantAdminRole`).

2. Opcional: `IMPETUS_SYSTEM_ADMIN_ROLE_SUBSTR=substring1,substring2` para alinhar nomes de cargos na BD sem alterar código.

## Testes

- `backend/src/tests/contextualSystemAdminScenarios.js` — matriz capability, hierarquia, kill switch, diretor preservado, operador bloqueado.

## Notas de governança (least privilege)

- Menu **admin** (`MENUS.admin`) não inclui por defeito o núcleo industrial (Centro de Operações / Cérebro / Insights); isso continua condicionado a `canAccessIndustrialCoreModules` (CEO / diretor industrial).
- Admin contextual segue a mesma regra: perfil de administração de sistema, não exposição automática de dashboards operacionais.
