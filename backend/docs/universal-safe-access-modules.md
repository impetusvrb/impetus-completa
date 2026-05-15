# Universal Safe Access Modules — Relatório de Implementação

**Data:** 13 de maio de 2026  
**Status:** `universal safe access modules successfully governed`  
**Ambiente:** Produção — IMPETUS Plataforma SaaS Industrial 4.0

---

## 1. Módulos Universalizados

Três módulos receberam acesso universal explícito e controlado:

| Módulo | Route ID | Registry Key | Path |
|---|---|---|---|
| **Registro Inteligente** | `/app/registro-inteligente` | `registro_inteligente` | `/app/registro-inteligente` |
| **Cadastrar com IA** | `/app/cadastrar-com-ia` | `cadastrar_com_ia` | `/app/cadastrar-com-ia` |
| **PróAção** | `/app/proacao` | `proaction` | `/app/proacao` (+ sub-paths) |

---

## 2. Estratégia de Governança

### Princípio Central
> A universalização é **explícita, controlada e limitada** a exatamente 3 módulos.  
> O modelo deny-by-default do restante do sistema permanece **intacto**.

### Allowlist Explícita (Backend)
```js
// backend/src/services/dashboardAccessService.js
const UNIVERSAL_SAFE_ACCESS_MODULES = Object.freeze([
  'proaction',
  'registro_inteligente',
  'cadastrar_com_ia'
]);
```

Essa constante é aplicada em **todos** os caminhos de `getAllowedModules`:
- Liderança sem permissões (`leadershipRoles + permissions = []`)
- Perfis operacionais com permissões
- Portal administrativo (tenant admin) — via `ADMIN_PORTAL_UNIVERSAL_MODULES` expandido

### Bypass Frontend (useVisibleModules)
```js
// frontend/src/hooks/useVisibleModules.js
const UNIVERSAL_SAFE_ACCESS_PATHS = Object.freeze(new Set([
  '/app/proacao',
  '/app/cadastrar-com-ia',
  '/app/registro-inteligente'
]));
```

O bypass atua **antes** de qualquer verificação de `visible_modules`:
- `filterMenuByModules`: retorna `true` antes do filtro por módulo
- `canAccessPath`: retorna `true` antes da resolução de módulo

---

## 3. Menu Lateral Universal

### Menus Atualizados

| Menu (role) | Antes | Depois |
|---|---|---|
| `rh` | Sem PróAção, Registro, Cadastrar | ✅ 3 módulos adicionados |
| `ceo` | Sem PróAção | ✅ PróAção adicionado |
| `admin` | ✅ Já possuía todos | ✅ Preservado |
| `diretor/gerente/coordenador/supervisor` | ✅ Já possuía todos | ✅ Preservado |
| `colaborador` | ✅ Já possuía todos | ✅ Preservado |
| `operador` | ✅ Já possuía todos | ✅ Preservado |
| `manutencao_tecnico` | ✅ Já possuía todos | ✅ Preservado |

### Garantia de Visibilidade
- `dedupeMenuItemsByPath` garante que não há duplicatas
- `filterMenuByModules` não bloqueia os 3 paths (bypass explícito)
- `buildHybridMenu` (Phase 8) não interfere com itens legacy

---

## 4. Acesso Universal Controlado

### Route Guards (`App.jsx`)

**`CEORouteGuard`** — atualizado para incluir PróAção:
```js
const UNIVERSAL_SAFE_ACCESS_CEO_PATHS = [
  '/app', '/app/chatbot',
  '/app/registro-inteligente',
  '/app/cadastrar-com-ia',
  '/app/proacao'  // ← adicionado
];
```

**`ColaboradorRouteGuard`** — já incluía os 3 paths (preservado sem alteração).

**`Layout.jsx` pathOk** — `canAccessPath` agora retorna `true` para os 3 paths via bypass universal, antes de qualquer verificação de `visible_modules`.

