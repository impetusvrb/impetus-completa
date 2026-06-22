# IMPETUS — PLANO MESTRE DE LIGAÇÃO INDUSTRIAL v2.0

> **Documento:** Plano de execução oficial  
> **Versão:** 2.0 — 2026-06-22  
> **Gerado por:** Auditoria do Plano v1.0 contra `MANUAL_MATRIZ_FUNCIONAL_REAL.md`  
> **Classe de mudança:** `CERT` (planejamento — não executa código)  
> **Estado do produto:** Piloto Industrial Avançado (~7,8/10) — produto existente, não greenfield

---

## Premissas (leia antes de executar qualquer etapa)

1. **O IMPETUS já existe.** 173 módulos de backend, 356+ serviços, 77 telas mapeadas, 1.098 endpoints, EG-01→13 implementados. O objetivo é **certificar e ligar**, não construir do zero.
2. **A Matriz Funcional é a única fonte de verdade.** Toda correção, ligação e validação parte dela. Nenhuma etapa é considerada concluída sem artefato rastreável.
3. **Congelamento ativo.** Durante todo o ciclo CERT, são permitidas apenas mudanças de classe `FIX` (bug), `CERT` (evidência/auditoria), `SEC` (hardening), `OPS` (deploy/observabilidade). Classe `FEAT` (nova funcionalidade) está **proibida** até CERT-04 concluído.
4. **VERDE exige evidência.** Nenhuma funcionalidade pode ser classificada como VERDE sem as 6 evidências obrigatórias: screenshot, payload, resposta API, linha no banco, log de execução, prova de isolamento multi-tenant.
5. **Estado real hoje:**
   - `NODE_ENV=development` no PM2 (risco crítico)
   - `LISTEN_HOST` ausente (API pode expor em `0.0.0.0`)
   - `ALLOWED_ORIGINS` ausente (CORS inseguro)
   - `IMPETUS_RLS_MODE=on`, `IMPETUS_AIOI_ENABLED=true`, `IMPETUS_GOVERNANCE_LEARNING=shadow`

---

## Visão geral do ciclo

```
FASE 0  Congelamento         (1 dia)
FASE 1  CERT-01 Diagnóstico  (10–15 dias)
FASE 2  CERT-02 Segurança    (8–12 dias — inicia em paralelo à Fase 1)
FASE 3  Correção FIX         (7–14 dias — deriva da Fase 1)
FASE 4  Certificação E2E     (10–15 dias)
FASE 5  CERT-03 Operações    (8–12 dias)
FASE 6  CERT-04 Piloto       (30–60 dias calendário)
FASE 7  Go-live em escala    (após CERT-04)
```

**Gates obrigatórios** (nenhuma fase inicia sem o gate anterior fechado):

| Gate | Critério |
|------|---------|
| G0→1 | Freeze documentado, classes de mudança acordadas |
| G1→2 | 100% rotas rastreadas na matriz; FLAGS_BASELINE congelado |
| G2→3 | P0 segurança ativo; `NODE_ENV=production` no PM2 |
| G3→4 | Zero linhas VERMELHO bloqueadoras; 0 mocks em KPI/gráfico |
| G4→5 | Cenários E2E dos 10 domínios com evidência completa |
| G5→6 | CI/CD + backup/restore + observabilidade ativos |
| G6→7 | 30–60 dias piloto estável; Learning graduado por dados |

---

## FASE 0 — CONGELAMENTO ARQUITETURAL

**Duração:** 1 dia  
**Objetivo:** parar a expansão para permitir a estabilização. Sem isto, qualquer certificação fica obsoleta antes de terminar.  
**Quem executa:** arquiteto / responsável técnico

### Etapa 0.1 — Declarar o freeze

- Revisar e ativar a regra em `.cursor/rules/architecture-freeze.mdc` (já criada).
- Comunicar formalmente: sem EG-14+, sem novos runtimes, sem novas engines até CERT-04.
- Classes permitidas: `FIX`, `CERT`, `SEC`, `OPS`.

**Artefato de saída:** registro de freeze com data e assinatura do responsável.

### Etapa 0.2 — Fotografar o estado de flags reais

- Rodar `dumpEffectiveFlags.js` no servidor de produção (ou ler o `.env` real).
- Gerar `backend/docs/FLAG_BASELINE_FROZEN.md` com: nome da flag, valor efetivo, default do `.env.example`, classe (ATIVA / DESATIVADA / SHADOW / PILOTO), módulo afetado.
- **Não expor segredos** — apenas presença/ausência e comprimento dos valores sensíveis.

**Artefato de saída:** `FLAG_BASELINE_FROZEN.md` versionado.

**Definition of Done:** freeze ativo, `FLAG_BASELINE_FROZEN.md` no repositório, zero commits de classe `FEAT` aceitos.

---

## FASE 1 — CERT-01: DIAGNÓSTICO COMPLETO

**Duração:** 10–15 dias  
**Objetivo:** transformar "sistema existente" em **mapa verificável** de tudo o que funciona, o que é parcial, o que é mock e o que está desabilitado.  
**Quem executa:** engenheiro de qualidade / auditor técnico  
**Entrada:** código-fonte, `.env` real, artefatos de inventário já gerados

---

### Etapa 1.1 — Inventário automatizado frontend

**O que fazer:**
- Executar `node backend/scripts/audit/buildFunctionalMatrix.js`
- Confirmar que todas as 77 rotas estão mapeadas com: tela, rota, guards de acesso, perfil, status preliminar.
- Verificar rotas de domínios industriais aninhadas (`/app/quality/operational/*`, `/app/safety/operational/*`, `/app/environment/operational/*`, `/app/logistics/operational/*`).
- Para cada tela: confirmar existência do arquivo do componente (`screenFileExists`).

**Como executar:**
```bash
node backend/scripts/audit/buildFunctionalMatrix.js
# Inspecionar saída:
cat backend/docs/FUNCTIONAL_MATRIX.md | head -60
```

