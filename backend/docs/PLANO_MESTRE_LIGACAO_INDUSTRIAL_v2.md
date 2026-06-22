# IMPETUS — PLANO MESTRE DE LIGAÇÃO INDUSTRIAL (v2.0)

> **Versão:** 2.0 — 2026-06-21  
> **Classe:** `CERT` — documento de planejamento, sem alteração de código  
> **Substitui:** Plano Mestre v1 (9 fases / 180 etapas — reprovado em auditoria)  
> **Alinhado a:** `MANUAL_MATRIZ_FUNCIONAL_REAL.md`, `ENTERPRISE_HARDENING_REPORT.md`, `SECURITY_HARDENING_VPS.md`, roadmap CERT-01→04  
> **Premissa fundamental:** o IMPETUS **não é um projeto greenfield**. É um produto industrial avançado (77 telas, 1.098 endpoints, EG-01→13, AIOI, Learning Layer) que precisa de **certificação e ligação validada**, não de reconstrução.

---

## ESTADO DO PROJETO NA DATA DESTE PLANO

| Métrica | Valor real | Fonte |
|---------|------------|-------|
| Telas mapeadas | 77 | `FUNCTIONAL_MATRIX.json` |
| VERDE (E2E validado) | 6 | Matriz |
| SCENARIO\_VERDE (fluxo validado) | 10 | Matriz |
| AMARELO (parcial/flag) | 3 | Matriz |
| NAO\_VALIDADO (pendente E2E) | 63 | Matriz |
| Endpoints backend | 1.098 em 142 mounts | `BACKEND_INVENTORY.json` |
| Endpoints chamados pelo FE | 621 | `BACKEND_INVENTORY.json` |
| Variáveis no `.env` | 624 definidas de 1.446 únicas | Auditoria ENV |
| `NODE_ENV` no PM2 | `development` | `ecosystem.config.js` |
| `LISTEN_HOST` | ausente do `.env` | Auditoria ENV |
| `ALLOWED_ORIGINS` | ausente do `.env` | Auditoria ENV |
| `IMPETUS_RLS_MODE` | `on` | `.env` |
| `IMPETUS_AIOI_ENABLED` | `true` | `.env` |
| `EVENT_GOVERNANCE_*` (14 flags) | todas ausentes → default OFF | Auditoria ENV |
| Refresh token / HttpOnly cookie | não implementado | Auditoria código |
| CI/CD | inexistente | `.github/` vazio |
| Nginx/UFW | scripts prontos, não ativados | `infra/` |
| Observabilidade | Docker opcional, desconectada | `infra/observability/` |

---

## PRINCÍPIOS INVIOLÁVEIS DESTE PLANO

1. **Congelamento ativo** — durante todo o ciclo, classes de mudança permitidas: `FIX`, `CERT`, `SEC`, `OPS`. Proibido: `FEAT`, EG-14+, novos runtimes, novas engines.  
2. **Matriz como fonte de verdade** — nenhuma etapa de "correção" ou "ligação" começa sem rastreio na matriz.  
3. **VERDE exige 6 evidências** — screenshot, payload, resposta API, linha no BD, log, prova de isolamento tenant.  
4. **Ferramenta, não trabalho manual** — inventários e rastreios via `buildFunctionalMatrix.js` e scripts de auditoria.  
5. **Gates entre fases** — nenhuma fase avança sem o gate da anterior fechado.  
6. **Taxonomia obrigatória** — VERDE / AMARELO / MOCK / INCOMPLETO / DESABILITADO / NAO\_VALIDADO.

---

## VISÃO GERAL DO CICLO

```
FASE 0  Congelamento Arquitetural         ─── imediato (1 dia)
FASE 1  CERT-01 Certificação Funcional    ─── 14–22 dias
FASE 2  CERT-02 Hardening de Produção     ─── 12–18 dias (paralela parcial)
FASE 3  Correção Priorizada (FIX)         ─── 10–20 dias
FASE 4  Validação E2E por Domínio         ─── 8–15 dias
FASE 5  CERT-03 Infraestrutura Enterprise ─── 16–25 dias
FASE 6  CERT-04 Piloto Industrial         ─── 30–60 dias
FASE 7  Go-Live em Escala                 ─── ~5 dias + acompanhamento
```

---

## FASE 0 — CONGELAMENTO ARQUITETURAL

**Duração:** 1 dia  
**Objetivo:** parar a expansão para viabilizar a certificação. Sem congelamento, qualquer validação fica desatualizada antes de terminar.

### Etapas

**0.1 Criar regra de congelamento no repositório**  
- Criar `.cursor/rules/architecture-freeze.mdc` com `alwaysApply: true`.  
- Conteúdo: proibido criar módulos `FEAT` (EG-14+, novos runtimes, novas engines, novas governanças) até `CERT-04` concluída.  
- Classes permitidas: `FIX`, `CERT`, `SEC`, `OPS`.  
- Qualquer exceção exige aprovação documentada do arquiteto-chefe.

**0.2 Registrar baseline de maturidade**  
- Documentar o estado atual (tabela de Estado acima) em `backend/docs/BASELINE_MATURIDADE_v1.md`.  
- Assinar como ponto de partida do ciclo de certificação.

**0.3 Confirmar artefatos de auditoria existentes**  
Verificar que os seguintes arquivos existem e estão atualizados:  
- `backend/docs/FUNCTIONAL_MATRIX.json` — gerado por `buildFunctionalMatrix.js`  
- `backend/docs/inventory/FRONTEND_INVENTORY.json`  
- `backend/docs/inventory/BACKEND_INVENTORY.json`  
- `backend/scripts/audit/buildFunctionalMatrix.js`  

**Gate de saída da Fase 0:**  
- [ ] Regra de congelamento ativa  
- [ ] Baseline documentado e datado  
- [ ] Artefatos de auditoria confirmados

---

## FASE 1 — CERT-01: CERTIFICAÇÃO FUNCIONAL COMPLETA

**Duração:** 14–22 dias  
**Objetivo:** transformar "o sistema parece funcionar" em "cada tela, endpoint e flag tem status conhecido e rastreável".

