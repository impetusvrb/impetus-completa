# CFO CONTEXTUAL MODULE AUDIT — IMPETUS

> **Status:** investigação cirúrgica concluída · sem alterações ao código  
> **Caso de teste:** Laurência Barbarbosa — `Diretor Financeiro (CFO)`  
> **Severidade:** alta — descoberta clara da causa raiz por camada  
> **Data:** Phase 8 — Distribuição funcional contextual (CFO)

---

## Sumário em uma frase

Os 3 módulos estratégicos financeiros (`Centro de Custos`, `Mapa de Vazamento`, `Centro de Previsão`)
**existem no registry, são corretamente entregues pelo orchestrator, têm score alto,
não são bloqueados por nenhuma policy ou capability — mas nunca chegam ao
sidebar do CFO porque o menu lateral é construído estaticamente e só inclui
esses paths para CEO**.

---

## PARTE 1 — Coerência organizacional

### Cadastro real da Laurência (após Phase 7)

```
role                : 'diretor'
hierarchy_level     : 0          (cache em users; canonical = 1 via cr)
area                : 'Financeiro'
functional_area     : 'finance'
job_title           : 'Diretor Financeiro (CFO)'
department          : 'financeiro'
dashboard_profile   : 'finance_management'
company_role_id     : ✓ válido
cr.name             : 'Diretor Financeiro'
cr.hierarchy_level  : 1
```

### Os 3 módulos *devem* fazer parte do CFO?

| Módulo | Justificativa organizacional | Veredito |
|---|---|---|
| **Centro de Custos** (`cost_center`) | Análise de centros de custo industrial é o **núcleo do mandato CFO**. É a peça com que o CFO mede onde o dinheiro entra e sai por área. | **SIM, obrigatório.** |
| **Mapa de Vazamento** (`losses_map`) | Perdas / desperdícios / vazamentos econômicos são responsabilidade financeira estratégica — o CFO é quem dimensiona o impacto monetário. | **SIM, obrigatório.** |
| **Centro de Previsão** (`centro_previsao_operacional`) | Forecast e tendências operacionais alimentam o **planejamento financeiro de médio prazo** (CapEx, fluxo de caixa, projeção de margem). | **SIM, fortemente recomendado.** |

Operacionalmente: o CFO precisa antecipar-se a desvios de custo e perdas;
financeiramente: estes 3 módulos são exatamente onde o impacto monetário se
materializa; contextualmente: eixos `eixo_financeiro`, `eixo_executivo`,
`eixo_operacional`, `eixo_planejamento` estão activos para CFO.

---

## PARTE 2 — Auditoria do `moduleRegistry`

### Existência e compatibilidade dos 3 módulos

| Module ID | Label | Path frontend | `compatible_areas` | `required_capabilities` | `compatible_levels` |
|---|---|---|---|---|---|
| `cost_center` | Centro de Custos | `/app/centro-custos-industriais` | **`finance`** ✓, operations, industrial, admin | `view:financial` | `{min:1,max:3}` |
| `losses_map` | Mapa de Vazamentos | `/app/mapa-vazamento-financeiro` | **`finance`** ✓, operations, industrial | `view:financial`, `view:operational` | `{min:1,max:3}` |
| `centro_previsao_operacional` | Centro de Previsão Operacional | `/app/centro-previsao-operacional` | operations, industrial, production, pcp ⚠ | `view:operational` | `{min:1,max:3}` |
| `financial_intelligence` (consolidado) | Inteligência Financeira | `/app/centro-custos-industriais`, `/app/mapa-vazamento-financeiro` | **`finance`** ✓, operations, industrial, admin | `view:financial` | `{min:1,max:3}` |

### Tabela `IMPLICIT_BY_FUNCTION_AREA.decisao_estrategica.finance`

```js
finance: ['financial_intelligence', 'losses_map', 'cost_center', 'cerebro_operacional', 'insights']
```

`centro_previsao_operacional` **não está listado em `decisao_estrategica.finance`**.
Isto **não bloqueia** (não é uma lista exclusiva), mas reduz o boost de score
contextual quando finance é a área primária.

### Veredito da Parte 2