**O que NÃO fazer:** mapear manualmente botão a botão — isso é feito por rastreamento de código (Etapa 1.3).

**Artefato de saída:** `FUNCTIONAL_MATRIX.json` atualizado + `FRONTEND_INVENTORY.json`.

---

### Etapa 1.2 — Inventário automatizado backend

**O que fazer:**
- Confirmar os 1.098 endpoints nos 142 mounts.
- Para cada endpoint: método HTTP, path completo, `auth` (sim/não), arquivo de rota, flags `process.env` referenciadas, serviços candidatos, tabelas candidatas.
- Separar endpoints sem `requireAuth` (hoje: 324) — estes precisam de triagem manual: são públicos legítimos (login, OIDC/SAML, SCIM) ou exposição indevida?

**Como executar:**
```bash
node -e "
  const b=require('./backend/docs/inventory/BACKEND_INVENTORY.json');
  const noauth=b.endpoints.filter(e=>!e.auth);
  console.log('Sem auth:', noauth.length);
  noauth.forEach(e=>console.log(e.method, e.path, '::', e.module));
" | head -60
```

**Triagem de auth:** para cada endpoint sem `requireAuth`, classificar como:
- `PUB-OK` — público intencional (login, health, OIDC)
- `PUB-RISCO` — deveria ter auth (investigar e corrigir na Fase 3)
- `ESPECIALIZADO` — tem auth própria (SCIM bearer, webhook HMAC)

**Artefato de saída:** `BACKEND_INVENTORY.json` com campo `authClassification` preenchido.

---

### Etapa 1.3 — Rastreamento tela → API (cadeia completa)

**O que fazer:** para cada tela, traçar a cadeia:

```
Tela → Handler (onClick/onSubmit) → Método em api.js → Endpoint backend → Guard → Serviço → Tabela(s)
```

**Como executar (por tela):**
```bash
# Passo 1: localizar chamadas de serviço na tela
rg -n "onClick=|onSubmit=|handle[A-Z]\w+" frontend/src/pages/<Tela>.jsx

# Passo 2: localizar o endpoint em api.js
rg -n "<nomeDoMetodo>" frontend/src/services/api.js

# Passo 3: localizar a rota no backend
rg -n "<path-do-endpoint>" backend/src/routes backend/src/domains

# Passo 4: localizar tabelas no serviço
rg -n "db\.query|INSERT INTO|FROM |UPDATE " backend/src/services/<servico>.js
```

**Prioridade de rastreamento:** começar pelos 10 cenários de certificação (Etapa 1.5).

**Artefato de saída:** colunas `endpoint`, `backendService`, `tables` preenchidas na matriz por domínio.

---

### Etapa 1.4 — Varredura de mocks e flags

**O que fazer:**

```bash
# Mocks proibidos em KPI/gráfico (regra design system)
rg -n "Math\.random\(" frontend/src backend/src \
  -g '!**/tests/**' -g '!**/*.test.*'

# Arrays/labels fixos de fallback
rg -n "Set.*Out.*Nov|Jan.*Fev.*Mar|\[\s*\{[^}]*value:\s*\d" frontend/src

# Placeholders e dados hardcoded
rg -n "dummy|fakeData|hardcoded|TODO.*dado|FIXME.*dado" frontend/src -i

# Flags de feature que controlam funcionalidades críticas
rg -n "process\.env\.EVENT_GOVERNANCE" backend/src | sort -u
rg -n "process\.env\.IMPETUS_AIOI" backend/src | sort -u
```

**Classificação por item encontrado:**
- `MOCK` — sempre simulado, nunca vai à BD
- `PARCIAL` — dado real no happy path, fallback artificial no erro
- `REAL` — 100% origem em serviço/BD

**Artefato de saída:** `backend/docs/audit/MOCK_AUDIT.md` com cada ocorrência classificada.

---

### Etapa 1.5 — Pré-classificação por domínio (semáforo)

**O que fazer:** para cada domínio, atribuir status preliminar baseado nas etapas 1.1–1.4:

| Domínio | Cenário obrigatório | Status mínimo esperado |
|---------|---------------------|------------------------|
| Quality | NC → CAPA → Auditoria | Rastrear cadeia completa |
| SST | Incidente / Quase-acidente / Treinamento vencido | Rastrear cadeia completa |
| ESG | Emissão / Resíduo / Consumo | Rastrear cadeia completa |
| ManuIA | Diagnóstico → OS → Histórico | Rastrear cadeia completa |
| TPM | Plano preventivo → execução → indicador | Rastrear cadeia completa |
| AIOI | Correlação → Insight → Escalonamento | Rastrear cadeia + flags |
| Executive | Dashboard por perfil hierárquico | Rastrear cadeia + mocks |
| Billing | Assinatura / webhook Asaas | Rastrear cadeia + `ASAAS_*` |
| DSR/LGPD | Pedido de titular | Rastrear cadeia + worker |
| Event Governance | Evento → política → decisão | Rastrear flags EG-01→13 |

**Artefato de saída:** `FUNCTIONAL_MATRIX.json` com todos os 77 registros classificados em VERDE / AMARELO / MOCK / INCOMPLETO / DESABILITADO.

---

### Etapa 1.6 — Relatório técnico de diagnóstico

**O que fazer:** consolidar tudo em `backend/docs/CERT_01_DIAGNOSTIC_REPORT.md`:
- Distribuição de status por domínio (tabela semáforo)
- Lista de mocks encontrados em KPI/gráfico (prioridade alta)
- Lista de endpoints `PUB-RISCO` (prioridade de segurança)
- Lista de flags com estado real vs default
- Dependências ausentes que bloqueiam o happy path de cada domínio

**Gate G0→1:** este relatório é o documento de entrada para todas as fases seguintes.