> Esta fase é **100% read-only** — nenhum código de produção é alterado. É a fase de maior alavancagem: sem ela, todas as correções são cegas.

---

### CERT-01.1 — Completar inventário automatizado

**Quem executa:** engenheiro ou IA com acesso ao código  
**Ferramenta:** `backend/scripts/audit/buildFunctionalMatrix.js` (já existe)

**1.1.1** Re-executar o gerador de matriz para capturar o estado mais recente:
```bash
node backend/scripts/audit/buildFunctionalMatrix.js
```
Validar saídas: `FUNCTIONAL_MATRIX.json`, `FRONTEND_INVENTORY.json`, `BACKEND_INVENTORY.json`.

**1.1.2** Auditar rotas dos domínios que têm sub-roteadores próprios não totalmente cobertas pelo `App.jsx`:
- `frontend/src/domains/quality/routes/`  
- `frontend/src/domains/safety/routes/`  
- `frontend/src/domains/logistics/routes/`  
- `frontend/src/domains/environment/routes/`  
- `frontend/src/modules/aioi/router/`  

**1.1.3** Mapear telas definidas nos módulos especiais (não em `App.jsx`):
- Portal AIOI: `modules/aioi/router/ExecutivePortalRoute.jsx` e providers aninhados  
- ManuIA App: `manuia-app/ManuIAExtensionApp.jsx`  
- Mobile: `pages/AppMobile.jsx`

**1.1.4** Para cada tela `NAO_VALIDADO` (atualmente 63), rastrear a cadeia completa:
```
Tela → Handler → Service (frontend/src/services/api.js) → Endpoint → Guard → Serviço Backend → Tabela(s)
```
Registrar resultado como linha da matriz com campo `chainStatus: RESOLVED | UNRESOLVED`.

**1.1.5** Implementar rastreio de nível 2 (tela → botão específico → endpoint):  
Escrever `backend/scripts/audit/traceScreenChains.js` que, para cada arquivo de página em `frontend/src/pages/` e `frontend/src/domains/*/`, extrai via regex:
- handlers `onClick`, `onSubmit`, `handle*`  
- chamadas ao `api.js` correspondentes  
Saída: `backend/docs/inventory/SCREEN_CHAINS.json`

**Definition of Done:** 100% das 77 rotas com `chainStatus` preenchido; 0 `UNRESOLVED` crítico.

---

### CERT-01.2 — Snapshot de flags reais (FLAG_BASELINE_FROZEN)

**Quem executa:** arquiteto ou responsável pelo servidor de produção

**1.2.1** Executar no servidor de produção:
```bash
node backend/scripts/audit/dumpEffectiveFlags.js
```
*(implementar se ainda não existir — lê `process.env` em runtime, redige segredos, emite tabela: flag | valor efetivo | default .env.example | classe | módulo afetado)*

**1.2.2** Confirmar estado das 14 flags `EVENT_GOVERNANCE_*`:  
Todas ausentes do `.env` → default `false` (comportamento esperado pré-piloto). Documentar explicitamente.

**1.2.3** Confirmar flags de alto impacto:

| Flag | Estado confirmado | Impacto operacional |
|------|-------------------|---------------------|
| `NODE_ENV` | `development` | Guards de rede bypassados |
| `LISTEN_HOST` | ausente | Backend pode bindar 0.0.0.0 |
| `ALLOWED_ORIGINS` | ausente | CORS inseguro |
| `IMPETUS_RLS_MODE` | `on` | RLS ativo na BD |
| `IMPETUS_AIOI_ENABLED` | `true` | AIOI ativo |
| `IMPETUS_GOVERNANCE_LEARNING` | `shadow` | Learning observa, não age |
| `EVENT_GOVERNANCE_LEARNING` | ausente (false) | EG learning OFF |

**1.2.4** Persistir em `backend/docs/FLAG_BASELINE_FROZEN.md`.

**Definition of Done:** arquivo existente, datado, assinado, com 100% das flags de governança mapeadas.

---

### CERT-01.3 — Varredura de mocks e fallbacks artificiais

**Quem executa:** engenheiro com acesso ao código  
**Referência:** Manual Parte 5

**1.3.1** Executar varredura de `Math.random()` fora de testes:
```bash
rg -n "Math\.random\(" frontend/src backend/src -g '!**/tests/**' -g '!**/*.test.*'
```

**1.3.2** Varredura de arrays/labels fixos em gráficos (proibidos pela regra `charts-real-data-industrial.mdc`):
```bash
rg -n "Set.*Out.*Nov|Jan.*Fev.*Mar|\[\s*\{[^}]*value:\s*\d" frontend/src
```

**1.3.3** Varredura de fallbacks artificiais:
```bash
rg -n "mock|fakeData|dummy|sampleData|hardcoded|TODO.*dados|FIXME.*dados" frontend/src -i -g '!**/*.test.*'
```

**1.3.4** Varredura de cores hex soltas em gráficos (fora dos tokens):
```bash
rg -n "#[0-9a-fA-F]{6}" frontend/src/pages frontend/src/domains frontend/src/components/charts
```

**1.3.5** Para cada ocorrência encontrada, classificar a funcionalidade como MOCK / PARCIAL / REAL e registrar na matriz.

**Definition of Done:** varredura concluída; toda ocorrência classificada; KPIs e gráficos marcados REAL ou MOCK com evidência.

---

### CERT-01.4 — Classificação completa da matriz

**Referência:** Manual Parte 6 (árvore de decisão)

Para cada uma das 77 telas, aplicar a árvore de decisão:

```
Renderiza para algum perfil?
  ├─ Não → DESABILITADO ou INCOMPLETO
  └─ Sim
      └─ Endpoints chamados existem e respondem?
          ├─ Não → INCOMPLETO
          └─ Sim
              └─ Dados são reais (não mock)?
                  ├─ Não → MOCK
                  └─ Sim
                      └─ Persiste + tenant OK + sem flag bloqueante + todas as ações OK?
                          ├─ Não → AMARELO
                          └─ Sim → VERDE (exige E2E, não automático)
```

