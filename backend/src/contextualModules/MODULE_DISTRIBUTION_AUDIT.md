# MODULE_DISTRIBUTION_AUDIT

Relatório obrigatório da Phase 6 — Functional Module Orchestration.
Auditoria do estado actual da distribuição de módulos / menus / ferramentas
**antes** da activação do `ContextualModuleOrchestrator`. Tudo o que aqui se
descreve permanece intacto: o orquestrador é aditivo e controlado por flags
(`IMPETUS_CONTEXTUAL_MODULES=off` por defeito).

---

## 1. Vocabulário do produto (clarificação)

| Termo | Significado | Onde existe |
|---|---|---|
| **widget** | Card/cartão renderizado num dashboard (KPI, gráfico, alerta). | `dashboardEngineV2/composition/widgetSelector.js`, `liveDashboardService` |
| **módulo** | Área funcional do produto (entrada de menu / rota frontend). | `dashboardProfiles.visible_modules`, `useVisibleModules.js` |
| **feature** | Capacidade granular dentro de um módulo (ex.: "exportar relatório"). | implícito — capabilities |
| **app** | Subproduto separado, com rota dedicada (ex.: ManuIA). | `/app/manutencao/manuia*`, `manuia` em `visible_modules` |
| **ferramenta operacional** | Centro/painel especializado dentro de um módulo (ex.: "Mapa de Vazamentos", "Centro de Custos"). | rotas `/app/centro-custos-industriais`, `/app/mapa-vazamento-financeiro` etc. |

---

## 2. Como módulos são distribuídos hoje

### 2.1 Cadeia de cálculo (Motor A)

```
GET /dashboard/me
  └─ dashboardProfileResolver.getDashboardConfigForUser(user)
       └─ chooseProfileCode(user)                  → string (ex. "finance_management")
       └─ getProfile(profileCode).visible_modules  → array<string>  (vocabulário canónico)

  └─ dashboardAccessService.getAllowedModules(user)
       └─ profileConfig.visible_modules ∩ MODULE_PERMISSIONS[*]
       └─ withUniversalModules(filtered)           → união com universals
                                                     ['dashboard','proaction','operational','ai','chat','settings']
       └─ retorna array<string>                     (vocabulário canónico)

response.visible_modules = allowedModules.length ? allowedModules : profileConfig.visible_modules
```

### 2.2 Vocabulário canónico actual

`backend/src/config/dashboardProfiles.js` declara 14 chaves usadas:
`dashboard, operational, proaction, chat, biblioteca, ai, hr_intelligence,
anomaly_detection, audit, admin, manuia, quality_intelligence,
raw_material_lots, settings`.

Cada chave está mapeada a paths frontend em
`frontend/src/hooks/useVisibleModules.js` (`PATH_TO_MODULE`):

```
/app                                   → dashboard
/app/dashboard-vivo                    → dashboard
/app/proacao                           → proaction
/app/operacional                       → operational
/app/registro-inteligente              → operational
/app/biblioteca                        → biblioteca
/app/chatbot                           → ai
/app/settings                          → settings
/app/insights                          → operational
/app/cerebro-operacional               → operational
/app/centro-operacoes-industrial       → operational
/app/centro-previsao-operacional       → operational
/app/centro-custos-industriais         → operational
/app/mapa-vazamento-financeiro         → operational
/app/pulse-rh                          → operational
/app/pulse-gestao                      → operational
/app/manutencao/manuia                 → manuia
/app/manutencao/manuia-app             → manuia
/chat                                  → chat
```

> **Implicação crítica:** muitos centros funcionais distintos (Cérebro
> Operacional, Mapa de Vazamentos, Centro de Custos, Pulse RH, Pulse Gestão)
> partilham a **mesma chave `operational`**. Logo, o frontend não consegue
> "abrir" só um centro específico — quando `operational` está ligado, todos
> ficam no menu, sujeitos a `STANDALONE_OPERATIONAL_PATHS` e regras de role.

### 2.3 Filtros frontend adicionais (hardcodes)

`useVisibleModules.js`:

- `STANDALONE_OPERATIONAL_PATHS` — Pulse, Cérebro, Centro de Operações ficam
  visíveis **mesmo sem `operational`** em `visible_modules`. **Hardcode.**