**Definition of Done:** 100% das 77 rotas classificadas; zero `UNRESOLVED` nos 10 cenários obrigatórios; relatório revisado e aprovado.

---

## FASE 2 — CERT-02: SEGURANÇA P0

**Duração:** 8–12 dias  
**Início:** em paralelo à Fase 1 (itens P0 não dependem da matriz completa)  
**Objetivo:** fechar os bloqueadores críticos que impedem qualquer exposição externa  
**Quem executa:** engenheiro de backend / SRE  
**Entrada:** `ENTERPRISE_HARDENING_REPORT.md`, `SECURITY_HARDENING_VPS.md`

---

### Etapa 2.1 — Ativar modo produção no PM2

**Por que:** hoje `NODE_ENV=development` no PM2 → CORS permissivo, guards internos bypassados, `LISTEN_HOST=0.0.0.0`.

**Como executar:**
```bash
# 1. Garantir que backend/.env tem as vars obrigatórias:
LISTEN_HOST=127.0.0.1
NODE_ENV=production
ALLOWED_ORIGINS=https://app.seudominio.com
IMPETUS_INTERNAL_NETWORK_DEV_BYPASS=false
IMPETUS_INTERNAL_ROUTE_DENY_BY_DEFAULT=true

# 2. Reiniciar com profile de produção:
pm2 restart ecosystem.config.js --env production --update-env

# 3. Verificar bind:
ss -tlnp | grep -E ':3000|:4000'
# DEVE mostrar 127.0.0.1:3000 e 127.0.0.1:4000 (não 0.0.0.0)
```

**Definition of Done:** `ss` mostra bind localhost; `curl http://IP_EXTERNO:4000/health` falha por timeout ou recusa.

---

### Etapa 2.2 — Nginx como reverse proxy

**Por que:** backend nunca deve ser acessado diretamente. Toda request vem via Nginx (HTTPS).

**Como executar:**
```bash
# Arquivos já existem — só instalar e ativar:
sudo cp infra/nginx/impetus-proxy.conf /etc/nginx/snippets/impetus-proxy.conf
sudo cp infra/nginx/impetus-proxy-ws.conf /etc/nginx/snippets/impetus-proxy-ws.conf
sudo cp infra/nginx/impetus.conf /etc/nginx/sites-available/impetus

# Substituir domínio:
sudo sed -i 's/SEU_DOMINIO/app.seudominio.com/g' /etc/nginx/sites-available/impetus

sudo ln -sf /etc/nginx/sites-available/impetus /etc/nginx/sites-enabled/impetus
sudo rm -f /etc/nginx/sites-enabled/default

sudo bash infra/scripts/update-cloudflare-ips.sh
sudo nginx -t && sudo systemctl reload nginx
```

**SSL:** Certbot + Cloudflare (Full strict) ou Origin Certificate.

**Definition of Done:** `https://app.seudominio.com` responde; headers de segurança presentes (`Strict-Transport-Security`, `X-Frame-Options`, `Content-Security-Policy`).

---

### Etapa 2.3 — UFW Cloudflare-only

**Por que:** sem firewall, qualquer pessoa acessa a API pelo IP direto.

**Como executar:**
```bash
# Abrir sessão SSH de reserva antes (evitar lock-out)
export ADMIN_SSH_IP="SEU_IP_FIXO"
sudo -E bash /var/www/impetus-completa/infra/scripts/ufw-cloudflare-only.sh

# Verificar:
sudo ufw status verbose
curl -m 5 http://IP_DA_VPS:4000/health  # deve FALHAR de fora
```

**Definition of Done:** acesso direto ao IP bloqueado; acesso via domínio/Cloudflare funciona.

---

### Etapa 2.4 — Rotacionar segredos críticos

**Por que:** `JWT_SECRET` atual (62 ch) pode ter sido comprometido durante o período com portas abertas.

**Como executar:**
```bash
# Gerar novo secret forte:
openssl rand -base64 48   # → novo JWT_SECRET

openssl rand -hex 32      # → novo HEALTH_DETAIL_KEY

# Atualizar backend/.env:
JWT_SECRET=<novo-valor>
HEALTH_DETAIL_KEY=<novo-valor>

# Reiniciar:
pm2 restart impetus-backend --update-env
```

**Atenção:** rotacionar `JWT_SECRET` invalida JWTs ativos. Sessões DB-backed (`sessions.token`) sobrevivem. Avisar usuários antes se houver sessões ativas.

**Definition of Done:** backend inicia sem erro; `/api/auth/login` retorna token válido com novo secret; logs sem `[AUTH] JWT_SECRET inseguro`.

---

### Etapa 2.5 — Implementar Refresh Token + HttpOnly Cookie + CSRF

**Por que:** token em `localStorage` é vetor XSS. Etapa 65 do plano original pedia "validar refresh" — mas ele **ainda não existe**.

**O que implementar (classe `SEC`):**

1. **Refresh token:** gerar com `crypto.randomBytes(32)` (já existe `generateToken()` em `auth.js`). Persistir como `refresh_token_hash` (SHA-256) na tabela `sessions`. Adicionar campos `refresh_expires_at`, `rotated_from`.

2. **Rotação com detecção de reuso:** `/api/auth/refresh` invalida o token antigo e emite par novo. Se um refresh já rotacionado for reapresentado → revogar toda a família + log de auditoria.

3. **HttpOnly cookie:** cookie `impetus_refresh` — `HttpOnly; Secure; SameSite=Strict; Path=/api/auth/refresh`. Access token continua via `Authorization: Bearer` durante transição.

4. **CSRF guard:** `csrfGuard.js` middleware — double-submit token para mutações (`POST/PUT/PATCH/DELETE`). Webhooks (HMAC) isentos.

5. **Migration do frontend:** `api.js` passa a usar `credentials: 'include'`; remover `localStorage.getItem('impetus_token')`. Rollout por flag `IMPETUS_COOKIE_AUTH`.