**1.4.1** Priorizar as 63 telas `NAO_VALIDADO`:  
- Identificar quais têm endpoints com `!auth` (324 sem `requireAuth` padrão) — validar se é intencional.  
- Identificar quais telas dependem exclusivamente de flags desligadas → reclassificar para DESABILITADO.

**1.4.2** Validar o status dos atuais 6 VERDE e 10 SCENARIO\_VERDE:  
Confirmar que as 6 evidências obrigatórias existem. Se não, rebaixar para NAO\_VALIDADO.

**1.4.3** Gerar relatório semáforo por módulo (entrada para a Fase 3):

| Módulo | VERDE | AMARELO | INCOMPLETO | MOCK | DESABILITADO |
|--------|-------|---------|------------|------|--------------|
| Quality | | | | | |
| SST | | | | | |
| ESG | | | | | |
| ManuIA | | | | | |
| TPM | | | | | |
| AIOI/Executive | | | | | |
| Admin | | | | | |
| Core | | | | | |
| Billing/DSR | | | | | |

**Definition of Done:** 100% das 77 telas com status final classificado; relatório semáforo publicado.

---

### CERT-01.5 — Implementar gate anti-drift

**Referência:** Manual Parte 9

**1.5.1** Escrever `backend/scripts/audit/checkMatrixDrift.js`:  
- Lê `FUNCTIONAL_MATRIX.json` commitado  
- Re-executa `buildFunctionalMatrix.js` internamente  
- Compara: rota no código sem linha na matriz → `DRIFT: rota órfã`  
- Compara: linha na matriz sem rota no código → `DRIFT: matriz obsoleta`  
- Compara: `sourceHash` divergente → `DRIFT: tela mudou`  
- Flag `--fail-on-drift`: exit code 1 se drift detectado

**1.5.2** Adicionar ao `package.json` do backend:
```json
"audit:matrix": "node backend/scripts/audit/buildFunctionalMatrix.js",
"audit:drift":  "node backend/scripts/audit/checkMatrixDrift.js --fail-on-drift"
```

**Definition of Done:** `npm run audit:drift` passa no estado atual; qualquer divergência futura é detectável em < 30s.

**GATE G1 — saída da Fase 1:**  
- [ ] 100% das 77 rotas com cadeia rastreada  
- [ ] `FLAG_BASELINE_FROZEN.md` publicado  
- [ ] Varredura de mocks concluída  
- [ ] 100% das telas classificadas na taxonomia  
- [ ] `checkMatrixDrift.js` funcionando  
- [ ] Relatório semáforo por módulo publicado

---

## FASE 2 — CERT-02: HARDENING DE PRODUÇÃO (início em paralelo com Fase 1)

**Duração:** 12–18 dias  
**Objetivo:** fechar os gaps de segurança que impedem qualquer demo ou piloto externo.  

> Inicia **em paralelo** à Fase 1 (etapas 2.0 são read-only de preparação; execução real aguarda G1 para sessão enterprise).

---

### CERT-02.0 — Hardening P0 (bloqueadores absolutos de piloto externo)

Estes itens precedem qualquer demonstração a cliente. Scripts e configs já existem em `infra/` — o gap é de **ativação**, não de construção.

**2.0.1 Ativar PM2 em modo produção**  
```bash
pm2 start ecosystem.config.js --env production --update-env
pm2 save
```
Validar: `NODE_ENV=production`, `LISTEN_HOST=127.0.0.1`.  
Verificar: `ss -tlnp | grep -E ':3000|:4000'` → deve mostrar `127.0.0.1`, não `0.0.0.0`.

**2.0.2 Instalar e ativar Nginx como reverse proxy**  
```bash
sudo cp infra/nginx/impetus-proxy.conf /etc/nginx/snippets/impetus-proxy.conf
sudo cp infra/nginx/impetus-proxy-ws.conf /etc/nginx/snippets/impetus-proxy-ws.conf
sudo cp infra/nginx/impetus.conf /etc/nginx/sites-available/impetus
sudo sed -i 's/SEU_DOMINIO/app.seudominio.com/g' /etc/nginx/sites-available/impetus
sudo ln -sf /etc/nginx/sites-available/impetus /etc/nginx/sites-enabled/impetus
sudo rm -f /etc/nginx/sites-enabled/default
sudo bash infra/scripts/update-cloudflare-ips.sh
sudo nginx -t && sudo systemctl reload nginx
```

**2.0.3 SSL/TLS**  
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.seudominio.com
```
Ou: Origin Certificate Cloudflare (15 anos) no Nginx.  
Configurar Cloudflare: DNS proxied, SSL/TLS → Full (strict), Always HTTPS.

**2.0.4 Ativar UFW restrito a Cloudflare**  
```bash
export ADMIN_SSH_IP="SEU_IP_FIXO_ADMIN"
sudo -E bash infra/scripts/ufw-cloudflare-only.sh
```
Validar de máquina externa: `curl -m 5 http://IP_VPS:4000/health` → deve timeout.

**2.0.5 Rotacionar segredos no `.env`**  
```bash
# Gerar JWT_SECRET forte (≥ 48 bytes)
openssl rand -base64 48
# Gerar HEALTH_DETAIL_KEY
openssl rand -hex 32
```
Preencher no `backend/.env`:
```env
JWT_SECRET=<novo valor gerado>
HEALTH_DETAIL_KEY=<novo valor gerado>
ALLOWED_ORIGINS=https://app.seudominio.com
LISTEN_HOST=127.0.0.1
BASE_URL=https://app.seudominio.com
FRONTEND_URL=https://app.seudominio.com
IMPETUS_INTERNAL_NETWORK_DEV_BYPASS=false
IMPETUS_INTERNAL_ROUTE_DENY_BY_DEFAULT=true
IMPETUS_INTERNAL_ROUTE_ALLOW_LOCALHOST=true
```
> **Atenção:** rotacionar `JWT_SECRET` invalida JWTs ativos. Sessões DB-backed (`sessions.token`) sobrevivem. Executar em janela de baixo uso.