### PATH_TO_MODULE (Frontend)
| Path | Antes | Depois |
|---|---|---|
| `/app/registro-inteligente` | `'operational'` | `'registro_inteligente'` |
| `/app/cadastrar-com-ia` | `null` (bloqueava não-admins!) | `'cadastrar_com_ia'` |
| `/app/proacao` | `'proaction'` | `'proaction'` (sem mudança) |

**Problema corrigido:** `/app/cadastrar-com-ia` sem mapeamento retornava `null` no `getModuleForPath`, fazendo o `filterMenuByModules` aplicar `return isStrictAdminRole(u)` — bloqueando todos os não-admins do menu.

---

## 5. Payload Governance

### PróAção (`/api/proacao`)
- Autenticação: `requireAuth` (obrigatório para todas as rotas)
- Escopo: `company_id` do usuário (dados isolados por empresa)
- Visibilidade hierárquica: `requireHierarchyScope` (cada usuário vê conforme seu nível)
- **Sem orchestration**: rota não chama `canOrchestrate`, não gera telemetry operacional
- **Sem cross-domain**: payload contém apenas propostas/ações da empresa do usuário

### Registro Inteligente (`/app/registro-inteligente`)
- Módulo de captura de registros — sem acesso a dados de outros domínios
- Não carrega KPIs operacionais, telemetry ou summaries contextuais

### Cadastrar com IA (`/app/cadastrar-com-ia`)
- Módulo de entrada de dados com suporte de IA
- Não acessa endpoints de dashboard contextual, orchestration ou telemetry

---

## 6. Contextual Governance

### buildIntelligentSummary — Preservado sem alteração
- `domainSafeAlerts` continua bloqueando linguagem operacional para `finance_management`, `hr_management`, `director_unassigned`
- A universalização dos 3 módulos **não toca** este serviço

### canOrchestrate — Preservado sem alteração
| Perfil | Antes | Depois |
|---|---|---|
| `finance_management` | `false` | `false` ✅ |
| `hr_management` | `false` | `false` ✅ |
| `director_unassigned` | `false` | `false` ✅ |
| `operations_management` | `true` | `true` ✅ |
| Admin sistêmico | `true` | `true` ✅ |

### Module Registry — Atualizado
- `proaction`: categoria alterada para `core`, `universal: true`, `required_capabilities: []`, sem dependência de `operational`
- `registro_inteligente`: novo entry `core`, `universal: true`
- `cadastrar_com_ia`: novo entry `core`, `universal: true`
- `/app/registro-inteligente` removido dos paths do módulo `operational` (evita conflito de mapeamento)
- `CANONICAL_MENU_KEYS` expandido com `registro_inteligente` e `cadastrar_com_ia`

---

## 7. Testes Executados

### Suite Nova: `test:universal-safe-access`
**Arquivo:** `backend/src/tests/universalSafeAccessModulesScenarios.js`

| Seção | Testes | Resultado |
|---|---|---|
| Constante UNIVERSAL_SAFE_ACCESS_MODULES | 17 | ✅ PASS |
| getAllowedModules — todos os perfis | 21 | ✅ PASS |
| Segregação dominal | 8 | ✅ PASS |
| Orchestration governance | 5 | ✅ PASS |
| Cognitive summary domain-safe | 4 | ✅ PASS |
| Deny-by-default | 4 | ✅ PASS |
| Integridade da allowlist | 3 | ✅ PASS |
| **Total** | **62** | **✅ 0 falhas** |

#### Personas testadas
- ✅ Financeiro (Diretor Financeiro / `finance_management`) — acessa 3 módulos, sem manuia/hr_intelligence
- ✅ RH (Gerente de RH / `hr_management`) — acessa 3 módulos, sem financial_intelligence/manuia
- ✅ Operações (Supervisor / `operations_management`) — acessa 3 módulos, canOrchestrate preservado
- ✅ Manutenção (Técnico / `maintenance_technician`) — acessa 3 módulos
- ✅ Admin (Tenant Admin) — acessa 3 módulos, portal scope preservado
- ✅ Director_unassigned (Diretor Geral) — acessa 3 módulos, sem domínio operacional atribuído
- ✅ Colaborador (Operador de Produção) — acessa 3 módulos, sem financial/hr_intelligence