**Definition of Done:** zero token em `localStorage`; refresh rotaciona; reuso detectado revoga família; suite `tests/security/sessionRotation.test.js` verde.

---

### Etapa 2.6 — RLS enforced (gradual)

**Por que:** `IMPETUS_RLS_MODE=on` está definido no `.env` mas precisa ser validado tenant a tenant.

**Como executar:**
```bash
# 1. Confirmar que policies existem nas 45 tabelas do registry
# 2. Ativar RLS para 1 tenant de teste:
#    (via tenantRlsGovernanceService.isActiveForTenant)
# 3. Monitorar logs por 48h
# 4. Expandir progressivamente

# Teste de isolamento:
# Usuário da empresa A NÃO deve ver dados da empresa B em nenhuma tabela
```

**Definition of Done:** teste cross-tenant falha em 0 tabelas do registry; RLS no nível da BD como defesa em profundidade.

---

### Etapa 2.7 — Triagem de endpoints sem auth (PUB-RISCO)

**Por que:** 324 endpoints sem `requireAuth` detectados. Os `PUB-RISCO` precisam de correção.

**Como executar:**
- Para cada endpoint marcado `PUB-RISCO` na Etapa 1.2: adicionar o guard apropriado.
- Mínimo: `requireAuth` + `requireCompanyId`.
- Validar com testes regressivos.

**Definition of Done:** zero endpoints `PUB-RISCO` na listagem; `BACKEND_INVENTORY.json` atualizado.

**Gate G2→3:** P0 segurança ativo (Etapas 2.1–2.4 concluídas); PM2 em production; Nginx/UFW ativos.

---

## FASE 3 — CORREÇÃO FIX PRIORIZADA

**Duração:** 7–14 dias  
**Objetivo:** corrigir apenas o que **a matriz** identificou como INCOMPLETO, MOCK ou VERMELHO crítico. Sem criar arquitetura nova.  
**Quem executa:** engenheiro full-stack  
**Entrada:** `FUNCTIONAL_MATRIX.json` (saída da Fase 1)  
**Regra:** toda correção é classe `FIX` — 1 linha da matriz = 1 ticket = 1 PR

---

### Etapa 3.1 — Eliminar mocks em KPI e gráficos

**Por que:** violação da regra `charts-real-data-industrial.mdc` — `Math.random()` e arrays fixos são proibidos.

**Para cada item `MOCK` na auditoria da Etapa 1.4:**
1. Identificar o endpoint real que deveria alimentar o dado.
2. Se o endpoint existe: conectar o componente ao serviço correto.
3. Se o endpoint não existe: criar via `FIX` (endpoint mínimo, dado real da BD).
4. Validar com Etapa 4.2 (E2E: o gráfico mostra dados da BD, não gerados).

**Definition of Done:** varredura `Math.random()` retorna zero ocorrências em componentes de produção (excluindo testes).

---

### Etapa 3.2 — Corrigir fluxos INCOMPLETO

**Para cada linha `INCOMPLETO` na matriz (endpoint 404/stub ou handler vazio):**
1. Verificar se é ausência de implementação ou de rota.
2. Implementar o mínimo funcional (classe `FIX`) — persistência real, guards corretos.
3. Atualizar a linha da matriz para `AMARELO` (aguarda E2E completo).

**Prioridade:** incompletos em domínios dos 10 cenários de certificação (Fase 4).

---

### Etapa 3.3 — Corrigir erros de compilação e build

**O que fazer:**
```bash
# Backend: verificar logs de erro
pm2 logs impetus-backend --lines 200 | rg -i "error|fail|warn"

# Frontend: build de produção
cd frontend && npm run build 2>&1 | rg -i "error|warn" | head -30

# Verificar lints
cd backend && npx eslint src/ --ext .js 2>&1 | rg "error" | head -20
```

**Definition of Done:** build do frontend sem erros; backend inicia sem warnings críticos; PM2 sem `max_restarts`.

---

### Etapa 3.4 — Corrigir erros de banco

**O que verificar:**
```bash
# Migrations executadas?
psql -U postgres -d impetus_db -c "SELECT version, name FROM schema_migrations ORDER BY version;"

# Tabelas do registry com RLS policy?
psql -U postgres -d impetus_db -c "
  SELECT schemaname, tablename, rowsecurity
  FROM pg_tables
  WHERE tablename IN (SELECT table_name FROM tenant_rls_registry)
  ORDER BY tablename;
"

# Índices de company_id criados?
psql -U postgres -d impetus_db -c "
  SELECT indexname, tablename FROM pg_indexes
  WHERE indexname LIKE '%company_id%';
" | wc -l
```

**Definition of Done:** todas as migrations do `rls_enterprise_expand.sql` e `hardening_indexes_constraints.sql` aplicadas; índices de `company_id` existentes.

---

### Etapa 3.5 — Corrigir rotas, menus e navegação

**O que verificar:**
- Rotas marcadas `REDIRECT` na matriz — são intencionais ou erros de configuração?
- Guards que bloqueiam 100% dos perfis (DESABILITADO indevido).
- Links de menu que apontam para rotas inexistentes.

**Definition of Done:** navegação manual pelos 77 caminhos mapeados sem erro 404/500 no frontend.

---

### Etapa 3.6 — Corrigir integrações críticas para o piloto

**Prioridade — definir antes de corrigir:**
- **Billing (Asaas):** `ASAAS_API_KEY` ausente — necessário para piloto pago? Se sim, configurar `ASAAS_ENV=sandbox` + `ASAAS_API_KEY`.
- **E-mail (SMTP):** `SMTP_PASS` vazio — e-mails de redefinição de senha não funcionam. Configurar senha correta.
- **Webhook entrante:** `INCOMING_WEBHOOK_SECRET` ausente — configurar se usar webhook de terceiros.

**Definition of Done:** cada integração necessária para o piloto testada com payload real e log confirmando recebimento/envio.