**2.0.6 Reiniciar com novo env e validar**  
```bash
pm2 restart ecosystem.config.js --env production --update-env
bash infra/scripts/post-deploy-healthcheck.sh
```
Verificar: `https://app.seudominio.com` responde; headers de segurança presentes.

**Definition of Done P0:**  
- [ ] `NODE_ENV=production` em runtime  
- [ ] Portas 3000/4000 acessíveis apenas via 127.0.0.1  
- [ ] Nginx responde em 443 com SSL válido  
- [ ] UFW ativo; IP direto bloqueado de fora  
- [ ] `JWT_SECRET` ≥ 48 chars; `HEALTH_DETAIL_KEY` definida  
- [ ] `ALLOWED_ORIGINS` e `BASE_URL` definidos

---

### CERT-02.1 — Sessão Enterprise: Refresh Token + HttpOnly Cookie + CSRF

**Contexto:** o backend já tem tabela `sessions` com `token`, `expires_at`, `ip_address`, `user_agent`. A migração é **aditiva**, não uma reescrita.

**2.1.1 Estender tabela `sessions`**  
Criar migration em `backend/src/models/migrations/`:
```sql
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS refresh_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rotated_from_hash  VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh ON sessions(refresh_token_hash)
  WHERE refresh_token_hash IS NOT NULL;
```

**2.1.2 Criar `backend/src/services/sessionTokenService.js`**  
- `issueTokenPair(userId, sessionId)` → retorna `{accessToken (JWT 15min), refreshToken (opaco 256-bit)}`  
- `rotateRefresh(oldRefreshToken)` → invalida o anterior, emite par novo  
- `detectReuseAndRevoke(oldHash)` → se refresh já rotacionado é reapresentado, revogar toda a família + log  
- `storeRefreshHash(sessionId, hash, expiresAt)`

**2.1.3 Modificar `backend/src/routes/auth.js`**  
- Login bem-sucedido: emitir access token em resposta JSON + refresh token em cookie:
```javascript
res.cookie('impetus_refresh', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'Strict',
  path: '/api/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000
});
```
- Nova rota `POST /api/auth/refresh`: lê cookie, valida, detecta reuso, emite par novo.  
- Logout: deletar cookie + invalidar refresh na BD.

**2.1.4 Criar `backend/src/middleware/csrfGuard.js`**  
Double-submit token para mutações (`POST/PUT/PATCH/DELETE`):  
- Cookie legível `csrf_token` + header `X-CSRF-Token` obrigatório  
- Endpoints de webhook (HMAC Stripe/Asaas) isentos via lista allowlist

**2.1.5 Migrar frontend**  
- Flag de rollout `IMPETUS_COOKIE_AUTH=true` no `.env`  
- `frontend/src/services/api.js`: adicionar `credentials: 'include'`  
- Remover leitura `localStorage.getItem('impetus_token')` (manter em paralelo durante rollout)  
- Interceptor 401: tentar refresh transparente antes de redirecionar para login

**2.1.6 Criar suites de teste**  
`backend/src/tests/security/sessionRotation.test.js`:  
- Emissão do par  
- Rotação válida  
- Detecção de reuso → revogação de família  
- Cookie ausente → 401  
- CSRF ausente em mutação → 403

**Definition of Done 2.1:**  
- [ ] Migration aplicada sem erro  
- [ ] Login emite cookie httpOnly  
- [ ] Refresh rotaciona; reuso revoga família  
- [ ] CSRF bloqueia mutação sem header  
- [ ] Suite de testes verde  
- [ ] Zero token em `localStorage` com flag ativa

---

### CERT-02.2 — Configurar Rate Limit, Lockout e Variáveis ausentes

**2.2.1** Adicionar ao `.env` valores explícitos (hoje usam defaults hardcoded):
```env
LOCKOUT_MAX_ATTEMPTS=5
LOCKOUT_WINDOW_MS=900000
LOCKOUT_DURATION_MS=1800000
RATE_LIMIT_API_PER_MIN=60
RATE_LIMIT_HEAVY_PER_MIN=10
RATE_LIMIT_USER_PER_MIN=120
```

**2.2.2** Ativar `LOG_LEVEL=info` e `LOG_FORMAT=json` para structured logging em produção.

**2.2.3** Definir `TZ=America/Sao_Paulo` para timestamps consistentes.

**Definition of Done 2.2:** nenhuma dessas variáveis dependendo de default hardcoded; valores documentados em `FLAG_BASELINE_FROZEN.md` atualizado.

---

### CERT-02.3 — RLS: validar enforcement ativo

**Contexto:** `IMPETUS_RLS_MODE=on` já está definido. Confirmar que enforcement real está funcionando.

**2.3.1** Executar teste de cross-tenant:  
Autenticar como usuário da Empresa A; tentar ler registro da Empresa B via endpoint de domínio.  
Resultado esperado: 0 registros retornados (isolamento pela BD).

**2.3.2** Se houver vazamento, acionar `tenantRlsGovernanceService` por tenant antes de escala.

**Definition of Done 2.3:** teste de isolamento documentado com evidência (payload de req + resposta vazia confirmada).

**GATE G2 — saída da Fase 2:**  
- [ ] P0 de produção ativo (Nginx, UFW, NODE_ENV, secrets)  
- [ ] Sessão enterprise com refresh + HttpOnly  
- [ ] CSRF ativo  
- [ ] Rate limit e lockout com valores explícitos  
- [ ] Isolamento RLS validado por teste  
- [ ] `HEALTH_DETAIL_KEY` definida  
- [ ] `ALLOWED_ORIGINS` e `BASE_URL` definidos

---

## FASE 3 — CORREÇÃO PRIORIZADA PELA MATRIZ (FIX)

**Duração:** 10–20 dias  
**Objetivo:** corrigir apenas o que a matriz classificou como INCOMPLETO ou MOCK, priorizando por severidade e por domínio do piloto.

> **Regra de entrada:** sem o Gate G1 (matriz classificada), esta fase não começa. Sem a matriz, a correção é cega.

---

### Estrutura de priorização