---

## 8. Regressões Verificadas

| Suite | Testes | Resultado |
|---|---|---|
| `test:dashboard-governance` | 74 | ✅ 0 falhas |
| `test:contextual-domain-isolation` | 22 | ✅ 0 falhas |
| `test:live-dashboard-contextual` | 112 | ✅ 0 falhas |
| `test:universal-safe-access` | 62 | ✅ 0 falhas |
| **Total global** | **270** | **✅ 0 falhas** |

---

## 9. Riscos Mitigados

| Risco | Mitigação |
|---|---|
| Fail-open global (todos os módulos liberados) | Allowlist de exatamente 3 módulos. `module.universal = true` genérico NÃO foi usado. |
| Abertura de orchestration para domínios não-operacionais | `canOrchestrate` não foi alterado. Finance/RH/director_unassigned continuam bloqueados. |
| Telemetry operacional cross-domain | PróAção não acessa endpoints de telemetry. Payload scoped por `company_id + hierarchyScope`. |
| Reativação de vulnerabilidades antigas (universal fallback) | Bypass é cirúrgico via `UNIVERSAL_SAFE_ACCESS_PATHS` — não altera o fallback de outros paths. |
| Capability inflation global | `getAllowedModules` adiciona apenas 3 chaves. Módulos sensíveis (`operational`, `manuia`, etc.) não são incluídos. |
| Contaminação do modelo deny-by-default | O bypass é implementado no início de `filterMenuByModules` e `canAccessPath`, isolado do resto da lógica. |
| Cross-domain em summaries | `buildIntelligentSummary` preservado intacto, sem qualquer alteração. |
| Regressão de comportamento existente | 270 testes passaram, cobrindo todos os perfis e domínios. |

---

## 10. Estado Final

```
universal safe access modules successfully governed
```

### Checklist Final

- ✅ Registro Inteligente aparece no menu para TODOS os usuários
- ✅ Cadastrar com IA aparece no menu para TODOS os usuários
- ✅ PróAção aparece no menu para TODOS os usuários (incluindo RH e CEO que não tinham)
- ✅ Qualquer usuário pode acessar os 3 módulos (frontend route guards corrigidos)
- ✅ visible_modules sempre inclui os 3 módulos (backend getAllowedModules garantido)
- ✅ Sem vazamento contextual nos 3 módulos
- ✅ Sem telemetry leakage via PróAção
- ✅ Sem orchestration leakage (canOrchestrate preservado por domínio)
- ✅ Sem capability inflation global (allowlist de 3 módulos)
- ✅ Sem universal fallback inseguro (`module.universal = true` genérico NÃO usado)
- ✅ deny-by-default preservado para todos os outros módulos do sistema
- ✅ Governança contextual preservada (buildIntelligentSummary, canOrchestrate intactos)
- ✅ 270 testes passando, 0 falhas

---

## Arquivos Modificados

### Backend
| Arquivo | Tipo de alteração |
|---|---|
| `backend/src/services/dashboardAccessService.js` | `UNIVERSAL_SAFE_ACCESS_MODULES` + `getAllowedModules` |
| `backend/src/contextualModules/moduleRegistry.js` | Entries universais + `CANONICAL_MENU_KEYS` |
| `backend/src/tests/universalSafeAccessModulesScenarios.js` | Novo — suite de testes |
| `backend/package.json` | Script `test:universal-safe-access` |
| `backend/docs/universal-safe-access-modules.md` | Este documento |

### Frontend
| Arquivo | Tipo de alteração |
|---|---|
| `frontend/src/hooks/useVisibleModules.js` | `UNIVERSAL_SAFE_ACCESS_PATHS` + bypass |
| `frontend/src/components/Layout.jsx` | Menu `rh` e `ceo` atualizados |
| `frontend/src/App.jsx` | `CEORouteGuard` com PróAção |