- ✓ `cost_center`, `losses_map`, `financial_intelligence` declaram `finance` em `compatible_areas`.
- ⚠ `centro_previsao_operacional` declara apenas `[operations, industrial, production, pcp]` — **`finance` ausente**.
- Apesar disso, na simulação real ele ainda é elegível para CFO porque:
  - `compatible_axes` inclui `eixo_executivo` (que está nos `axes_priority` do CFO);
  - `compatible_functions` inclui `decisao_estrategica` (function_type do CFO);
  - O orchestrator (`_isEligible`) usa **OR** entre alinhamentos (axes ∨ functions ∨ areas).

→ **Eleva-se com score baixo** (`0.2`) por não ter alinhamento de área, mas não é rejeitado.

---

## PARTE 3 — Auditoria de Capabilities

`backend/src/dashboardEngineV2/axes/capabilitiesDeriver.js`, derivação para `decisao_estrategica.finance`:

```js
finance: ['view:financial', 'view:strategic', 'view:operational', 'view:maintenance',
          'view:hr', 'view:audit', 'view:quality', 'view:safety',
          'act:approve', 'data:export', 'data:cross_sector']
```

Capabilities efetivas da Laurência (simuladas no pipeline real):

```
act:approve  data:cross_sector  data:export
view:audit   view:financial     view:hr
view:maintenance  view:operational  view:quality
view:safety  view:strategic
(11 capabilities, exatamente o esperado para CFO)
```

### Veredito da Parte 3

- ✓ `cost_center` exige `view:financial` → **possui**.
- ✓ `losses_map` exige `view:financial` E `view:operational` → **possui ambos**.
- ✓ `centro_previsao_operacional` exige `view:operational` → **possui**.
- ✓ `financial_intelligence` exige `view:financial` → **possui**.

**Capabilities NÃO são o problema.**

---

## PARTE 4 — Auditoria de Policies

### `policyCatalog.js` — denies / suppressions / overrides

Pesquisa por `cost_center`, `losses_map`, `centro_previsao` em `policyCatalog.js` e
`dashboardPolicyEngine.js`:

- **Nenhuma policy explícita** denies ou suppresses estes módulos para CFO.
- `FORBIDDEN_BY_FUNCTION_AREA` em `moduleRegistry.js`:

```js
execucao.hr     : ['admin', 'financial_intelligence', 'losses_map', 'cost_center']
supervisao.hr   : ['financial_intelligence']
analise.hr      : ['financial_intelligence']
```

→ Estes proibidos só atingem usuários `function_type` em `(execucao|supervisao|analise) ∧ area=hr`.
A Laurência é `decisao_estrategica + finance` — **não cai em nenhum forbidden**.

### Veredito da Parte 4

**Policies NÃO são o problema.**

---

## PARTE 5 — Auditoria do Orchestrator (tracing real)

### Identidade contextual derivada

```
function_type     : decisao_estrategica
primary_axis      : eixo_financeiro
axes_priority     : [eixo_financeiro, eixo_executivo, eixo_planejamento, eixo_operacional]
area              : finance
hierarchy_level   : 1   (canonical, via company_roles)
capabilities      : 11 (todas relevantes)
```

### Resultado do `orchestrate(identity)` (executado em runtime)

| Module ID | Allowed? | Score | Detail |
|---|---|---|---|
| `cost_center` | ✓ ALLOWED | **0.85** | area_match + axis_match + level_in_range |
| `losses_map` | ✓ ALLOWED | **0.85** | area_match + axis_match + level_in_range |
| `centro_previsao_operacional` | ✓ ALLOWED | **0.20** | axis_match + function_match (sem area_match — penalizado mas elegível) |
| `financial_intelligence` | ✓ ALLOWED | **0.85** | area_match + axis_match + level_in_range |

`menu_keys` retornados pelo orchestrator (após colapso):

```js
['ai', 'anomaly_detection', 'audit', 'dashboard', 'hr_intelligence',
 'manuia', 'operational', 'quality_intelligence', 'settings']
```

> `menu_key` dos 4 módulos financeiros é `'operational'` (compartilhado) — o
> orchestrator **não emite chave de menu individual** para `cost_center` /
> `losses_map` / `centro_previsao_operacional`. A informação rica vai apenas
> em `contextual_modules[]`.