| Prioridade | Critério | Ação |
|------------|----------|------|
| **P0** | Tela INCOMPLETO + fluxo crítico do piloto | Corrigir imediatamente |
| **P1** | KPI/gráfico MOCK (viola regra de charts) | Substituir por dado real |
| **P2** | Tela AMARELO por flag → ativar no piloto | Configurar flag |
| **P3** | Tela AMARELO por limitação de edge case | Documentar; backlog pós-piloto |

---

### CERT-03.1 — Corrigir INCOMPLETO por domínio

Para cada tela marcada INCOMPLETO na matriz:

**3.1.1** Identificar o ponto de quebra na cadeia:
```
Tela → Handler → api.js → Endpoint → Guard → Serviço → BD
       ↑ stub?   ↑ 404?   ↑ sem auth? ↑ falha?  ↑ sem tabela?
```

**3.1.2** Criar o menor FIX possível. Critério: não adicionar funcionalidade nova; restaurar a cadeia existente.

**3.1.3** Adicionar ao PR:
- Link para linha da matriz corrigida
- Evidência: `curl` ou screenshot antes → depois
- Status atualizado na matriz: `INCOMPLETO → NAO_VALIDADO` (E2E ainda necessário)

**3.1.4** Rodar `npm run audit:drift` no PR → bloquear merge se drift detectado.

---

### CERT-03.2 — Eliminar mocks em KPIs e gráficos

Para cada componente marcado MOCK na varredura da Fase 1:

**3.2.1** Identificar o serviço de dados correto:
- Gráficos: `chartDataUtils.js` + APIs `dashboard.getTrend`, `getProductionDemand`, `getPulseClimate`, `costs.getByOrigin`
- KPIs: endpoint de domínio correspondente (Quality, SST, ESG, etc.)
- Componente canônico: `ImpetusChart` / `ImpetusChartPanel`

**3.2.2** Substituir dado simulado por chamada real.

**3.2.3** Estado vazio (API sem dados): mensagem técnica em Share Tech Mono, **nunca** array fixo de fallback.

**3.2.4** Validar que cores usam tokens (`--cyan`, `--green`, `--amber`, `--red`) — sem hex solto.

---

### CERT-03.3 — Corrigir variáveis de ambiente ausentes críticas

**3.3.1** `BASE_URL` → necessário para links em e-mails de reset de senha, MFA, convites.  
**3.3.2** `SMTP_PASS` → email desabilitado silenciosamente; configurar ou documentar como desabilitado explicitamente.  
**3.3.3** `VITE_API_URL` → garantir que build de produção usa `/api` relativo (Nginx faz proxy), não URL absoluta com porta.  
**3.3.4** `DB_POOL_MAX` → definir explicitamente (default atual desconhecido para cada instalação).

---

### CERT-03.4 — Corrigir rotas backend sem autenticação esperada

Da auditoria: **324 endpoints sem `requireAuth` padrão**. Nem todos são falhas, mas precisam de triagem.

**3.4.1** Criar planilha de triagem a partir de `BACKEND_INVENTORY.json`:
- Endpoints de auth (login, reset, federation) → corretos sem auth  
- Endpoints SCIM (bearer próprio) → corretos  
- Endpoints internos (CIDR guard) → corretos se guard ativo  
- Endpoints de domínio sem auth → **bug** a corrigir

**3.4.2** Para cada endpoint de domínio sem auth confirmado como bug:
```javascript
router.get('/recurso', requireAuth, requireCompanyId, handler);
```

**Definition of Done Fase 3:**  
- [ ] Todos os INCOMPLETO P0 corrigidos  
- [ ] Todos os MOCK em KPI/gráfico eliminados  
- [ ] Variáveis críticas ausentes definidas  
- [ ] Triagem de auth: 0 endpoint de domínio sem requireAuth não-intencional  
- [ ] `npm run audit:drift` verde  
- [ ] Cada FIX com evidência de antes/depois

**GATE G3:** relatório semáforo atualizado → domínios do piloto com ≥ 80% das telas NAO\_VALIDADO (aguardando E2E), 0 INCOMPLETO P0, 0 MOCK em KPI.

---

## FASE 4 — VALIDAÇÃO E2E POR DOMÍNIO

**Duração:** 8–15 dias  
**Objetivo:** elevar telas de `NAO_VALIDADO` para `VERDE` ou `AMARELO` com evidência real. Esta é a prova de que o software funciona de fato.

---

### Ambiente de validação

**4.0.1** Preparar seed multi-tenant:
- Empresa A + Empresa B (isolamento)
- 1 usuário por nível hierárquico 0–5 por empresa
- Dados mínimos por domínio (NCs, incidentes, lançamentos ESG, OS de manutenção)

**4.0.2** Backend rodando com flags do piloto:
```env
EVENT_GOVERNANCE_AIOI=false    # Fase 4 valida sem EG primeiro
IMPETUS_AIOI_ENABLED=true
IMPETUS_GOVERNANCE_LEARNING=shadow
```

---

### Cenários E2E obrigatórios por domínio

Para cada cenário: executar no browser → capturar as 6 evidências → classificar na matriz.

**4.1 Quality — NC → CAPA → Auditoria**  
- Criar NC com dados reais  
- Vincular CAPA à NC  
- Gerar registro de auditoria  
- Verificar KPI de qualidade reflete evento  
- Evidências: screenshot final + payload POST + response 201 + `SELECT * FROM quality_nonconformities WHERE id=X` + log auditoria + leitura como Tenant B retorna vazio

**4.2 SST — Incidente / Quase-acidente / Treinamento vencido**  
- Registrar incidente de segurança  
- Confirmar notificação no Notification Center  
- Verificar treinamento vencido dispara alerta  
- 6 evidências por fluxo

**4.3 ESG — Emissão / Resíduo / Consumo**  
- Lançar emissão de carbono  
- Confirmar agregação no painel ESG  
- Validar gráfico usa dado real (não fallback)  
- 6 evidências

**4.4 ManuIA — Diagnóstico → OS → Histórico**  
- Diagnóstico IA cria OS  
- OS muda de estado (aberta → em andamento → concluída)  
- Histórico recupera cadeia completa  
- 6 evidências