---

### Etapa 3.7 — Corrigir formulários e validações

**Para cada formulário identificado na Etapa 1.3:**
- Validação no frontend (campos obrigatórios, formato).
- Validação no backend (Zod/validação manual antes de DB).
- Mensagens de erro claras e sem user enumeration.

**Definition of Done:** formulários críticos (NC, incidente SST, OS ManuIA, pedido DSR) submetem, validam e persistem sem erro.

---

### Etapa 3.8 — Corrigir relatórios e downloads

**O que verificar:**
- PDFs/exportações Excel que dependem de dados reais (não mock).
- Relatórios de auditoria com `company_id` correto.
- Downloads de arquivos via `secureStaticUploads`.

**Definition of Done:** download de pelo menos 1 relatório por domínio principal funciona end-to-end.

**Gate G3→4:** zero mocks em KPI/gráfico; zero endpoints `PUB-RISCO`; build sem erros; matriz atualizada com `FIX` aplicados.

---

## FASE 4 — CERTIFICAÇÃO E2E POR DOMÍNIO

**Duração:** 10–15 dias  
**Objetivo:** provar com evidência que cada domínio industrial funciona em condições reais  
**Quem executa:** engenheiro de QA + responsável de domínio  
**Entrada:** matriz com FIXes aplicados; ambiente com P0 de segurança ativo  
**Regra mestre:** cada cenário exige **6 evidências** antes de ser marcado VERDE

---

### As 6 evidências obrigatórias (por cenário)

| # | Evidência | Como coletar |
|---|-----------|--------------|
| 1 | **Screenshot** da tela no estado final | Browser (DevTools ou MCP) |
| 2 | **Payload** enviado | DevTools → Network → Request body |
| 3 | **Resposta da API** | DevTools → Network → Response (status + body) |
| 4 | **Linha no banco** | `psql` query de verificação mostrando a linha gravada com `company_id` correto |
| 5 | **Log de execução** | `pm2 logs impetus-backend --lines 50` após a ação |
| 6 | **Prova de isolamento** | Mesma leitura autenticada como Tenant B retorna vazio ou 403 |

**Pasta de evidências:** `backend/docs/evidence/<dominio>/<cenario>/`

---

### Etapa 4.1 — Certificação Quality

**Cenário:** NC → CAPA → Auditoria de qualidade

**Passos:**
1. Autenticar como Supervisor (hierarquia 4) da empresa A.
2. Criar uma NC via `/app/quality/operational/workspace`.
3. Verificar persistência: `SELECT * FROM quality_nonconformities WHERE company_id = 'A' ORDER BY created_at DESC LIMIT 1;`
4. Criar CAPA vinculada à NC.
5. Gerar auditoria.
6. Autenticar como empresa B → confirmar que a NC da empresa A **não aparece**.
7. Verificar que KPI de qualidade no dashboard reflete a NC (dado real, não mock).

**Coletar 6 evidências → salvar em** `backend/docs/evidence/quality/nc-capa-auditoria/`

---

### Etapa 4.2 — Certificação SST

**Cenário A:** Registro de incidente  
**Cenário B:** Quase-acidente  
**Cenário C:** Treinamento vencido (verificar se alerta dispara no Notification Center)

**Passos por cenário:** análogos ao Quality — criar, persistir, verificar isolamento, confirmar alerta se aplicável.

**Evidências → `backend/docs/evidence/sst/`**

---

### Etapa 4.3 — Certificação ESG

**Cenário:** Lançamento de emissão + visualização no painel ESG

**Validação extra:** o gráfico de emissões usa dado real (não `Math.random`). Verificar via DevTools Network que o endpoint chamado é `/api/environment/*` e retorna dados da BD.

**Evidências → `backend/docs/evidence/esg/`**

---

### Etapa 4.4 — Certificação ManuIA

**Cenário:** Diagnóstico → criação de OS → histórico de manutenção

**Validação extra:** a IA (Claude/OpenAI) participa do diagnóstico — verificar `x-ai-trace-id` no header de resposta.

**Evidências → `backend/docs/evidence/manuia/`**

---

### Etapa 4.5 — Certificação TPM

**Cenário:** Plano preventivo agendado → execução → atualização de indicador (MTBF/disponibilidade)

**Evidências → `backend/docs/evidence/tpm/`**

---

### Etapa 4.6 — Certificação AIOI

**Cenário:** Evento de domínio → correlação → insight com `confidence` → escalonamento

**Pré-requisito:** `IMPETUS_AIOI_ENABLED=true` (já está), `IMPETUS_AIOI_QUEUE_ACTIVE=true`.  
**Flags a verificar:** `EVENT_GOVERNANCE_AIOI` — se ausente no `.env`, default false; adicionar se necessário.

**Evidências → `backend/docs/evidence/aioi/`**

---

### Etapa 4.7 — Certificação Executive (AIOI Portal)

**Cenário:** Dashboard executivo por perfil CEO (hierarquia 0) e Diretor (hierarquia 1)

**Validação extra:** KPIs hidratam da BD por `company_id`; sem mock; `ExecutiveAccessGuard` libera corretamente.

**Evidências → `backend/docs/evidence/executive/`**

---

### Etapa 4.8 — Certificação Billing

**Cenário:** Consulta de status de assinatura + webhook Asaas (se configurado)

**Se `ASAAS_API_KEY` ausente:** certificar apenas o fluxo interno de status; marcar `AMARELO` com nota "aguarda configuração Asaas".

**Evidências → `backend/docs/evidence/billing/`**

---

### Etapa 4.9 — Certificação DSR/LGPD

**Cenário:** Pedido de titular (acesso/exclusão de dados)

**Validação extra:** worker de retenção processa o pedido; trilha auditável em `audit_logs`.

**Evidências → `backend/docs/evidence/dsr/`**

---

### Etapa 4.10 — Certificação Event Governance

