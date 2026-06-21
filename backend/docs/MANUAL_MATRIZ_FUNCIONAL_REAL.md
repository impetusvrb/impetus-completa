# MANUAL DE CONSTRUÇÃO DA MATRIZ FUNCIONAL REAL DO IMPETUS

> **Documento de metodologia oficial de certificação funcional.**
> **Versão:** 1.0 — 2026-06-21
> **Classe de mudança:** `CERT` (instrumentação / evidência — não altera comportamento de produção)
> **Pré-requisito de governança:** Congelamento Arquitetural ativo (nenhum módulo `FEAT` novo durante o ciclo de certificação)
> **Público-alvo:** qualquer engenheiro de software ou auditor técnico que precise reconstruir a matriz funcional do IMPETUS de forma reproduzível, sem depender do autor original.

---

## SUMÁRIO

1. [Parte 1 — O que é a Matriz Funcional Real](#parte-1)
2. [Parte 2 — Inventário Completo do Sistema](#parte-2)
3. [Parte 3 — Relacionamento Tela → API](#parte-3)
4. [Parte 4 — Identificação de Flags](#parte-4)
5. [Parte 5 — Detecção de Mocks](#parte-5)
6. [Parte 6 — Classificação das Funcionalidades](#parte-6)
7. [Parte 7 — Validação Operacional E2E](#parte-7)
8. [Parte 8 — Estrutura Final da Matriz](#parte-8)
9. [Parte 9 — Governança da Matriz (anti-drift)](#parte-9)
10. [Parte 10 — Certificação Final](#parte-10)
11. [Anexo A — Catálogo de comandos de auditoria](#anexo-a)
12. [Anexo B — Âncoras reais do código IMPETUS](#anexo-b)

---

## CONVENÇÕES DESTE MANUAL

- Todos os comandos de busca usam **ripgrep (`rg`)**, pré-instalado. Nunca usar `grep`/`find` recursivos pesados.
- Caminhos sempre relativos à raiz `/var/www/impetus-completa`.
- O backend **oficial de produção** é `backend/` (o mesmo que o PM2 usa). A pasta espelho `impetus_complete/` é **legacy** e **não** deve entrar na matriz, salvo nota explícita.
- "Engenheiro" = qualquer pessoa ou IA executando este procedimento.
- A matriz é **gerada por ferramenta + validada por execução**. Trabalho 100% manual é proibido (não é reproduzível nem auditável).

---

<a name="parte-1"></a>
## PARTE 1 — O QUE É A MATRIZ FUNCIONAL REAL

### 1.1 Conceito

A **Matriz Funcional Real (MFR)** é o inventário executável e verificável de **tudo o que o software realmente faz**, expresso como cadeias rastreáveis:

```
Tela → Ação (botão) → Endpoint → Middleware/Guard → Serviço Backend → Tabela(s) → Resultado observável
```

Cada linha da matriz é uma **afirmação verificável**: "esta funcionalidade, neste perfil, executa este fluxo, persiste neste lugar, sob estas flags, e isto pode ser provado por esta evidência".

A MFR não descreve o que o software **deveria** fazer (isso é a arquitetura). Descreve o que ele **comprovadamente faz hoje**.

### 1.2 Arquitetura ≠ Funcionalidade

| Dimensão | Arquitetura | Funcionalidade |
|----------|-------------|----------------|
| Pergunta que responde | "Como o sistema está organizado?" | "O que o sistema executa de verdade?" |
| Fonte | Diagramas, manifestos, docs de design | Código em execução + persistência + evidência |
| Pode mentir? | Sim (doc desatualizado) | Não (evidência é fato) |
| Exemplo | "Existe o módulo Quality" | "A tela de NC cria registro em `quality_nonconformities` e vincula a CAPA" |

> O IMPETUS hoje tem **visão arquitetural** abundante (~1.000+ docs). O que falta é a **visão funcional comprovada**. A MFR fecha essa lacuna.

### 1.3 As quatro distinções críticas

Estas distinções são a razão de existir da metodologia. Confundi-las é a causa raiz de "achamos que estava 100% funcional".

1. **Tela existente ≠ Fluxo funcional.**
   Uma rota em `App.jsx` que importa um componente prova apenas que **algo renderiza**. Não prova que o fluxo de negócio executa. Um `<QualityWorkspacePage/>` pode montar perfeitamente e ainda assim não conseguir salvar uma NC.

2. **Componente renderizado ≠ Funcionalidade operacional.**
   O componente pode pintar KPIs lindos alimentados por `Math.random()` ou por um array fixo. Renderiza = visual OK. Operacional = dado real, persistido, isolado por tenant.

3. **Endpoint existente ≠ Endpoint funcional.**
   Uma rota `router.post('/x', ...)` existe no arquivo. Funcional significa: responde 2xx, executa lógica de negócio, toca a BD com `company_id` correto, sob auth, sem depender de flag desligada.

4. **Feature implementada ≠ Feature ativa.**
   O IMPETUS tem dezenas de funcionalidades atrás de flags `*_ENABLED=false`. Estruturalmente prontas, operacionalmente inertes. (Ex. real: Learning Layer existe e tem testes, mas roda com `EVENT_GOVERNANCE_LEARNING=false` — **observa, não aprende**.)

### 1.4 Por que a MFR é o principal instrumento de certificação

- É a **única** fonte de verdade que não pode estar desatualizada se for gerada do código e validada por execução.
- É o **gate** entre "Piloto" e "Produção Enterprise": não se certifica o que não se conhece.
- É **auditável**: cada status tem evidência anexada (screenshot, payload, linha de BD, log).
- É **reproduzível**: dois engenheiros (ou IAs) diferentes chegam à mesma matriz seguindo este manual — elimina interpretação subjetiva.
- É **anti-drift**: integrada ao CI, falha quando o código diverge da matriz.

---

<a name="parte-2"></a>
## PARTE 2 — INVENTÁRIO COMPLETO DO SISTEMA

> Objetivo desta fase: produzir dois catálogos brutos — **catálogo de telas** (frontend) e **catálogo de endpoints** (backend) — antes de qualquer cruzamento. Não pular para o relacionamento (Parte 3) sem completar o inventário.

### 2.1 Inventário do Frontend

#### 2.1.1 Mapa de rotas (a espinha dorsal)

O ponto de entrada é `frontend/src/App.jsx`. As rotas usam **lazy loading** (`React.lazy`), o que significa que cada tela tem uma linha `const X = lazy(() => import('...'))` e uma `<Route path=... element=.../>`.

**Procedimento:**

1. Extrair todos os imports lazy (mapeia *nome do componente → caminho do arquivo*):

```bash
rg -n "lazy\(\(\) => import\(" frontend/src/App.jsx
```

2. Extrair todas as declarações `<Route ...>` (mapeia *path → componente → guards*):

```bash
rg -n "<Route\b" frontend/src/App.jsx
```

3. Domínios industriais têm sub-roteadores próprios (padrão `domains/<dominio>/routes/`):

```bash
rg --files frontend/src/domains | rg "routes/.*\.(jsx|js)$"
```

4. O portal executivo (AIOI) tem roteamento dedicado em `frontend/src/modules/aioi/router/` e deep-linking em `modules/aioi/deep-linking/`. Mapear separadamente.

#### 2.1.2 Catálogo de telas

Para **cada** rota, registrar:

| Campo | Como obter |
|-------|-----------|
| **Tela (nome)** | Nome do componente lazy |
| **Rota (URL)** | Atributo `path` da `<Route>` |
| **Arquivo do componente** | Caminho do `import()` |
| **Guard de acesso** | Wrapper da rota (ver 2.1.3) |
| **Perfil permitido** | Resultado do guard (ver 2.1.3) |
| **Lazy / eager** | Se está em `lazy()` ou import direto |

#### 2.1.3 Guards de acesso no frontend

O IMPETUS controla acesso por **role**, **hierarquia** e **capability contextual**. As funções utilitárias estão em `frontend/src/utils/roleUtils.js`. Localizar o uso:

```bash
rg -n "isColaboradorSimples|isMaintenanceTechnicianMenu|canAccessPulseRhRoute|isStrictAdminRole|userHasSystemAdministrationCapability" frontend/src
```

Mapear, por rota, qual condição libera/bloqueia o acesso. Atenção a guards específicos: `ExecutiveAccessGuard` (portal AIOI), `BuildVersionGuard`, e redirecionamentos via `resolveDefaultAppPath`.

#### 2.1.4 Catálogo de ações (botões) e serviços do frontend

Toda comunicação com o backend passa pelo cliente central **`frontend/src/services/api.js`** (axios, `baseURL = /api`, token injetado de `localStorage.getItem('impetus_token')`). Há também serviços auxiliares de voz/avatar em `frontend/src/services/*.js`.

**Procedimento por tela:** dentro do arquivo do componente, localizar handlers de ação e as chamadas de serviço que disparam:

```bash
# Substituir <ComponentFile> pelo arquivo da tela
rg -n "onClick=|onSubmit=|handle[A-Z]\w+|api\.|apiClient|\.get\(|\.post\(|\.put\(|\.patch\(|\.delete\(" frontend/src/pages/<ComponentFile>
```

Para descobrir o método exportado em `api.js` que cada botão chama, e o endpoint real que ele bate:

```bash
rg -n "axios|api\.(get|post|put|patch|delete)\(|`/.*`|'/.*'" frontend/src/services/api.js | rg "<nomeDoMetodo>"
```

### 2.2 Inventário do Backend

#### 2.2.1 Mapa de rotas

As rotas vivem em `backend/src/routes/**` (~130 arquivos) e são montadas no `backend/src/server.js` via um helper (`useRoute`) que injeta `requireAuth` + tenant guard + RLS context automaticamente.

**Procedimento:**

1. Listar todos os arquivos de rota:

```bash
rg --files backend/src/routes | rg "\.js$"
```

2. Extrair todos os endpoints (método + path) de cada arquivo:

```bash
rg -n "router\.(get|post|put|patch|delete)\(" backend/src/routes
```

3. Descobrir como cada router é montado (prefixo de URL) no server:

```bash
rg -n "useRoute\(|app\.use\('/api" backend/src/server.js
```

4. Domínios industriais têm rotas próprias:

```bash
rg -n "router\.(get|post|put|patch|delete)\(" backend/src/domains
```

#### 2.2.2 Catálogo de endpoints

Para **cada** endpoint, registrar:

| Campo | Como obter |
|-------|-----------|
| **Endpoint (path completo)** | prefixo do mount + path da rota |
| **Método HTTP** | `get/post/put/patch/delete` |
| **Middlewares/Guards** | argumentos antes do handler (ver 2.2.3) |
| **Controller/handler** | função final da rota |
| **Serviço executado** | `require(...)` chamado pelo handler |
| **Tabelas tocadas** | `db.query` / nome do serviço (ver Parte 3) |

#### 2.2.3 Guards de autorização do backend (fonte de verdade)

Definidos em **`backend/src/middleware/auth.js`**. Memorizar este contrato:

| Guard | Significado |
|-------|-------------|
| `requireAuth` | Exige sessão válida (tabela `sessions`) **ou** JWT HS256; injeta `req.user`, `req.tenantId` |
| `requireHierarchy(min)` | Nível ≤ min. **0=CEO, 1=Diretoria, 2=Gerente, 3=Coordenador, 4=Supervisor, 5=Colaborador** |
| `requireRole(...roles)` | Role exato (case-insensitive) |
| `requireTenantAdminRole` | `admin` OU capability `system_administration` |
| `requireRhManagementAccess` | Role `rh`, perfil `hr_management` ou liderança com contexto RH |
| `requireCompanyId` | Exige `company_id` no usuário (multi-tenant) |
| `requirePermission(p)` | Permissão granular na lista `user.permissions` |
| `requireFactoryOperationalMember` | Conta de equipe: exige membro operacional selecionado |
| `sameCompanyOnly` | Bloqueia acesso cross-tenant por params/body/query |

Localizar uso de guards por rota:

```bash
rg -n "requireAuth|requireHierarchy|requireRole|requirePermission|requireTenantAdminRole|requireRhManagementAccess|requireCompanyId|requireFactoryOperationalMember|sameCompanyOnly" backend/src/routes backend/src/domains
```

#### 2.2.4 Jobs, workers e governança

Funcionalidades que **não** são acionadas por tela, mas por agendamento/evento. Precisam entrar na matriz como linhas de tipo `BACKGROUND`:

```bash
rg --files backend/src/workers backend/src/jobs 2>/dev/null
rg -n "setInterval|cron|schedule|Worker|Queue" backend/src/workers backend/src/services
```

Governança/cognição (Event Governance, AIOI, Learning, Policy Engine):

```bash
rg --files backend/src/governance backend/src/eventPipeline backend/src/policyEngine backend/src/aioi backend/src/cognitiveRuntime
```

### 2.3 Saída da Parte 2

Dois arquivos brutos, versionados:
- `backend/docs/inventory/FRONTEND_INVENTORY.json` — todas as telas com guards.
- `backend/docs/inventory/BACKEND_INVENTORY.json` — todos os endpoints com guards e serviços.

Estes alimentam a Parte 3.

---

<a name="parte-3"></a>
## PARTE 3 — RELACIONAMENTO TELA → API (RASTREAMENTO COMPLETO)

> Objetivo: para cada ação de cada tela, traçar a cadeia inteira até a BD. Esta é a parte mais valiosa da matriz.

### 3.1 A cadeia canônica

```
[ Tela (page/domain component) ]
        │ usuário clica
        ▼
[ Handler React (onClick / onSubmit / handleX) ]
        │ chama
        ▼
[ Hook ou Service (frontend/src/services/api.js, named export) ]
        │ axios → baseURL "/api"
        ▼
[ HTTP request: MÉTODO /api/<recurso> ]
        │ Nginx (prod) → backend :4000
        ▼
[ Rota Express (backend/src/routes/*.js) ]
        │ requireAuth → tenantGuard → guards específicos
        ▼
[ Controller / handler ]
        │ require(service)
        ▼
[ Serviço Backend (backend/src/services/*.js) ]
        │ db.query(...) com company_id
        ▼
[ PostgreSQL: tabela(s) ]
        │
        ▼
[ Resultado observável: resposta JSON + linha persistida + log ]
```

### 3.2 Metodologia de rastreamento (passo a passo, por ação)

**Passo 1 — Identificar o gatilho na tela.**
No arquivo do componente, achar o handler:

```bash
rg -n "handleSalvar|handleSubmit|onClick|onSubmit" frontend/src/pages/<Tela>.jsx
```

**Passo 2 — Identificar a chamada de serviço.**
Dentro do handler, ver qual método de `api.js` é invocado (ex.: `quality.createNonConformity(payload)`).

**Passo 3 — Resolver o endpoint real.**
Abrir `frontend/src/services/api.js`, localizar o método e ler o path + método HTTP:

```bash
rg -n "<nomeDoMetodo>" frontend/src/services/api.js
```

**Passo 4 — Localizar a rota no backend.**
Com o path (ex. `/quality/nonconformities`), achar o `router.post` correspondente:

```bash
rg -n "nonconformities" backend/src/routes backend/src/domains
```

**Passo 5 — Ler os guards e o serviço.**
No arquivo de rota, anotar guards (Parte 2.2.3) e qual serviço o handler chama.

**Passo 6 — Resolver as tabelas.**
No serviço, localizar as queries:

```bash
rg -n "db\.query|INSERT INTO|UPDATE |SELECT .* FROM|DELETE FROM" backend/src/services/<servico>.js
```

**Passo 7 — Registrar a cadeia** como uma linha da matriz (formato na Parte 8).

### 3.3 Casos especiais de rastreamento

- **Dados via WebSocket/Socket.IO:** algumas telas recebem updates por `socket` (ex.: dashboard ao vivo). Rastrear o canal em `backend/src/socket/` e o cliente `socket.io-client` no frontend.
- **Gráficos:** seguem os componentes canônicos `ImpetusChart`/`ImpetusChartPanel` e devem buscar via `chartDataUtils.js` + APIs `dashboard.getTrend`, `getProductionDemand`, etc. Gráfico que não usa essas fontes é candidato a MOCK (ver Parte 5).
- **IA / chat:** passam por `dashboard/chat`, `cognitive-council/execute` (têm header `x-ai-trace-id`). A cadeia inclui o gateway de IA e pode depender de flags (`IMPETUS_AI_GATEWAY_ENABLED`).
- **Ações governadas (AIOI):** a ação pode ser interceptada pelo Event Governance e ficar em estado `pending`/`shadow`. Isto **não** é falha — é comportamento de flag (Parte 4).

### 3.4 Ferramenta de automação recomendada

Escrever `backend/scripts/audit/buildFunctionalMatrix.js` que executa os passos 1–6 programaticamente (parse AST do frontend + regex dos routers) e emite `FUNCTIONAL_MATRIX.json`. O rastreamento manual fica reservado a casos que a ferramenta marca como `UNRESOLVED`.

---

<a name="parte-4"></a>
## PARTE 4 — IDENTIFICAÇÃO DE FLAGS

> Uma funcionalidade implementada atrás de flag desligada é **operacionalmente inexistente** — mesmo com testes verdes. Esta parte mapeia o estado real.

### 4.1 Onde as flags vivem

1. **Defaults documentados:** `backend/.env.example` (centenas de `*_ENABLED`).
2. **Defaults embutidos no código** (a fonte real de verdade quando o `.env` omite a variável):

```bash
rg -n "process\.env\.[A-Z0-9_]+" backend/src | rg -o "process\.env\.[A-Z0-9_]+" | sort -u
```

3. **Estado efetivo em produção:** só existe no `.env` do servidor. Capturar com um dump redigido (ver 4.4).

### 4.2 Taxonomia de flags

| Classe | Definição | Como reconhecer |
|--------|-----------|-----------------|
| **ATIVA** | `=true` em produção; funcionalidade opera | Valor efetivo `true`/`1` |
| **DESATIVADA** | `=false`; código existe mas inerte | Valor efetivo `false`/`0`/ausente com default false |
| **SHADOW** | Executa em paralelo, **observa, não age** | Flag de modo `shadow` (ex.: RLS `shadow`, Learning observando) |
| **PILOTO** | Ativa só para tenants selecionados | Flag + lista por tenant (ex.: `tenantRlsGovernanceService.isActiveForTenant`) |
| **EXPERIMENTAL** | Ativa só em dev/CI, nunca em prod | Depende de `NODE_ENV !== production` ou `ALLOW_PARTIAL_ENV` |

### 4.3 Flags de alto impacto (mapear primeiro)

Grupos confirmados no `.env.example` do IMPETUS:

- **Governança/Cognição:** `IMPETUS_GOVERNANCE_ENABLED`, `IMPETUS_EVENT_BACKBONE_ENABLED`, `IMPETUS_EVENT_PIPELINE_ENABLED`, `IMPETUS_COGNITIVE_*_ENABLED` (persistence, replay, drift, dashboard…), `IMPETUS_POLICY_*_ENABLED` (discovery, arbitration, simulation…).
- **AIOI:** `IMPETUS_AIOI_ENABLED`, `IMPETUS_AIOI_QUEUE_ACTIVE`, `IMPETUS_AIOI_OUTBOX_WORKER_ENABLED`. (Doc de referência: `backend/docs/AIOI_P0_AUTHORIZATION.md`.)
- **Event Governance / Learning:** flags `EVENT_GOVERNANCE_*` (resolver os nomes exatos via `rg "process.env.EVENT_GOVERNANCE" backend/src` — podem ter default no código e não no `.env.example`). O modo de aprendizagem roda **shadow** por padrão.
- **IA Gateway:** `IMPETUS_AI_GATEWAY_ENABLED`, `IMPETUS_AI_GATEWAY_REALTIME_ENABLED`, `AI_ORCHESTRATOR_ENABLED`, `IMPETUS_UNIFIED_ORCHESTRATOR_ENABLED`.
- **ManuIA:** `MANUIA_EVENT_DISPATCH_ENABLED`, `MANUIA_MANUAL_ESCALATION_ENABLED`, `MANUIA_SIMULATE_INGEST_ENABLED`.
- **Multi-tenant:** `IMPETUS_RLS_MODE` (`shadow`/`on`), `IMPETUS_STRICT_TENANT_FROM_DB`.
- **Segurança/infra:** `NODE_ENV`, `IMPETUS_INTERNAL_NETWORK_DEV_BYPASS`, `IMPETUS_ALLOW_TOKEN_IN_QUERY`, `IMPETUS_JWT_FAIL_CLOSED_PLACEHOLDER`.

### 4.4 Dump do estado efetivo (sem vazar segredos)

Escrever `backend/scripts/audit/dumpEffectiveFlags.js` que roda **no servidor** e emite, para cada flag: nome, valor efetivo, default do `.env.example`, classe (4.2), módulo afetado. **Nunca** dumpar valores de `JWT_SECRET`, chaves de IA, secrets de webhook — apenas `presente/ausente` e comprimento. Saída: `backend/docs/FLAG_BASELINE_FROZEN.md`.

### 4.5 Impacto na matriz

Cada linha da matriz recebe a coluna **Flags** listando as flags que a controlam e a classe de cada. Regra de classificação:

- Funcionalidade cuja flag está **DESATIVADA** → status mínimo **DESABILITADO** (mesmo que o código exista).
- Funcionalidade em **SHADOW** → status **AMARELO** com nota "observando, não age".
- Funcionalidade em **PILOTO** → **AMARELO** com a lista de tenants ativos.

---

<a name="parte-5"></a>
## PARTE 5 — DETECÇÃO DE MOCKS

> Mock que se passa por dado real é o pior inimigo da certificação: a tela parece VERDE mas é fantasia. A regra de projeto (`.cursor/rules/charts-real-data-industrial.mdc`) já **proíbe** mocks em gráficos/KPI — esta parte caça as violações.

### 5.1 Assinaturas de mock (varredura)

```bash
# 1) Aleatoriedade — proibida em valores de gráfico/KPI
rg -n "Math\.random\(" frontend/src backend/src

# 2) Arrays/labels fixos típicos de fallback (ex.: meses cravados)
rg -n "Set.*Out.*Nov|Jan.*Fev.*Mar|\[\s*\{[^}]*value:\s*\d" frontend/src

# 3) Fallbacks artificiais e simulações
rg -n "mock|fakeData|dummy|sampleData|placeholderData|hardcoded|TODO|FIXME|simula" frontend/src backend/src -i

# 4) Dados embutidos no componente (constantes grandes de dados)
rg -n "const .*(DATA|ROWS|ITEMS|SERIES)\s*=\s*\[" frontend/src

# 5) Cores hex soltas em gráficos (sinal de componente fora do padrão canônico)
rg -n "#[0-9a-fA-F]{6}" frontend/src/components/charts frontend/src/pages
```

### 5.2 Critério de marcação

Para cada candidato encontrado, classificar a **funcionalidade** (não a linha de código):

| Marca | Critério |
|-------|----------|
| **MOCK** | O valor exibido ao usuário **não** vem da BD em nenhuma condição (sempre estático/aleatório). |
| **PARCIAL** | Usa dado real no caminho feliz, mas cai em fallback artificial quando a API falha (proibido para gráficos pela regra). |
| **REAL** | 100% origem em serviço/BD; estado vazio mostra mensagem técnica (mono), não dado inventado. |

### 5.3 Falsos positivos legítimos

- **Fixtures de teste** em `backend/tests/**` e `**/__tests__/**` — não contam como mock de produção. Excluir da varredura:

```bash
rg -n "Math\.random\(" frontend/src backend/src -g '!**/tests/**' -g '!**/__tests__/**' -g '!**/*.test.*'
```

- **Skeletons de loading** e dados de exemplo em Storybook — anotar, não classificar como MOCK funcional.
- **Geração de IDs/nonce** com aleatoriedade (ex.: `crypto.randomBytes`) — legítimo, não é mock de dado.

---

<a name="parte-6"></a>
## PARTE 6 — CLASSIFICAÇÃO DAS FUNCIONALIDADES

> Critérios objetivos e mutuamente exclusivos. A classificação é determinada pelo **pior** critério atingido (uma funcionalidade VERDE com um botão quebrado é, no mínimo, AMARELA).

### 6.1 VERDE — Funcional

Todos os itens verdadeiros:
- [ ] A tela renderiza sem erro para o(s) perfil(is) previsto(s).
- [ ] Cada ação (botão) dispara um endpoint **existente** e **respondendo 2xx**.
- [ ] O fluxo persiste na(s) tabela(s) correta(s) com `company_id` do usuário.
- [ ] Os dados exibidos vêm da BD (sem mock; Parte 5 = REAL).
- [ ] Nenhuma flag bloqueante está DESATIVADA/SHADOW para o caminho feliz.
- [ ] Isolamento multi-tenant verificado (usuário de outra empresa não vê o dado).
- [ ] Evidência completa anexada (Parte 7.3).

### 6.2 AMARELO — Parcial

Qualquer um:
- Executa, mas **depende de flag** em SHADOW/PILOTO.
- Parte das ações funciona, parte não (ex.: cria mas não edita).
- Usa fallback artificial em erro (PARCIAL na Parte 5).
- Limitação conhecida documentada (ex.: só caminho feliz, sem tratamento de edge case).

### 6.3 MOCK — Dados simulados

- A funcionalidade exibe dados que nunca vêm da BD (Parte 5 = MOCK). Prioridade alta de correção se for KPI/gráfico (viola regra de projeto).

### 6.4 INCOMPLETO — Em desenvolvimento

Qualquer um:
- Endpoint chamado retorna 404/501 ou não existe.
- Handler do botão é stub (`// TODO`, função vazia, `console.log`).
- Componente é esqueleto sem lógica de negócio.
- Fluxo quebra antes de persistir.

### 6.5 DESABILITADO

Qualquer um:
- Rota comentada em `App.jsx`.
- Flag global da feature DESATIVADA (Parte 4).
- Guard de acesso bloqueia 100% dos perfis existentes (feature inalcançável).

### 6.6 Árvore de decisão

```
A tela renderiza para algum perfil?
 ├─ Não → a rota existe mas guard bloqueia todos? → DESABILITADO
 │         senão (erro de runtime ao montar)       → INCOMPLETO
 └─ Sim
     └─ As ações batem em endpoints existentes?
         ├─ Não (404/501/stub)                      → INCOMPLETO
         └─ Sim
             └─ Os dados são reais (não mock)?
                 ├─ Não (sempre simulado)           → MOCK
                 └─ Sim
                     └─ Persiste + tenant OK + sem flag bloqueante + todas as ações OK?
                         ├─ Não (flag shadow/parcial/limite) → AMARELO
                         └─ Sim                              → VERDE
```

---

<a name="parte-7"></a>
## PARTE 7 — VALIDAÇÃO OPERACIONAL (E2E)

> Classificação sem execução é opinião. Esta parte transforma cada linha da matriz em **fato comprovado**.

### 7.1 Ambiente de validação

- Banco de validação com **seed multi-tenant**: no mínimo 2 empresas (Tenant A, Tenant B) e 1 usuário por nível hierárquico (0–5) por empresa.
- Backend rodando com o **mesmo `.env` que se quer certificar** (idealmente espelho do de produção, com flags reais).
- Frontend buildado apontando para esse backend.
- Ferramenta de automação: `cursor-ide-browser` (MCP) para navegação + captura, e/ou Playwright para suites repetíveis.

### 7.2 Metodologia E2E por domínio (cenários obrigatórios)

Cada cenário deve **criar → ler → mutar → verificar persistência → verificar isolamento de tenant**.

| Domínio | Cenário obrigatório | Verificação de persistência |
|---------|--------------------|------------------------------|
| **Quality** | NC → CAPA → Auditoria | NC gravada; CAPA vinculada à NC; auditoria com trilha; KPI reflete |
| **SST** | Incidente / Quase-acidente / Treinamento vencido | Ocorrência gravada; treinamento vencido dispara alerta no Notification Center |
| **ESG** | Emissão / Resíduo / Consumo | Lançamento agrega no painel; gráfico usa dado real |
| **ManuIA** | Diagnóstico → OS → Histórico | Diagnóstico cria OS; OS muda estado; histórico recupera a cadeia |
| **TPM** | Plano preventivo → execução → indicador | OS preventiva agenda e executa; disponibilidade/MTBF atualiza |
| **AIOI** | Correlação → Insight → Escalonamento | Insight com `confidence`; escala ao canal correto |
| **Executive** | Dashboard executivo por perfil | KPIs hidratam da BD por `company_id`; sem mock; respeita hierarquia |
| **Billing** | Assinatura / cobrança (Asaas) | Webhook HMAC válido; estado de assinatura persiste |
| **DSR/LGPD** | Pedido de titular | Registro criado; worker de retenção processa; trilha auditável |
| **Event Governance** | Evento → política → decisão | Decisão registrada com política aplicada; modo (active/shadow) correto |

### 7.3 Evidências obrigatórias (sem isto, a linha fica "NÃO VALIDADA")

Para cada cenário, anexar e versionar em `backend/docs/evidence/<dominio>/<cenario>/`:

1. **Screenshot** da tela no estado final (via browser MCP).
2. **Payload** enviado (request body redigido de PII).
3. **Resposta da API** (status + body).
4. **Registro no banco** — query de verificação + linha retornada (provando persistência e `company_id`).
5. **Log de execução** — entrada correspondente no structured logger (`utils/structuredLogger.js`) / trace id quando IA.
6. **Prova de isolamento** — a mesma leitura autenticada como Tenant B retorna vazio/403.

### 7.4 Fluxograma de validação de uma linha

```
Selecionar funcionalidade da matriz
        ▼
Autenticar como perfil previsto (nível 0–5)  ──► falha de acesso? → revisar guard (Parte 2.2.3)
        ▼
Executar ação na UI (browser MCP)
        ▼
Capturar request/response  ──► 4xx/5xx? → INCOMPLETO/AMARELO + registrar causa
        ▼
Verificar persistência na BD ──► não persistiu? → INCOMPLETO
        ▼
Verificar dado é real ──► mock? → MOCK
        ▼
Verificar isolamento (Tenant B) ──► vazou? → BLOQUEADOR de segurança (VERMELHO)
        ▼
Anexar 6 evidências → marcar status final (Parte 6) → linha CERTIFICADA
```

---

<a name="parte-8"></a>
## PARTE 8 — ESTRUTURA FINAL DA MATRIZ

### 8.1 Formato

A matriz é mantida em **duas formas sincronizadas**:
- **`FUNCTIONAL_MATRIX.json`** — fonte de verdade, gerada por ferramenta, consumida pelo CI.
- **`FUNCTIONAL_MATRIX.md`** — render humano (tabela), gerado a partir do JSON.

### 8.2 Colunas obrigatórias

| Coluna | Descrição |
|--------|-----------|
| **Módulo** | Domínio/área (Quality, SST, AIOI, Executive…) |
| **Tela** | Nome do componente |
| **Rota** | URL no frontend |
| **Perfil** | Níveis/roles que acessam (0–5 / role) |
| **Funcionalidade** | Ação concreta (ex.: "Registrar NC") |
| **Endpoint** | Método + path (`POST /api/quality/nonconformities`) |
| **Serviço Backend** | Arquivo/serviço executor |
| **Tabelas** | Tabelas tocadas |
| **Flags** | Flags que controlam + classe (Parte 4) |
| **Status** | VERDE / AMARELO / MOCK / INCOMPLETO / DESABILITADO |
| **Evidência** | Link para `backend/docs/evidence/...` |
| **Observações** | Limitações, dependências, notas de drift |

### 8.3 Exemplo completo preenchido (ilustrativo — validar contra o código real)

| Campo | Valor |
|-------|-------|
| **Módulo** | Quality |
| **Tela** | `QualityOperationalWorkspacePage` |
| **Rota** | `/app/quality/operational/workspace` |
| **Perfil** | Níveis 0–4 (CEO→Supervisor); `requireCompanyId` |
| **Funcionalidade** | Registrar Não-Conformidade (NC) |
| **Endpoint** | `POST /api/quality/nonconformities` |
| **Serviço Backend** | `services/quality/nonconformityService.js` |
| **Tabelas** | `quality_nonconformities`, `audit_logs` |
| **Flags** | `IMPETUS_GOVERNANCE_ENABLED=true` (ATIVA); EG decisão em `shadow` se `EVENT_GOVERNANCE_AIOI=false` |
| **Status** | **AMARELO** |
| **Evidência** | `backend/docs/evidence/quality/nc-create/` (screenshot+payload+response+row+log+isolation) |
| **Observações** | Criação e leitura VERDES; escalonamento AIOI em SHADOW (flag OFF). Sobe para VERDE quando `EVENT_GOVERNANCE_AIOI=true` no piloto. |

> **Nota:** nomes de endpoint/serviço/tabela acima são o **formato** esperado. O engenheiro DEVE confirmá-los pelo rastreamento da Parte 3 antes de gravar — não copiar cegamente.

### 8.4 Linha em JSON (schema)

```json
{
  "module": "Quality",
  "screen": "QualityOperationalWorkspacePage",
  "route": "/app/quality/operational/workspace",
  "profiles": ["0","1","2","3","4"],
  "feature": "Registrar Não-Conformidade",
  "endpoint": { "method": "POST", "path": "/api/quality/nonconformities" },
  "backendService": "services/quality/nonconformityService.js",
  "tables": ["quality_nonconformities", "audit_logs"],
  "flags": [
    { "name": "IMPETUS_GOVERNANCE_ENABLED", "class": "ATIVA" },
    { "name": "EVENT_GOVERNANCE_AIOI", "class": "SHADOW" }
  ],
  "status": "AMARELO",
  "evidence": "backend/docs/evidence/quality/nc-create/",
  "notes": "Escalonamento AIOI em shadow; sobe a VERDE no piloto.",
  "lastValidatedAt": "2026-06-21",
  "sourceHash": "<git/sha do arquivo da tela e da rota>"
}
```

---

<a name="parte-9"></a>
## PARTE 9 — GOVERNANÇA DA MATRIZ (ANTI-DRIFT)

> O maior risco de qualquer matriz é virar documento morto. A defesa é torná-la **executável** e ligá-la ao CI.

### 9.1 Quando atualizar

- **Sempre** que uma rota (`App.jsx`, `routes/`, `domains/`) for adicionada/removida/alterada.
- **Sempre** que uma flag mudar de default.
- A cada release (regeneração obrigatória).

### 9.2 Quem atualiza

- O autor da mudança regenera a matriz (`buildFunctionalMatrix.js`) no mesmo PR.
- Validação E2E e mudança de status: responsabilidade do owner do domínio.
- Auditoria final: arquiteto/auditor técnico (papel rotativo).

### 9.3 Como auditar (detecção de drift)

A ferramenta compara o **código atual** com `FUNCTIONAL_MATRIX.json`:
- Rota no código sem linha na matriz → **DRIFT: rota órfã**.
- Linha na matriz sem rota no código → **DRIFT: matriz obsoleta**.
- `sourceHash` divergente → **DRIFT: tela mudou, status precisa revalidação**.

```bash
node backend/scripts/audit/checkMatrixDrift.js --fail-on-drift
```

### 9.4 Integração com CI/CD

Adicionar um job no `ci.yml` (gate de PR):
1. Roda `buildFunctionalMatrix.js` e compara com a versão commitada → **falha se houver drift não commitado**.
2. Roda `checkMatrixDrift.js --fail-on-drift`.
3. Para linhas marcadas VERDE, exige que `evidence/` exista e `lastValidatedAt` esteja dentro da janela de validade (ex.: 90 dias).

> Resultado: é **impossível** mergear código que diverge da matriz sem atualizar a matriz. O drift deixa de ser possível por construção.

---

<a name="parte-10"></a>
## PARTE 10 — CERTIFICAÇÃO FINAL

A matriz alimenta quatro selos de maturidade crescente.

### 10.1 Funcionalmente Certificado
- [ ] 100% das rotas **rastreadas** na matriz (conhecidas — não necessariamente VERDES).
- [ ] 0 drift entre código e matriz (gate de CI verde).
- [ ] Todo MOCK em KPI/gráfico erradicado ou explicitamente classificado e priorizado.
- [ ] Caminho feliz de cada domínio (Parte 7.2) em **VERDE**.

### 10.2 Operacionalmente Certificado
- [ ] Os 10 cenários E2E da Parte 7.2 executados com as **6 evidências** cada.
- [ ] Prova de isolamento multi-tenant em **0 vazamentos**.
- [ ] Observabilidade ativa (métricas/alertas) cobrindo os fluxos certificados.
- [ ] Backup + restore validados; runbook de DR existente.

### 10.3 Pronto para Piloto
- [ ] Funcional + Operacionalmente certificado nos domínios do piloto.
- [ ] Hardening P0 ativo (`NODE_ENV=production`, `JWT_SECRET` forte, bind `127.0.0.1`, Nginx, UFW).
- [ ] `EVENT_GOVERNANCE_AIOI=true` / `EVENT_GOVERNANCE_LEARNING=false` (AIOI age, Learning observa).
- [ ] `FLAG_BASELINE_FROZEN.md` reflete o estado real do servidor.

### 10.4 Pronto para Produção Enterprise
- [ ] Tudo de 10.3, em todos os domínios.
- [ ] Sessão enterprise (refresh token + HttpOnly cookie + CSRF) ativa; zero token em `localStorage`.
- [ ] RLS `enforced` (não `shadow`) validado.
- [ ] CI/CD com test/migration/deploy gate + rollback automático.
- [ ] Piloto assistido de 30–60 dias concluído com métricas dentro do limiar.
- [ ] Learning Layer graduado (`EVENT_GOVERNANCE_LEARNING=true`) por dados, não por data.

### 10.5 Checklist mestre de certificação (resumo)

```
[ ] Parte 2  — Inventário frontend + backend gerados (JSON versionado)
[ ] Parte 3  — Cadeias tela→BD rastreadas (0 UNRESOLVED críticos)
[ ] Parte 4  — FLAG_BASELINE_FROZEN.md com estado efetivo real
[ ] Parte 5  — Varredura de mocks; KPIs/gráficos = REAL
[ ] Parte 6  — Toda linha classificada (VERDE/AMARELO/MOCK/INCOMPLETO/DESABILITADO)
[ ] Parte 7  — 10 cenários E2E com 6 evidências cada
[ ] Parte 8  — FUNCTIONAL_MATRIX.json + .md sincronizados
[ ] Parte 9  — Gate de drift no CI verde
[ ] Parte 10 — Selo alcançado declarado e datado
```

---

<a name="anexo-a"></a>
## ANEXO A — CATÁLOGO DE COMANDOS DE AUDITORIA

```bash
# --- FRONTEND: rotas e telas ---
rg -n "lazy\(\(\) => import\(" frontend/src/App.jsx
rg -n "<Route\b" frontend/src/App.jsx
rg --files frontend/src/domains | rg "routes/.*\.(jsx|js)$"
rg -n "isColaboradorSimples|canAccessPulseRhRoute|isStrictAdminRole|userHasSystemAdministrationCapability" frontend/src

# --- FRONTEND: ações e chamadas de API ---
rg -n "onClick=|onSubmit=|handle[A-Z]\w+" frontend/src/pages
rg -n "\.(get|post|put|patch|delete)\(|`/.*`|'/.*'" frontend/src/services/api.js

# --- BACKEND: rotas, guards, serviços ---
rg --files backend/src/routes | rg "\.js$"
rg -n "router\.(get|post|put|patch|delete)\(" backend/src/routes backend/src/domains
rg -n "useRoute\(|app\.use\('/api" backend/src/server.js
rg -n "requireAuth|requireHierarchy|requireRole|requirePermission|requireCompanyId|sameCompanyOnly" backend/src/routes backend/src/domains
rg -n "db\.query|INSERT INTO|UPDATE |SELECT .* FROM|DELETE FROM" backend/src/services

# --- FLAGS ---
rg -o "process\.env\.[A-Z0-9_]+" backend/src | sort -u
rg -n "_ENABLED|_ACTIVE|_MODE|RLS|EVENT_GOVERNANCE|AIOI" backend/.env.example

# --- MOCKS (excluindo testes) ---
rg -n "Math\.random\(|mock|dummy|fakeData|hardcoded|TODO|FIXME" frontend/src backend/src -i -g '!**/tests/**' -g '!**/*.test.*'

# --- WORKERS / GOVERNANÇA ---
rg -n "setInterval|cron|schedule|Queue|Worker" backend/src/workers backend/src/services
```

---

<a name="anexo-b"></a>
## ANEXO B — ÂNCORAS REAIS DO CÓDIGO IMPETUS (confirmadas em auditoria 2026-06-21)

| Componente | Caminho / Fato |
|-----------|----------------|
| Roteamento frontend | `frontend/src/App.jsx` (lazy loading; pages em `pages/`, domínios em `domains/<d>/routes/`, AIOI em `modules/aioi/`) |
| Cliente HTTP central | `frontend/src/services/api.js` — axios, `baseURL = /api`, token de `localStorage.getItem('impetus_token')` |
| Guards de auth | `backend/src/middleware/auth.js` — `requireAuth`, `requireHierarchy(0..5)`, `requireRole`, `requirePermission`, `requireCompanyId`, `sameCompanyOnly` |
| Níveis hierárquicos | 0=CEO · 1=Diretoria · 2=Gerente · 3=Coordenador · 4=Supervisor · 5=Colaborador |
| Sessão | Tabela `sessions` (DB-backed) + JWT HS256 (algoritmo fixo) |
| Montagem de rotas | `backend/src/server.js` via `useRoute` (injeta tenant guard + RLS context) |
| Rotas backend | `backend/src/routes/**` (~130) + `backend/src/domains/**` |
| Serviços backend | `backend/src/services/**` (~356) |
| Flags | `backend/.env.example` (~670+ linhas; centenas de `*_ENABLED`, defaults também no código) |
| Regra de gráficos | `.cursor/rules/charts-real-data-industrial.mdc` — proíbe `Math.random`/arrays fixos; usar `ImpetusChart`/`ImpetusChartPanel` + `chartDataUtils.js` |
| Logger estruturado | `backend/src/utils/structuredLogger.js` |
| Trace de IA | header `x-ai-trace-id` em `dashboard/chat`, `cognitive-council/execute` |

---

## NOTA FINAL

Este manual é a **metodologia**, não a matriz. Executá-lo na ordem (Parte 2 → 10), com a geração automatizada (Anexo A) e a validação por execução (Parte 7), produz uma **Matriz Funcional Real reproduzível e auditável** — idêntica independentemente de qual engenheiro ou IA a construa. Esse determinismo é, em si, o ativo de certificação que faltava ao IMPETUS.