**4.5 TPM — Preventiva → execução → indicador**  
- OS preventiva agendada  
- Execução registrada  
- MTBF/disponibilidade atualiza  
- 6 evidências

**4.6 AIOI — Correlação → Insight → Escalonamento**  
- Evento correlacionado gera insight com `confidence`  
- Insight escala para canal correto  
- Registrar `recordOutcome` (aprendizagem shadow)  
- 6 evidências

**4.7 Executive — Dashboard executivo por perfil**  
- Autenticar como CEO (nível 0) → KPIs da empresa  
- Autenticar como Gerente (nível 2) → KPIs do seu escopo  
- Confirmar isolamento: KPIs da Empresa A não visíveis para Empresa B  
- 6 evidências

**4.8 Billing/DSR**  
- Verificar estado de assinatura reflete status Asaas (se configurado) ou degradação graciosa  
- Pedido DSR/LGPD: criar → processar → trilha auditável  
- 6 evidências

**4.9 Admin — Controle de acesso por perfil**  
- Testar guards: `StrictAdminRouteGuard` bloqueia colaborador  
- `RequireHierarchy(2)` bloqueia nível 3+  
- `sameCompanyOnly` bloqueia cross-tenant por parâmetro  
- 6 evidências por guard validado

**4.10 Chat / IA operacional**  
- Chat com contexto do usuário (empresa, perfil, domínio)  
- Resposta com `x-ai-trace-id` registrado  
- Smart Panel gera insight com dado real  
- 6 evidências

---

### Homologação por perfil

Para cada perfil do sistema (alinhado a `requireHierarchy`):

| Perfil | Nível | Validar acesso a |
|--------|-------|-----------------|
| CEO | 0 | Todas as telas; execução e leitura completa |
| Diretor | 1 | Telas de gestão; bloqueio de admin strict |
| Gerente | 2 | Telas operacionais; bloqueio de admin |
| Coordenador | 3 | Telas de área; bloqueio de gestão executiva |
| Supervisor | 4 | Operacional; bloqueio de configurações |
| Colaborador / Operador | 5 | Telas básicas; bloqueio de todas as gerenciais |

**Definition of Done Fase 4:**  
- [ ] 10 cenários E2E executados com 6 evidências cada  
- [ ] Homologação por perfil 0–5 concluída  
- [ ] 0 vazamento de cross-tenant em todos os cenários  
- [ ] Domínios do piloto com happy-path VERDE  
- [ ] Evidências em `backend/docs/evidence/<domínio>/<cenário>/`

**GATE G4:** relatório semáforo final com domínios piloto todos VERDE no happy-path; AMARELO documentado com limitação conhecida.

---

## FASE 5 — CERT-03: INFRAESTRUTURA ENTERPRISE

**Duração:** 16–25 dias  
**Objetivo:** conectar observabilidade, backup, CI/CD e migrations formais — sem isso não existe go-live seguro.

---

### CERT-03.1 — Observabilidade real (não stack opcional)

**5.1.1** Adicionar dependência `prom-client` ao backend:
```bash
npm install prom-client
```

**5.1.2** Criar `backend/src/middleware/metricsExporter.js`:
- Histograma de latência HTTP por rota e método  
- Contadores de erro 4xx / 5xx  
- Gauge: sessões ativas, pool DB, fila AIOI  
- Gauge: decisões Event Governance + `confidence` médio  
- Exposição em `GET /metrics` (protegido por `HEALTH_DETAIL_KEY`)

**5.1.3** Instrumentar `pg` com `opentelemetry-instrumentation-pg` para traces de query.

**5.1.4** Subir stack de observabilidade:
```bash
docker compose -f infra/observability/docker-compose.yml up -d
```
Configurar Prometheus para scrape `http://127.0.0.1:4000/metrics`.

**5.1.5** Criar dashboards Grafana versionados em `infra/observability/dashboards/`:
- **SRE (método RED):** latência p50/p95/p99, taxa de erro, saturação  
- **Industrial:** eventos por domínio por hora, insights AIOI por dia, decisões EG

**5.1.6** Configurar alertas no Alertmanager:
- Backend down > 30s  
- Erro 5xx > 5% das requisições por 5min  
- Latência p95 > 3s  
- Pool DB < 2 conexões livres  
- Fila AIOI acumulando (> threshold configurável)

**5.1.7** Testar: forçar erro proposital → confirmar alerta disparado ponta a ponta.

---

### CERT-03.2 — Backup e Disaster Recovery

**5.2.1** Criar `infra/scripts/backup-postgres.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/var/backups/impetus
mkdir -p $BACKUP_DIR
pg_dump -U $DB_USER -h $DB_HOST $DB_NAME | gzip > $BACKUP_DIR/impetus_${DATE}.sql.gz
# Manter últimos 7 diários + 4 semanais
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
# Upload S3/compatível (adicionar awscli ou rclone)
```

**5.2.2** Agendar cron: `0 2 * * * /infra/scripts/backup-postgres.sh` (2h todo dia).

**5.2.3** Executar **teste de restore** em ambiente isolado:
```bash
createdb impetus_restore_test
gunzip -c backup_mais_recente.sql.gz | psql -U postgres impetus_restore_test
node backend/scripts/audit/buildFunctionalMatrix.js  # Smoke test sobre BD restaurado
```
Documentar RTO/RPO medidos.

**5.2.4** Criar `backend/docs/DISASTER_RECOVERY_RUNBOOK.md`:
- Cenário 1: Perda de BD → restore + tempo esperado  
- Cenário 2: Crash do servidor → reiniciar PM2 + validar health  
- Cenário 3: Build corrompido → rollback para release anterior  
- Cenário 4: Rotate JWT_SECRET de emergência → janela de sessão + passos

**5.2.5** Permissões seguras do `.env`:
```bash
chmod 600 backend/.env
chown root:root backend/.env
```

---

### CERT-03.3 — Migrations formais

**5.3.1** Adotar `node-pg-migrate` ou `db-migrate`:
```bash
npm install node-pg-migrate --save-dev
```