- `STANDALONE_MANUIA_PATHS` — ManuIA fica visível para perfis de manutenção
  via `isMaintenanceProfile(user)`. **Inferência por role.**
- `getModuleForPath` — fallback para `'admin'` se path começa por `/app/admin`,
  `'operational'` se começa por `/diagnostic`. **Hardcode.**

### 2.4 Inferência de perfil (Motor A)

`backend/src/services/dashboardProfileResolver.js`:

- `chooseProfileCode(user)` decide via `role`, `job_title` e regex.
- Cargos como **"Diretor de Finanças"** podem cair em `finance_management`,
  cujo `visible_modules` inclui apenas
  `['dashboard','operational','biblioteca','ai','settings']` — sem
  `manuia`, `hr_intelligence`, `anomaly_detection`, `audit` mesmo quando o
  cargo **deveria** cruzar custos de manutenção, pessoal e risco.

---

## 3. Pontos legados, hardcodes e gates inconsistentes

### 3.1 Hardcodes
1. `frontend/src/hooks/useVisibleModules.js`:
   - mapa `PATH_TO_MODULE` (linhas 10-30)
   - `STANDALONE_OPERATIONAL_PATHS` (linhas 36-42)
   - `STANDALONE_MANUIA_PATHS` (linhas 43-46)
2. `frontend/src/components/Layout.jsx` linhas 53,243,291: filtragem por
   `useVisibleModules`.
3. `backend/src/services/dashboardAccessService.js`:
   - `UNIVERSAL_MODULES` (linha 24) — fixos.
   - `MODULE_PERMISSIONS` (linhas 12-22) — só 9 módulos cobertos.
   - `leadershipRoles = ['ceo','diretor','gerente','coordenador','supervisor']`
     (linha 48) — `role.includes()`-style.
4. `backend/src/config/dashboardProfiles.js` — 14+ perfis hardcoded com
   listas estáticas de `visible_modules`.

### 3.2 Gates inconsistentes
- `MODULE_PERMISSIONS` tem chaves só para `dashboard, operational, proaction,
  chat, biblioteca, ai, audit, admin, settings`. **Faltam:** `manuia`,
  `hr_intelligence`, `quality_intelligence`, `raw_material_lots`,
  `anomaly_detection`. Esses passam pelo filtro **sem checagem de permissão**.
- `getAllowedModules` faz "compatibilidade" especial para liderança quando
  `permissions.length === 0` (linha 51) — bypass discreto que esconde bugs
  de cadastro.
- O frontend `STANDALONE_OPERATIONAL_PATHS` permite Pulse RH "sempre", mas
  o backend só inclui `operational` em alguns perfis — divergência subtil.

### 3.3 Módulos órfãos / invisíveis
- **Cérebro Operacional**, **Centro de Operações Industrial**, **Centro de
  Previsão**, **Pulse Gestão** existem como rotas mas dependem da chave
  `operational`. Na prática, ficam órfãos do mapeamento perfil→modulo.
- **Centro de Custos** e **Mapa de Vazamentos** dependem de `operational`,
  mas semanticamente exigiriam `view:financial` — gate ausente.
- **`hr_intelligence`** entra em `visible_modules` mas não tem
  `MODULE_PERMISSIONS` registado → qualquer perfil que liste a chave a
  mostra, ignorando LGPD high-scope.

### 3.4 Módulos não conectados ao Motor B (antes da Phase 6)
- O Motor B (`dashboardEngineV2`) já existia mas só compunha **widgets**.
- Não havia camada que decidisse `visible_modules` a partir da
  `ContextualIdentity` (`function_type` × `area` × `axes` × `capabilities`).
- Resultado: o vocabulário do `visible_modules` era 100% dependente do
  `profile_code` legado.

---

## 4. Causa raiz do problema reportado (CFO Laurência)

Ao seguir a cadeia para um Diretor de Finanças com `hierarchy_level=5`:

1. `chooseProfileCode` cai em `finance_management`.
2. `finance_management.visible_modules =
   ['dashboard','operational','biblioteca','ai','settings']`.