**Cenário:** Evento → política aplicada (EG-01→13) → decisão registrada com modo correto

**Flags a verificar:**
- `EVENT_GOVERNANCE_ENABLED` — se ausente, governança opera com default OFF
- `IMPETUS_GOVERNANCE_LEARNING=shadow` — correto para piloto

**Evidências → `backend/docs/evidence/event-governance/`**

---

### Etapa 4.11 — Homologação por perfil hierárquico

**O que fazer:** para cada perfil (0=CEO → 5=Colaborador), verificar:
- Rotas permitidas vs bloqueadas pelos guards
- `requireHierarchy`, `RoleGuard`, `ColaboradorRouteGuard` funcionando
- Redirecionamento correto quando acesso negado

**Perfis a testar:**

| Perfil | Nível | Telas críticas a testar |
|--------|-------|-------------------------|
| CEO | 0 | Dashboard executivo, centro de custos, todas as rotas admin |
| Diretor | 1 | Quality, SST, ESG, Executive Portal |
| Gerente | 2 | Dashboards operacionais, relatórios |
| Coordenador | 3 | Quality workspace, SST workspace |
| Supervisor | 4 | Registro de ocorrência, OS ManuIA |
| Colaborador | 5 | Apenas `/app/equipe-operacional`, registro básico |
| RH | — | `/app/pulse-rh` (PulseRhRouteGuard) |
| Admin | — | Todas as rotas `/app/admin/*` |

**Definition of Done:** cada perfil acessa o que deve e é bloqueado do que não deve; sem vazamento de dados cross-tenant.

---

### Etapa 4.12 — Atualização da matriz com status final

**O que fazer:**
- Para cada cenário certificado com 6 evidências: status = **VERDE**
- Para cenários com limitação conhecida: **AMARELO** com nota
- Atualizar `lastValidatedAt` em cada linha
- Commitar `FUNCTIONAL_MATRIX.json` atualizado

**Gate G4→5:** todos os 10 cenários com evidência completa; happy path de cada domínio VERDE; matriz commitada e sem drift.

---

## FASE 5 — CERT-03: OPERAÇÕES ENTERPRISE

**Duração:** 8–12 dias  
**Objetivo:** garantir que o sistema pode ser operado, monitorado e recuperado em produção  
**Quem executa:** SRE / DevOps  
**Entrada:** sistema funcionalmente certificado (Fase 4)

---

### Etapa 5.1 — Observabilidade: endpoint /metrics

**O que implementar:**
- Instalar `prom-client` no backend.
- Expor `/metrics` (Prometheus scrape) com:
  - Histograma de latência HTTP por rota
  - Contadores 4xx/5xx por endpoint
  - Gauge de sessões ativas
  - Métricas de pool PostgreSQL
  - Contador de insights AIOI por tenant

```bash
npm install prom-client --save
# Criar backend/src/middleware/metricsMiddleware.js
# Adicionar rota /metrics em server.js (protegida por HEALTH_DETAIL_KEY)
```

---

### Etapa 5.2 — Observabilidade: Prometheus + Grafana

**O que fazer:**
```bash
cd infra/observability
docker compose up -d prometheus grafana

# Configurar Prometheus para scraping do backend:
# prometheus/prometheus.yml já existe — verificar target
```

**Dashboards a criar** (JSON versionados em `infra/observability/dashboards/`):
- Visão SRE: latência/erro/saturação (método RED)
- Visão industrial: eventos por domínio, AIOI insights/dia

---

### Etapa 5.3 — Alertas reais

**O que configurar:**
- Erro 5xx > 5% em 5 minutos → alerta crítico
- Latência p95 > 3s → alerta warning
- Backend down → alerta imediato
- Pool DB > 80% → alerta warning
- PM2 restarts > 3 em 10 minutos → alerta crítico

**Canal:** e-mail (`emailService.js` já existe) + webhook para Notification Center.

---

### Etapa 5.4 — Backup PostgreSQL automatizado

**O que implementar:**
```bash
# Script: infra/scripts/backup-postgres.sh
#!/bin/bash
BACKUP_DIR=/var/backups/impetus
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U postgres impetus_db | gzip > "$BACKUP_DIR/impetus_$DATE.sql.gz"
# Manter últimos 7 dias, remover mais antigos
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

```bash
# Cron: executar diariamente às 3h
echo "0 3 * * * root /var/www/impetus-completa/infra/scripts/backup-postgres.sh" \
  | sudo tee /etc/cron.d/impetus-backup
```

---

### Etapa 5.5 — Teste de restore (obrigatório)

**O que fazer:**
1. Restaurar o backup mais recente em um banco temporário.
2. Rodar smoke test E2E de Quality (Etapa 4.1) contra o banco restaurado.
3. Medir e documentar RTO (Recovery Time Objective).

**Definition of Done:** restore executado com sucesso; smoke test verde; `DISASTER_RECOVERY_RUNBOOK.md` criado com RTO medido.

---

### Etapa 5.6 — CI/CD: pipeline GitHub Actions

**O que criar em `.github/workflows/`:**

**`ci.yml`** (roda em todo PR):
```yaml
jobs:
  test-gate:
    - npm ci (backend + frontend)
    - npx eslint src/
    - node tests/enterpriseHardeningValidation.js  # 11/11 SEC
    - npm run build (frontend)
  
  migration-gate:
    - Postgres service container
    - Aplicar migrations
    - Verificar integridade do schema
  
  matrix-drift-gate:
    - node backend/scripts/audit/buildFunctionalMatrix.js
    - node backend/scripts/audit/checkMatrixDrift.js --fail-on-drift
```

**`deploy.yml`** (manual/tag):
```yaml
jobs:
  deploy:
    - SSH no VPS
    - git pull
    - npm ci
    - npm run build (frontend)
    - Aplicar migrations
    - pm2 reload ecosystem.config.js --env production --update-env
    - bash infra/scripts/post-deploy-healthcheck.sh
    # Se health falhar:
    - git checkout anterior
    - pm2 reload (rollback automático)