**5.3.2** Criar baseline: snapshot do schema atual como migration inicial `0001_baseline.sql`.

**5.3.3** Converter migrations ad-hoc existentes (`models/*.sql`, scripts de hardening) em migrations numeradas sequencialmente.

**5.3.4** Adicionar ao `package.json`:
```json
"migrate:up":   "node-pg-migrate up",
"migrate:down": "node-pg-migrate down",
"migrate:status": "node-pg-migrate status"
```

**5.3.5** Garantir idempotência: `IF NOT EXISTS` em todos os `CREATE TABLE/INDEX`.

---

### CERT-03.4 — CI/CD com gates

**5.4.1** Criar `.github/workflows/ci.yml` — gate de PR:
```yaml
jobs:
  lint-test:
    steps:
      - npm ci
      - npm run lint              # ESLint frontend + backend
      - npm run test              # suites existentes
      - npm run test:security     # enterpriseHardeningValidation.js (11/11 SEC)
      - npm run audit:matrix      # buildFunctionalMatrix.js
      - npm run audit:drift       # checkMatrixDrift.js --fail-on-drift
      - npm run build             # Vite build frontend
```

**5.4.2** Criar `.github/workflows/migration-gate.yml`:
```yaml
jobs:
  migration-check:
    services:
      postgres:
        image: postgres:15
    steps:
      - npm run migrate:up        # migrations sobre BD efêmero
      - npm run migrate:status    # confirmar 0 pendentes
```

**5.4.3** Criar `.github/workflows/deploy.yml` — deploy manual/por tag:
```yaml
jobs:
  deploy:
    steps:
      - ssh VPS: git pull origin main
      - ssh VPS: npm ci --prefix backend
      - ssh VPS: npm run migrate:up --prefix backend
      - ssh VPS: npm run build --prefix frontend
      - ssh VPS: pm2 reload ecosystem.config.js --env production --update-env
      - ssh VPS: bash infra/scripts/post-deploy-healthcheck.sh
      # Se health falhar → rollback automático:
      - on-failure: pm2 revert impetus-backend && pm2 revert impetus-frontend
```