3. `getAllowedModules` aplica `MODULE_PERMISSIONS`. Como o utilizador é
   liderança sem `permissions` populadas, **passa "compatibilidade"** e
   recebe a lista bruta + universals — **sem `manuia`, `hr_intelligence`,
   `anomaly_detection`, `audit`**.
4. Frontend só mostra os centros mapeados a `operational` — mas como o
   perfil é raso, os centros financeiros operacionais (Cérebro, Centro
   de Custos, Mapa de Vazamentos) ficam sem KPIs adequados (problema do
   Motor A — não desta auditoria).
5. `users.hierarchy_level=5` é inconsistente com cargo de diretor — o
   ContextualIdentity Audit já reportava isto.

**Conclusão:** a atribuição de módulos é **estática, baseada em código de
perfil textual**, sem consideração de função, área, capabilities ou nível
real. O Motor B nunca tinha governado este passo.

---

## 5. O que a Phase 6 introduz (sem alterar o frontend)

| Camada | Ficheiro | Função |
|---|---|---|
| Registry declarativo | `contextualModules/moduleRegistry.js` | 22 módulos com metadados (capabilities, axes, função, nível, LGPD, criticality, deps) |
| Capabilities de módulo | `contextualModules/moduleCapabilities.js` | Namespace `view:module:*` + regras (function_type × area → módulos) |
| Orchestrator | `contextualModules/moduleOrchestrator.js` | ContextualIdentity → `{allowed, denied, menu_keys, contextual_modules}` |
| Validator | `contextualModules/moduleValidator.js` | Críticos / proibidos / overload / LGPD / coerência |
| Telemetria | `contextualModules/moduleTelemetry.js` | Resoluções, uso, gaps, trust score |
| Promotion guard | `contextualModules/modulePromotionGuard.js` | Flags + circuit-breaker + manualForceFallback |
| Façade | `contextualModules/index.js` | `enhanceVisibleModulesWithContext(legacy, user)` |

**Integração no `/dashboard/me`:** três linhas adicionais antes do
`res.json` — em modo `off` (default) o output é byte-a-byte igual ao Motor A.
A chave nova `contextual_modules` (e `contextual_modules_meta`) é aditiva
e é silenciosamente ignorada pelo JSX actual.

**Vocabulário preservado:** `visible_modules` continua array de strings com
chaves canónicas conhecidas pelo frontend (`dashboard`, `operational`,
`manuia`, `hr_intelligence`, `quality_intelligence`, `anomaly_detection`,
`audit`, `admin`, ...). O CFO passa a recebê-las corretamente quando o modo
sobe para `enrich`.

**Rotas administrativas adicionadas:**
- `GET  /api/dashboard/v2/modules/state`     — flags + circuito + manual fallback
- `GET  /api/dashboard/v2/modules/registry`  — catálogo declarativo
- `GET  /api/dashboard/v2/modules/telemetry` — resumo + amostras recentes
- `POST /api/dashboard/v2/modules/usage`     — registo de uso (telemetria)
- `POST /api/dashboard/v2/modules/fallback`  — força fallback manual
- `POST /api/dashboard/v2/modules/clear-fallback`
- `GET  /api/dashboard/v2/modules/preview/:userId?` — preview "como ficaria"

---

## 6. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Frontend depender de chave nova | `contextual_modules` é aditiva; JSX existente ignora |
| Mudança de menu para utilizador hoje | `IMPETUS_CONTEXTUAL_MODULES=off` por defeito; `shadow` valida silenciosamente |
| Fail no orquestrador | `try/catch` na rota + circuit-breaker + telemetria |
| LGPD: high-scope para função errada | validator detecta e em `replace` força downgrade para `enrich` |
| Overload visual | Limites por função no registry; trim ordenado por criticality |
| Rollback | `manualForceFallback(true)` ou `IMPETUS_CONTEXTUAL_MODULES=off` |

---

## 7. Próximas fases (preparado, não implementado)

Hooks estruturais já presentes em `learningHooks.notifyWidgetSelection`
(reutilizado para resoluções de módulos) preparam:

- ML adaptativo de relevância de módulo
- Embeddings de utilizador × módulo
- Score adaptativo por uso real
- Detecção automática de drift contextual

Estas capacidades **NÃO** estão activas — apenas a tubagem está pronta.