### Veredito da Parte 5

**Orchestrator NÃO é o problema** — entrega corretamente os 4 módulos com
score, paths e capabilities.

---

## PARTE 6 — Auditoria do Menu Lateral (causa raiz visível)

### Como o sidebar é montado em `frontend/src/components/Layout.jsx`

```js
const role = resolveMenuRole(user); // 'diretor' (Laurência)
const baseMenuItems = MENUS[role] || MENU_COLABORADOR_OPERACIONAL;
```

### `MENUS.diretor` = `MENU_LIDERANCA` (linhas 299–310 de `Layout.jsx`)

```299:310:frontend/src/components/Layout.jsx
  const MENU_LIDERANCA = [
    { path: '/app', icon: LayoutDashboard, label: 'Dashboard · IA integrada' },
    { path: '/app/pulse-gestao', icon: Activity, label: 'Impetus Pulse (visão coletiva)' },
    { path: '/app/proacao', icon: Target, label: 'Pró-Ação' },
    { path: '/app/cadastrar-com-ia', icon: Upload, label: 'Cadastrar com IA' },
    { path: '/app/biblioteca', icon: FolderOpen, label: 'Instruções e Procedimentos' },
    { path: '/app/registro-inteligente', icon: FileEdit, label: 'Registro Inteligente' },
    { path: '/app/validacao-organizacional', icon: Shield, label: 'Validação organizacional' },
    { path: '/chat', icon: null, chatIcon: true, label: 'Chat Impetus' },
    { path: '/app/chatbot', icon: null, label: 'Impetus IA', aiIcon: true },
    { path: '/app/settings', icon: Settings, label: 'Configurações' }
  ];
```

→ **Não inclui** `/app/centro-custos-industriais`, `/app/mapa-vazamento-financeiro`, `/app/centro-previsao-operacional`.

### Os 3 paths existem **só** no `MENUS.ceo` (linhas 391–402)

```391:402:frontend/src/components/Layout.jsx
    ceo: [
      { path: '/app', icon: LayoutDashboard, label: 'Dashboard · IA integrada' },
      { path: '/app/centro-previsao-operacional', icon: TrendingUp, label: 'Centro de Previsão' },
      { path: '/app/centro-custos-industriais', icon: DollarSign, label: 'Centro de Custos' },
      { path: '/app/mapa-vazamento-financeiro', icon: TrendingDown, label: 'Mapa de Vazamento' },
      ...
    ]
```

### Não há injeção contextual para CFO

`canAccessIndustrialCoreModules` (linhas 229–237) só injeta o
`MENU_BLOCO_INDUSTRIAL` (Centro de Operações, Cérebro, Insights) quando:

```js
role === 'ceo' ||
(role === 'diretor' && (
  dashboardProfile === 'director_industrial' ||
  dashboardProfile === 'director_operations' ||
  functionalArea.includes('industrial') ||
  functionalArea.includes('operations') ||
  functionalArea.includes('operacoes')
))
```

A Laurência é `role='diretor' ∧ dashboard_profile='finance_management' ∧ functional_area='finance'`
→ **NENHUMA condição é satisfeita** → **bloco industrial não aparece**.

**Não existe um equivalente `MENU_BLOCO_FINANCEIRO`** com os 3 paths para o CFO.

### Acesso direto via URL

```js
const PATH_TO_MODULE = {
  '/app/centro-custos-industriais': 'operational',
  '/app/mapa-vazamento-financeiro': 'operational',
  '/app/centro-previsao-operacional': 'operational',
  ...
};
```

Como `'operational'` está em `visible_modules` do CFO, `canAccessPath()` retorna **true** para os 3 paths.

→ A Laurência consegue navegar via URL escrita à mão, mas **nunca clicará num link visível** porque o menu não os mostra.

### Veredito da Parte 6 — **CAUSA RAIZ #1**

**O menu lateral é construído estaticamente em `Layout.jsx` e só inclui os 3
paths financeiros para `MENUS.ceo`.** Para `MENUS.diretor` (qualquer diretor,
inclusive CFO), os 3 itens não existem. Não há injeção contextual baseada em
`functional_area === 'finance'` ou `dashboard_profile === 'finance_management'`.