**5.4.4** Log-rotate PM2:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 7
```

**Definition of Done Fase 5:**  
- [ ] `/metrics` expõe dados reais; Grafana exibe tráfego  
- [ ] Alerta de erro 5xx testado ponta a ponta  
- [ ] Backup diário rodando; restore validado com RTO/RPO documentado  
- [ ] Runbook de DR publicado  
- [ ] Migrations em sistema formal; `migrate:status` = 0 pendentes  
- [ ] CI: lint + test + SEC + drift gate verde no PR atual  
- [ ] Deploy automatizado testado uma vez; rollback comprovado

**GATE G5:** todos os itens acima fechados; backup mais recente datado de ontem ou hoje.

---

## FASE 6 — CERT-04: PILOTO INDUSTRIAL ASSISTIDO

**Duração:** 30–60 dias de calendário  
**Objetivo:** validar o IMPETUS com o primeiro cliente real, com monitoramento ativo, Learning em shadow e sem novas funcionalidades.

---

### CERT-04.1 — Ativação cognitiva controlada

**6.1.1** Atualizar `backend/.env` para o piloto:
```env
EVENT_GOVERNANCE_AIOI=true          # AIOI via EG ativo
EVENT_GOVERNANCE_ENABLED=true       # Governança principal ativa
EVENT_GOVERNANCE_QUALITY=true       # Domínio Quality via EG
EVENT_GOVERNANCE_SST=true           # Domínio SST via EG
EVENT_GOVERNANCE_MANUIA=true        # ManuIA via EG
EVENT_GOVERNANCE_LEARNING=false     # Learning AINDA shadow (não age)
IMPETUS_GOVERNANCE_LEARNING=shadow  # Confirmar shadow
```

**6.1.2** Reiniciar:
```bash
pm2 restart ecosystem.config.js --env production --update-env
bash infra/scripts/post-deploy-healthcheck.sh
```

**6.1.3** Atualizar `FLAG_BASELINE_FROZEN.md` com novo baseline do piloto.

---

### CERT-04.2 — Operação assistida

**6.2.1** Monitorar dashboards Grafana diariamente nas primeiras 2 semanas.

**6.2.2** Registrar métricas semanais:

| Métrica | Meta | Semana 1 | Semana 2 | … |
|---------|------|---------|---------|---|
| Uptime backend | ≥ 99% | | | |
| Latência p95 | < 2s | | | |
| Taxa de erro 5xx | < 1% | | | |
| Insights AIOI/dia | > 0 | | | |
| Confidence médio AIOI | > 0.7 | | | |
| Falsos positivos AIOI | < 10% | | | |
| NCs criadas | > 0 | | | |
| Incidentes SST registrados | > 0 | | | |

**6.2.3** Backlog de `FIX` durante piloto:
- Incidentes abertos como issues com label `FIX`  
- **Proibido** abrir issues `FEAT` durante piloto  
- Priorização semanal pelo arquiteto-chefe

**6.2.4** Treinamento dos usuários:
- Operadores e Colaboradores (nível 4–5): registro de eventos, acesso mobile  
- Supervisores e Coordenadores (nível 3–4): aprovações, relatórios  
- Gestores e Diretores (nível 1–2): dashboards executivos, AIOI  
- Admin (configurações): estrutura, usuários, departamentos

---

### CERT-04.3 — Critérios de graduação para Learning real

Ativar `EVENT_GOVERNANCE_LEARNING=true` **somente quando**:

- [ ] ≥ 30 dias de operação estável (sem incidente crítico aberto)  
- [ ] ≥ 500 decisões AIOI registradas com outcome feedback  
- [ ] Taxa de falso-positivo AIOI < 10%  
- [ ] `confidence` médio das decisões > 0.70  
- [ ] Arquiteto-chefe aprova por escrito

Ativação progressiva:
1. `shadow`: registra previsões sem agir (já é o estado atual)  
2. `canary`: age em 10% dos casos, revisado por humano  
3. `active`: autônomo com supervisão aleatória

```env
# Só após critérios acima
EVENT_GOVERNANCE_LEARNING=true
```

**Definition of Done Fase 6:**  
- [ ] Piloto ≥ 30 dias concluído  
- [ ] Métricas dentro dos limiares durante a janela  
- [ ] Todos os cenários E2E executados em produção real  
- [ ] Relatório de piloto publicado com dados  
- [ ] Decisão go/no-go documentada para Learning ativo

**GATE G6:** relatório de piloto aprovado pelo arquiteto-chefe e pelo cliente.

---

## FASE 7 — GO-LIVE EM ESCALA

**Duração:** ~5 dias de ativação + acompanhamento contínuo  
**Pré-requisito:** Gates G1→G6 fechados; selos Manual 10.3 e 10.4 emitidos

---

### 7.1 Checklist pré-go-live (verificar tudo antes de abrir acesso em escala)

| Item | Status obrigatório |
|------|-------------------|
| `FUNCTIONAL_MATRIX.json` — domínios em escala VERDE | Sim |
| `FLAG_BASELINE_FROZEN.md` atualizado | Sim |
| PM2 em `env_production` | Sim |
| Nginx + SSL + UFW ativos | Sim |
| JWT rotacionado; httpOnly ativo | Sim |
| Backup diário validado ontem | Sim |
| Grafana + alertas ativos | Sim |
| Runbook de DR publicado | Sim |
| CI/CD verde na branch main | Sim |
| `EVENT_GOVERNANCE_LEARNING` graduar conforme critérios | Condicional |

---

### 7.2 Publicação em escala

**7.2.1** Executar deploy via pipeline:
```bash
git tag v1.0.0-golive && git push origin v1.0.0-golive
# Pipeline deploy.yml executa automaticamente
```

**7.2.2** Validar em produção após deploy:
```bash
bash infra/scripts/post-deploy-healthcheck.sh
curl -H "X-Health-Key: $HEALTH_DETAIL_KEY" https://app.dominio.com/api/system/health/deep
```

**7.2.3** Liberar acesso aos usuários em grupos (não todos de uma vez):
1. Grupo alpha: equipe interna + power users do cliente  
2. Grupo beta: gestores e supervisores  
3. Grupo produção: todos os colaboradores

---

### 7.3 Monitoramento pós go-live

**7.3.1** Primeiras 48h: alertas monitorados manualmente.  
**7.3.2** Semana 1: daily review de métricas Grafana.  
**7.3.3** Mês 1: relatório semanal de adoção.

Métricas de adoção:
- DAU/MAU por módulo  
- Taxa de conclusão de fluxos (NC aberta → fechada, OS criada → concluída)  
- NPS dos usuários (pesquisa quinzenal)  
- Tempo médio por tarefa

---

### 7.4 Aceite técnico e implantação oficial

**7.4.1** Emitir `backend/docs/ACEITE_TECNICO_GOLIVE.md` contendo:
- Data de go-live  
- Versão do sistema (`git describe --tags`)  
- Lista de módulos em escala com status VERDE  
- Métricas de estabilidade da semana 1  
- Assinatura do arquiteto-chefe e do responsável cliente

**7.4.2** Publicar selos de maturidade (Manual Parte 10):
- ✅ 10.1 Funcionalmente Certificado  
- ✅ 10.2 Operacionalmente Certificado  
- ✅ 10.3 Pronto para Piloto  
- ✅ 10.4 Produção Enterprise

---

## RESUMO EXECUTIVO — FASES, GATES E PRAZOS

```
FASE 0  Congelamento          1 dia        Gate: regra ativa
FASE 1  Certificação Funcional 14-22 dias  Gate G1: matriz 100% classificada
FASE 2  Hardening Produção    12-18 dias   Gate G2: P0 ativo + sessão enterprise
FASE 3  Correção FIX          10-20 dias   Gate G3: 0 INCOMPLETO P0, 0 MOCK KPI
FASE 4  Validação E2E         8-15 dias    Gate G4: domínios piloto VERDE
FASE 5  Infra Enterprise      16-25 dias   Gate G5: observ + backup + CI/CD
FASE 6  Piloto Assistido      30-60 dias   Gate G6: piloto aprovado
FASE 7  Go-Live Escala        ~5 dias      Selos Manual 10.3→10.4
─────────────────────────────────────────────────────────────
Total estimado (engenharia): 90-130 dias de trabalho
Total calendário c/ piloto:  ~5-6 meses
```

---

## RASTREABILIDADE: plano v1 → plano v2

| Etapas v1 | Destino v2 | Transformação |
|-----------|-----------|---------------|
| 1–11, 16–20 | Fase 1 | Automatizado via scripts |
| 12–15 | Fase 1.1 (`traceScreenChains.js`) | Ferramenta, não manual |
| 18 | Fase 1.2 (`dumpEffectiveFlags.js`) | Snapshot formal |
| 21–40 | Fase 3 | Só FIX da matriz, com DoD |
| 41–60 | Fase 3+4 | Validar cadeias, não "ligar tudo" |
| 61–64, 66–70, 80 | Fase 4 | Manter; E2E com evidência |
| 65 (validar refresh) | Fase 2.1 | **Implementar** + validar |
| 71–79 (criar endpoints) | Fase 3.1 | Só FIX rastreado na matriz |
| 81–100 (módulos novos) | Fase 4 (cenários E2E) | **Certificar**, não construir do zero |
| 101–120 (IA completa) | Fase 6.1 (ativação controlada) | Flags piloto, não expansão |
| 121–140 (segurança) | Fase 2.0 (antecipada) | P0 antes de demo externa |
| 141–160 (homologação) | Fase 4 + 5.2 | Com 6 evidências obrigatórias |
| 161–180 (go-live) | Fase 7 | Gates G1–G6 obrigatórios |

---

*Este plano é o documento de execução oficial do ciclo de certificação CERT-01→04 do IMPETUS Comunica IA.*  
*Nenhuma etapa deve ser pulada. Nenhum gate deve ser declarado fechado sem evidência.*