```

**Definition of Done:** PR bloqueado por teste vermelho; deploy via pipeline; rollback automático provado quebrando o health de propósito.

---

### Etapa 5.7 — Migrations formais

**O que fazer:**
- Adotar node-pg-migrate ou Knex para controle de versão de schema.
- Criar migration baseline a partir do estado atual.
- Toda migration nova é aditiva e versionada com timestamp.
- `migration-gate.yml` roda no CI antes de qualquer merge.

**Definition of Done:** `npm run migrate` idempotente; CI bloqueia PR com migration quebrada.

**Gate G5→6:** `/metrics` respondendo; Grafana com dados reais; backup diário ativo; restore testado; CI/CD pipeline verde.

---

## FASE 6 — CERT-04: PILOTO INDUSTRIAL ASSISTIDO

**Duração:** 30–60 dias calendário  
**Objetivo:** operar o IMPETUS com cliente real, coletar evidências de maturidade, graduar o Learning Layer  
**Quem executa:** equipe técnica + responsável de implantação + cliente piloto  
**Entrada:** sistema operacionalmente certificado (Fase 5)

---

### Etapa 6.1 — Ativação cognitiva controlada

**Flags a definir no `.env` do servidor:**
```bash
EVENT_GOVERNANCE_AIOI=true        # AIOI age sobre eventos
EVENT_GOVERNANCE_LEARNING=false   # Learning observa, não aplica
IMPETUS_GOVERNANCE_LEARNING=shadow  # já está correto
```

**O que NÃO fazer:** não ativar `EVENT_GOVERNANCE_LEARNING=true` ainda — isso só acontece após os critérios da Etapa 6.5.

**Atualizar `FLAG_BASELINE_FROZEN.md`** com o novo estado.

---

### Etapa 6.2 — Onboarding do primeiro cliente

**O que fazer:**
1. Provisionar empresa no banco (criar `company_id`, usuários iniciais por perfil).
2. Configurar hierarquia organizacional via `/app/admin/structural`.
3. Configurar departamentos, cargos e perfis de dashboard.
4. Verificar que `requireCompanyId` e RLS isolam corretamente os dados.
5. Treinar usuários por perfil (Operador, Supervisor, Gerente, Diretor, CEO).

**Artefato:** `backend/docs/pilot/PILOT_CLIENT_01_ONBOARDING.md` com registros da configuração.

---

### Etapa 6.3 — Operação monitorada diária

**O que monitorar** (via Grafana + alertas):
- Latência por rota (alerta se p95 > 3s)
- Taxa de erro 5xx (alerta se > 1%)
- Insights AIOI gerados por dia
- Eventos de Event Governance processados por domínio
- Uso de memória/CPU do backend

**Frequência de revisão:** diária nas primeiras 2 semanas; semanal nas seguintes.

---

### Etapa 6.4 — Coleta de métricas de decisão AIOI

**O que coletar** (via `governanceConfidenceService` + `aioiLearningService` já implementados):
- Total de insights gerados
- Taxa de aceitação pelo operador
- Taxa de falsos positivos
- `confidence` médio por domínio
- Latência de escalonamento

**Destino:** `backend/docs/pilot/AIOI_METRICS_WEEK_01.md`, `AIOI_METRICS_WEEK_02.md`, etc.

---

### Etapa 6.5 — Critério de graduação para Learning Real

**Ativar `EVENT_GOVERNANCE_LEARNING=true` SOMENTE quando:**
- [ ] ≥ 30 dias de operação estável (zero incidente crítico aberto)
- [ ] ≥ 500 decisões AIOI com feedback registrado
- [ ] Taxa de falso-positivo < limiar acordado com cliente
- [ ] `confidence` médio > piso definido
- [ ] Revisão técnica aprovada

**Ativação gradual:** shadow → canary (para 1 domínio) → ativo geral.

---

### Etapa 6.6 — Treinamento por perfil

| Perfil | Conteúdo | Formato |
|--------|----------|---------|
| Operador | Registro de ocorrência, OS, equipe operacional | Hands-on 2h |
| Supervisor | Dashboards, aprovações, escalonamentos | Hands-on 3h |
| Gerente | KPIs, relatórios, centro de custos | Demonstração 2h |
| Diretor | Executive Portal, AIOI insights | Demonstração 1h |
| CEO | Dashboard executivo, indicadores globais | Demonstração 1h |
| Admin | Configuração de usuários, estrutura, integrações | Técnico 4h |

**Artefato:** material de treinamento em `backend/docs/training/` por perfil.

---

### Etapa 6.7 — Correções de piloto (FIX only)

**Durante o piloto:** registrar toda dificuldade operacional como issue. Priorizar:
- P0: impede uso (corrigir em 24h)
- P1: degrada uso (corrigir em 72h)
- P2: melhoria (backlog para pós-piloto)

**Regra:** ainda não abrir `FEAT`. Todo ajuste é `FIX` ou `UX-FIX`.

---

### Etapa 6.8 — Emitir aceite técnico do piloto

**Critério de aceite:**
- Todos os 10 cenários E2E operando VERDE por ≥ 15 dias consecutivos
- Nenhum incidente P0 nos últimos 7 dias
- Relatório de métricas AIOI dentro do limiar
- Backup testado durante o piloto (pelo menos 1 restore)
- Aprovação do responsável técnico e do cliente

**Artefato:** `backend/docs/PILOT_ACCEPTANCE_REPORT.md` com assinaturas.

**Gate G6→7:** aceite técnico emitido; Learning graduado (ou cronograma acordado); CI/CD sem rollbacks não planejados no período.

---

## FASE 7 — GO-LIVE EM ESCALA

**Duração:** contínuo  
**Objetivo:** expandir o IMPETUS para múltiplos clientes com processo estabelecido  
**Entrada:** selos Manual 10.3 e 10.4 fechados

---

### Etapa 7.1 — Checklist final de go-live (obrigatório)

```
[ ] Matriz 100% rastreada; domínios piloto VERDE com evidência
[ ] P0 segurança ativo (NODE_ENV=production, Nginx, UFW, secrets rotacionados)
[ ] Token fora do localStorage (HttpOnly cookie)
[ ] RLS enforced em todos os tenants
[ ] Backup diário ativo e restore testado
[ ] Observabilidade + alertas funcionando (Grafana + Alertmanager)
[ ] CI/CD com rollback automático
[ ] Drift gate no CI verde
[ ] FLAG_BASELINE_FROZEN.md atualizado
[ ] 30+ dias de piloto estável
[ ] Aceite técnico emitido
[ ] Runbook de DR documentado
```

---

### Etapa 7.2 — Publicação e configuração multi-tenant

- Processo de onboarding documentado (`PILOT_CLIENT_01_ONBOARDING.md` como template).
- Scripts de provisionamento de empresa idempotentes.
- Limites por tenant configurados (rate limit, pool, armazenamento).

---

### Etapa 7.3 — Monitoramento contínuo

- Grafana com alertas ativos.
- On-call definido para P0.
- Revisão semanal de métricas de adoção por cliente.
- `FUNCTIONAL_MATRIX.json` rodando no CI — qualquer drift bloqueado.

---

### Etapa 7.4 — Reabertura da evolução arquitetural (pós-piloto)

**Somente após gate G6→7:**
- Revogar congelamento (`architecture-freeze.mdc`).
- Iniciar EG-14 e próximas evoluções.
- Refatorar monolitos (`server.js` ~2.580 linhas, `dashboard.js` ~2.800 linhas).
- Containerização (Dockerfile da aplicação principal).
- Curadoria dos ~1.000+ docs em `backend/docs/`.

---

## Resumo executivo (índice de etapas)

| # | Etapa | Fase | Duração est. |
|---|-------|------|--------------|
| 0.1 | Declarar freeze | F0 | 0,5 dia |
| 0.2 | Fotografar flags reais | F0 | 0,5 dia |
| 1.1 | Inventário FE automatizado | F1 | 1 dia |
| 1.2 | Inventário BE + triagem auth | F1 | 2 dias |
| 1.3 | Rastreamento tela→API | F1 | 5–8 dias |
| 1.4 | Varredura de mocks e flags | F1 | 1 dia |
| 1.5 | Pré-classificação por domínio | F1 | 1 dia |
| 1.6 | Relatório técnico CERT-01 | F1 | 1 dia |
| 2.1 | PM2 modo produção | F2 | 0,5 dia |
| 2.2 | Nginx reverse proxy + SSL | F2 | 1 dia |
| 2.3 | UFW Cloudflare-only | F2 | 0,5 dia |
| 2.4 | Rotacionar segredos | F2 | 0,5 dia |
| 2.5 | Refresh token + HttpOnly + CSRF | F2 | 5–7 dias |
| 2.6 | RLS enforced (gradual) | F2 | 3–4 dias |
| 2.7 | Triagem endpoints sem auth | F2 | 1–2 dias |
| 3.1 | Eliminar mocks em KPI | F3 | 2–3 dias |
| 3.2 | Corrigir INCOMPLETO | F3 | 3–5 dias |
| 3.3 | Erros compilação/build | F3 | 1 dia |
| 3.4 | Erros de banco/migrations | F3 | 1 dia |
| 3.5 | Rotas, menus, navegação | F3 | 1 dia |
| 3.6 | Integrações críticas piloto | F3 | 1–2 dias |
| 3.7 | Formulários e validações | F3 | 2 dias |
| 3.8 | Relatórios e downloads | F3 | 1 dia |
| 4.1–4.10 | Certificação E2E 10 domínios | F4 | 8–12 dias |
| 4.11 | Homologação por perfil | F4 | 2 dias |
| 4.12 | Atualizar matriz final | F4 | 1 dia |
| 5.1 | Endpoint /metrics | F5 | 2 dias |
| 5.2 | Prometheus + Grafana | F5 | 1 dia |
| 5.3 | Alertas reais | F5 | 1 dia |
| 5.4 | Backup PostgreSQL | F5 | 1 dia |
| 5.5 | Teste de restore | F5 | 1 dia |
| 5.6 | CI/CD GitHub Actions | F5 | 3–5 dias |
| 5.7 | Migrations formais | F5 | 2–3 dias |
| 6.1 | Ativação cognitiva controlada | F6 | 1 dia |
| 6.2 | Onboarding cliente piloto | F6 | 2–3 dias |
| 6.3 | Operação monitorada | F6 | 30–60 dias |
| 6.4 | Métricas AIOI | F6 | contínuo |
| 6.5 | Graduação Learning Layer | F6 | por critério |
| 6.6 | Treinamento por perfil | F6 | 3–5 dias |
| 6.7 | Correções FIX piloto | F6 | contínuo |
| 6.8 | Aceite técnico | F6 | 1 dia |
| 7.1 | Checklist go-live | F7 | 1 dia |
| 7.2 | Multi-tenant em escala | F7 | contínuo |
| 7.3 | Monitoramento contínuo | F7 | contínuo |
| 7.4 | Reabertura evolução (EG-14+) | F7 | após piloto |

**Total de engenharia (Fases 0–5):** ~60–100 dias de esforço  
**Piloto (Fase 6):** 30–60 dias calendário  
**Go-live contínuo (Fase 7):** operação permanente

---

*Plano gerado com base na auditoria do Plano v1.0, alinhado ao `MANUAL_MATRIZ_FUNCIONAL_REAL.md`, `ENTERPRISE_HARDENING_REPORT.md`, `SECURITY_HARDENING_VPS.md` e estado real do repositório em 2026-06-22.*