---

## PARTE 7 — Auditoria do `CentroComando` + `LiveSurfacePanel`

### O que o utilizador descreveu sobre o painel da Laurência

Painel mostra 4 cartões `viz=line` com label `finance · low`:

- "Interações (semana)"
- "Alertas críticos"
- "Crescimento semanal"
- "Propostas em aberto"

Cada um com mensagem "Sem volume suficiente para análise estatística nesta janela".

E o ticker rodapé `// LIVE | PROD/H | ENERGIA | TURNO 1 | OPERADORES | QUALIDADE | UPTIME`.

### Origem dos cartões

`backend/src/services/eventEngine.js` produz blocks `viz=line` com aquela mensagem
quando `value === 0`. `dashboardComposer.composeLiveDashboardSurface` empacota
esses 4 blocks (gerados por `dashboardKPIs.js` para perfil finance) em
`liveSurface.blocks`.

### O que o `CentroComando.jsx` faz com isso

```168:187:frontend/src/features/dashboard/centroComando/CentroComando.jsx
        {liveSurface?.blocks?.length ? (
          <LiveSurfacePanel surface={liveSurface} />
        ) : (
          <div className="cc__grid">
            {widgets.map((w) => { ... })}
          </div>
        )}
```

Quando `liveSurface.blocks.length > 0` (sempre, porque o eventEngine produz
sempre pelo menos 4 blocks de fallback), o **`LiveSurfacePanel` substitui
completamente** a grelha de widgets do perfil financeiro (`dashboardCtx.widgets`).

### O que o perfil CFO **deveria** mostrar (Motor B legado)

Simulando `dashboardPersonalizationEngine.buildPersonalizedConfig` para a
Laurência, o layout esperado para CFO é (10 widgets):

```
kpi_cards, performance, pergunte_ia, alertas, centro_custos,
resumo_executivo, indicadores_executivos, operacoes, grafico_custos_setor,
centro_previsao
```

— inclui **`centro_custos`** e **`centro_previsao`** como widgets internos
do CentroComando! Esses widgets **EXISTEM** em
`frontend/src/features/dashboard/centroComando/WidgetCentroCustos.jsx` e
`WidgetCentroPrevisao.jsx`, e mostram exatamente o conteúdo que a Laurência
não está vendo.

### Veredito da Parte 7 — **CAUSA RAIZ #2**

**`liveSurface.blocks.length > 0` impede a renderização da grelha de widgets
financeiros do CFO**, exatamente como acontece com o CEO. Os widgets
`centro_custos` e `centro_previsao` (e mais 8) são calculados pelo motor B,
chegam ao frontend em `dashboardCtx.widgets`, mas são descartados em favor
dos 4 cartões `line · low · finance` do `LiveSurfacePanel`.

---

## PARTE 8 — Tracing end-to-end (camada por camada)

| # | Camada | Resultado para CFO Laurência | Veredito |
|---|---|---|---|
| 1 | **Cadastro `users`** | role=diretor, fa=finance, jobTitle=CFO, dashboard_profile=finance_management | ✓ correto |
| 2 | **Hydration sessão (Phase 7)** | hierarchy canonical=1, drift detectado e logado | ✓ correto |
| 3 | **`buildContextualIdentity`** | function_type=decisao_estrategica, area=finance, axes=[financeiro,executivo,planejamento,operacional] | ✓ correto |
| 4 | **Capabilities** | 11 capabilities (view:financial+operational+strategic+...) | ✓ correto |
| 5 | **`moduleRegistry`** | 4 módulos financeiros declarados com `finance` em areas (excepto previsao) | ✓ correto |
| 6 | **`orchestrate()`** | 4 módulos ALLOWED (score 0.85/0.85/0.20/0.85) | ✓ correto |
| 7 | **`enhanceVisibleModulesWithContext`** modo `enrich` | adiciona audit/manuia/quality em `visibleModules`; emite `contextualModules` rico | ✓ correto |
| 8 | **`enhanceVisibleModulesWithContext`** modo `off` (PRODUÇÃO) | não acrescenta nada; `contextualModules` vazio | ⚠ Phase 6 OFF — ver causa #3 |
| 9 | **Frontend `Layout.jsx`** monta sidebar | usa `MENUS.diretor = MENU_LIDERANCA`, **ignora `contextualModules`** | ✗ **causa #1** |
| 10 | **Bloco industrial** | `canAccessIndustrialCoreModules` falha (CFO não bate `industrial/operations`) | ✗ não há equivalente financeiro |
| 11 | **Acesso via URL** | `canAccessPath()` permite (operacional está em `visible_modules`) | ✓ rota livre se digitar URL |
| 12 | **`CentroComando.jsx`** | renderiza, mas `liveSurface.blocks.length>0` substitui a grelha | ✗ **causa #2** |
| 13 | **Widgets `WidgetCentroCustos` / `WidgetCentroPrevisao`** | existem no código, prontos para uso | ✓ disponíveis mas não renderizados |

---

## PARTE 9 — Resultado consolidado

### Onde os 3 módulos desaparecem (mapa preciso de bloqueio)

```
moduleRegistry        ✓ presentes
capabilities          ✓ todas concedidas
policies              ✓ não há deny
orchestrator          ✓ ALLOWED com score
                          │
                          ▼
                    [enhanceVisibleModulesWithContext]
                          │
                          ├─[modo enrich]──► contextualModules[] preenchido ✓
                          └─[modo off (default produção)]──► contextualModules=[] ✗
                          │
                          ▼
            [JSON do /dashboard/me chega ao frontend]
                          │
                          ▼
                    [Layout.jsx]                  ◄── CAUSA RAIZ #1
                MENUS[role] estático;
        Layout.jsx **NÃO consome contextualModules**
        para construir items do sidebar.
        MENUS.diretor (MENU_LIDERANCA) não inclui
        os 3 paths. Bloco industrial só vai para
        director_industrial / director_operations.
                          │
                          ▼  (mesmo se a Laurência digitar a URL)
                    [/app] = CentroComando.jsx     ◄── CAUSA RAIZ #2
        liveSurface.blocks.length > 0 substitui
        toda a grelha de widgets, escondendo
        WidgetCentroCustos e WidgetCentroPrevisao
        que estavam prontos para o CFO.
```

### Causas raiz por ordem de impacto visual

1. **#1 — Menu lateral estático sem injeção financeira (impacto altíssimo).**
   `MENUS.diretor` (`MENU_LIDERANCA`) em `Layout.jsx` linhas 299–310 não inclui
   os 3 paths. Não há `MENU_BLOCO_FINANCEIRO` análogo ao `MENU_BLOCO_INDUSTRIAL`.
   Não há condição em `canAccessIndustrialCoreModules` que cubra `finance` /
   `finance_management`. Resultado: CFO **nunca vê os ícones no sidebar**.

2. **#2 — `LiveSurfacePanel` substitui a grelha de widgets executivos (impacto alto).**
   `CentroComando.jsx` linhas 168–187: `liveSurface?.blocks?.length ? <LiveSurface/> : <Grid/>`.
   Os widgets internos do CFO (`WidgetCentroCustos`, `WidgetCentroPrevisao`,
   `WidgetGraficoCustosSetor`, `WidgetIndicadoresExecutivos` etc.) ficam
   ocultos porque o eventEngine sempre produz pelo menos 4 blocks de fallback.

3. **#3 — Phase 6 (`IMPETUS_CONTEXTUAL_MODULES`) está `off` em produção (impacto médio, condicional).**
   Em modo `off`, `contextualModules` chega vazio ao frontend. Mesmo se mudasse
   para `enrich`, **o frontend actual não consome `contextualModules`** — só
   `visible_modules`. Logo, ligar Phase 6 sozinho não faria os 3 itens
   aparecerem no sidebar até que o `Layout.jsx` aprenda a consumir
   `contextualModules`.

4. **#4 — `centro_previsao_operacional` sem `finance` em `compatible_areas` (impacto baixo, residual).**
   Reduz score do `Centro de Previsão` para CFO (0.20 em vez de 0.85). O
   módulo ainda passa, mas com prioridade baixa em qualquer ranking
   contextual. Inconsistência semântica face às outras 3 entradas
   `decisao_estrategica.finance` que listam `losses_map` e `cost_center`.

### Resposta arquitetural definitiva

> **"O CFO deveria receber esses módulos?"**

**Sim. Inquestionavelmente.** Organizacional, operacional e financeiramente,
estes 3 módulos são **núcleo do mandato do CFO**. O sistema **já reconhece
isso** na camada contextual (orchestrator, capabilities, policies) — o
desalinhamento está apenas no **menu estático do frontend** e na
**substituição absoluta da grelha pelo LiveSurface**.

> **"Qual camada está impedindo o CFO de receber os módulos?"**

Em ordem decrescente:

1. `frontend/src/components/Layout.jsx` — menu estático, sem bloco financeiro.
2. `frontend/src/features/dashboard/centroComando/CentroComando.jsx` — `liveSurface` substitui grid.
3. `IMPETUS_CONTEXTUAL_MODULES=off` em produção — contextualModules nem é emitido.
4. `centro_previsao_operacional.compatible_areas` — não inclui `finance` (cosmético).

### O que NÃO é o problema

- ✗ `moduleRegistry` (todos os 4 módulos existem e são corretamente declarados, com excepção residual da #4)
- ✗ Capabilities (CFO recebe 11, mais que suficiente)
- ✗ Policies (nenhum deny / suppress / forbidden atinge CFO)
- ✗ Orchestrator (entrega 4/4 com score)
- ✗ Validator (nenhuma severidade alta detectada)
- ✗ Module Promotion Guard (não está em fallback nem circuit-breaker)
- ✗ Hierarquia / Phase 7 (canonical=1 está dentro do range `[1,3]`)
- ✗ Identidade contextual (function_type, area, axes corretos)
- ✗ Cache obsoleto (orchestrator não usa cache de 24h)

---

## Apêndice A — Próximas decisões arquitecturais (para fase de correção, *não aplicadas aqui*)

A correção tem de ser cirúrgica em 2–3 ficheiros, sem alterar visual:

1. **`Layout.jsx`** — adicionar bloco de injeção financeira simétrico ao
   `canAccessIndustrialCoreModules`:

   ```js
   const canAccessFinancialCoreModules =
     role === 'ceo' ||
     (role === 'diretor' && (
       dashboardProfile === 'finance_management' ||
       functionalArea === 'finance'
     ));
   const MENU_BLOCO_FINANCEIRO = [
     { path: '/app/centro-custos-industriais', icon: DollarSign, label: 'Centro de Custos' },
     { path: '/app/mapa-vazamento-financeiro', icon: TrendingDown, label: 'Mapa de Vazamento' },
     { path: '/app/centro-previsao-operacional', icon: TrendingUp, label: 'Centro de Previsão' }
   ];
   ```

2. **`CentroComando.jsx`** — em vez de substituir, **complementar**:
   `liveSurface` em cima + grid de widgets do perfil em baixo (ou vice-versa),
   para que o CFO veja `WidgetCentroCustos` e `WidgetCentroPrevisao` mesmo com
   o painel "vivo" cheio de fallbacks `low`.

3. **`moduleRegistry.js`** — adicionar `finance` a
   `centro_previsao_operacional.compatible_areas` para fechar a inconsistência
   semântica.

4. (opcional) Quando o frontend evoluir, **`Layout.jsx` consumir
   `contextualModules`** vindos do `/dashboard/me` em modo `enrich` para que o
   menu seja governado pela mesma fonte do orchestrator — eliminando
   permanentemente a divergência menu-vs-orquestração.

---

**Conclusão:** o cérebro contextual está correto. O sistema **sabe** que o
CFO deve ver `Centro de Custos`, `Mapa de Vazamento` e `Centro de Previsão`.
Mas o **frontend ainda fala em hardcode** — e por isso o CFO está a ver um
dashboard subestimado mesmo com a engenharia contextual a funcionar como
projetada. A correção é pequena, focada e arquitetonicamente coerente; a
investigação acima entrega o mapa preciso onde aplicar.
