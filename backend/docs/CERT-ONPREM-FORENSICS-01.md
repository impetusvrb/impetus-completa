# CERT-ONPREM-FORENSICS-01 — Laudo Forense Arquitetural

**Tipo:** Certificação forense (somente leitura)  
**Escopo:** Arquitetura completa IMPETUS Comunica IA  
**Data:** 30 de junho de 2026  
**Modo:** READ ONLY — sessão original de auditoria (nenhum ficheiro alterado em 2026-06-30)  
**Status:** CERTIFICADO — laudo consolidado no repositório (2026-07-01, CERT-ENTERPRISE-HOUSEKEEPING-01)  
**Referência:** decisões subsequentes em ARCHITECTURE-01 e certificações derivadas.

**Base canónica de produção:** `/var/www/impetus-completa/backend/` + `/var/www/impetus-completa/frontend/` (PM2 via `ecosystem.config.js`). Espelho legado `impetus_complete/` identificado mas **não** é base de produção.

---

## PARTE 1 — Identificação da arquitetura atual

### Classificação

**Arquitetura: SaaS Multi-Tenant Híbrida**

| Critério | Evidência |
|----------|-----------|
| Multi-tenant real | Tabela `companies` como raiz; onboarding público (`POST /api/companies`); portal IMPETUS Admin cross-tenant |
| Schema partilhado | PostgreSQL único; isolamento por `company_id` em queries e middleware |
| Híbrido | RLS PostgreSQL opcional/piloto; billing/subscrição SaaS; portal plataforma separado do tenant; estado cognitivo em JSON por tenant em `backend/data/` |

Não é single-tenant: múltiplas empresas coexistem na mesma instância. Não é pseudo multi-tenant: há guards de isolamento, anti-spoof e dezenas de tabelas com `company_id`.

### Elementos estruturais

| Elemento | Implementação |
|----------|---------------|
| **CompanyId** | Canónico: `companies.id` (UUID). Exposto como `company_id` em BD, JWT e frontend |
| **TenantId** | Alias de runtime: `req.tenantId = req.user.company_id` (`tenantIsolationGuard.js`) |
| **Organização** | `departments`, `organizational_units`, `company_sectors`, `company_roles` |
| **Usuário** | `users.company_id` + `role`, `permissions[]`, `company_role_id`, `hierarchy_level` |
| **RBAC** | Camadas: role legado, permissions, cargos estruturais, `tenant_admins`, capabilities contextuais |
| **Hierarquia** | `hierarchyResolver.js`: CEO(0) → operador(5); prioridade `company_roles.hierarchy_level` |
| **Base estrutural** | Cadastro de setores, departamentos, cargos, equipamentos — pré-requisito operacional |

### Diagrama textual de relações

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PLATAFORMA IMPETUS (SaaS Operator)                    │
│  admin_users (impetus_admin) ──► CRUD companies, billing, suporte       │
│  JWT separado: IMPETUS_ADMIN_JWT_SECRET                                 │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ gere N tenants
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         TENANT = companies.id                            │
│  plan_type │ subscription_tier │ tenant_status │ active                 │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ 1:N
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐    ┌────────────────────┐    ┌──────────────────┐
│ organizational│    │ company_roles      │    │ tenant_admins    │
│ _units        │    │ (cargos + flags)   │    │ primary/secondary│
│ departments   │    │ hierarchy_level    │    │ /recovery        │
│ company_sectors│   └─────────┬──────────┘    └──────────────────┘
└───────┬───────┘              │
        │                      │ company_role_id
        ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  users (company_id FK)                                                   │
│  role │ permissions[] │ hierarchy_level │ department_id │ supervisor_id   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ JWT(company_id) + sessions
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  REQUEST PIPELINE                                                        │
│  requireAuth → tenantIsolationGuard → tenantRlsContext → requireCompany  │
│  Active → handlers WHERE company_id = $1 → tenantResourceAssert (IDOR)   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
  Domínios operacionais   Módulos cognitivos      Event Backbone
  (quality, safety, etc.) (Pulse, Controller…)    (outbox PG por tenant)
        │                       │                       │
        └───────────────────────┴───────────────────────┘
                                ▼
                    backend/data/<tenant-uuid>/*.json
                    PostgreSQL (company_id scoped)
```

---

## PARTE 2 — Dependências da infraestrutura atual

| Dependência | Obrigatória? | Parametrizável? | Depende VPS? | Env var? | Path absoluto? | IP/domínio fixo? |
|-------------|--------------|-------------------|--------------|----------|----------------|------------------|
| **Frontend** (Vite + `serveDist.cjs`) | Sim | Sim (`VITE_*`, `SERVE_DIST_*`) | Sim (PM2) | Sim | `dist/` relativo | Prod: `srv1422313.hstgr.cloud` em `.env` |
| **Backend** (Express/Node 20) | Sim | Sim (`PORT`, `LISTEN_HOST`) | Sim | Sim | `cwd` PM2 relativo | `127.0.0.1:4000` prod |
| **Nginx** | Sim (HTTPS prod) | Template `SEU_DOMINIO` | Sim | Snippets | `/etc/nginx/`, `/etc/letsencrypt/` | Placeholder no template |
| **PM2** | Sim (deploy doc) | Parcial | Sim | `ecosystem.config.js` | `/root/.pm2/logs/*` hardcoded | Não |
| **Scheduler** (`setInterval` + `node-cron`) | Parcial | Flags `*_ENABLED` | Sim (processo Node) | Sim | Não | Não |
| **Cron billing** | Não | `ENABLE_NEXUS_TOKEN_BILLING_CRON` | Sim | Sim | Não | Não |
| **Uploads** | Sim | `UPLOADS_DIR` | Sim (disco host) | Sim | `uploads/` + `backend/uploads/` | Não |
| **Logs** | Sim | PM2 paths | Sim | Parcial | `/root/.pm2/logs/` | Não |
| **Backups** | Recomendado | Manual | Sim | `DB_*` | `backend/backups/` | Não |
| **Prometheus/Grafana** | Não | `IMPETUS_OBSERVABILITY_V2_ENABLED` | Opcional Docker | Sim | `infra/observability/` | Scrape `:3333` default (desalinhado com `:4000`) |
| **Event Backbone** | Core industrial | Flags `IMPETUS_INDUSTRIAL_*` | Sim (PG+Node) | Sim | Não | Não |
| **WebSockets** (Socket.IO) | Sim (voz/avatar) | CORS via `ALLOWED_ORIGINS` | Sim | Parcial | Paths `/socket.io`, `/impetus-voice` hardcoded | Não |
| **Realtime OpenAI** | Não | `IMPETUS_REALTIME_PROXY_ENABLED` | Sim | Sim | `wss://api.openai.com` hardcoded upstream | Sim (OpenAI) |
| **ANAM** | Não (primário voz) | `ANAM_API_KEY`, `ANAM_API_BASE` | Não | Sim | Default `https://api.anam.ai` | Domínio Anam |
| **OpenAI** | Não | `OPENAI_API_KEY` | Não (cloud) | Sim | URL hardcoded | Sim |
| **Claude** | Não | `ANTHROPIC_API_KEY` | Não | Sim | URL hardcoded | Sim |
| **Gemini** | Não | `GEMINI_API_KEY` / `GOOGLE_API_KEY` | Não | Sim | Vertex opcional | Sim |
| **SMTP** | Não | `SMTP_*` | Pode ser on-prem | Sim | Fallback `app.impetus.com.br` | Domínio SaaS fallback |
| **Redis** | **Não implementado** | Menções futuras | N/A | `IMPETUS_AIOI_BUS_MODE=redis` (não activo) | N/A | N/A |
| **PostgreSQL** | **Sim** | `DATABASE_URL` ou `DB_*` | Pode ser externo | Sim | Não | Não |
| **Filesystem** | Sim | `UPLOADS_DIR`, `backend/data/` | Sim | Parcial | `/var/www/impetus-completa` em lipsync/lab | Host actual |
| **DNS/HTTPS** | Prod | Nginx + Let's Encrypt | Sim | `FRONTEND_URL`, `ALLOWED_ORIGINS` | `/etc/letsencrypt/live/SEU_DOMINIO/` | `srv1422313.hstgr.cloud` prod |
| **Webhooks** (Asaas, Meta, Stripe) | Não | `ASAAS_*`, `META_APP_SECRET` | Parcial | Sim | IP allowlist Asaas hardcoded | Asaas cloud |
| **Lipsync** (Wav2Lip) | Não | PM2 separado | Sim | `ecosystem.lipsync.config.cjs` | `/var/www/impetus-completa/lipsync/` | `:5001` local |

---

## PARTE 3 — Configuração (matriz resumida)

O catálogo completo documenta **~200+ variáveis** em `deploy_backups/20260601_2259/.env.example`; produção activa **~990+** em `backend/.env`. Matriz representativa:

| Variável | Local | Obrigatória | Default | Hardcoded | Parametrizada |
|----------|-------|-------------|---------|-----------|---------------|
| `JWT_SECRET` | `configValidator.js` | **Sim** (prod) | — | Não | Sim |
| `IMPETUS_ADMIN_JWT_SECRET` | `configValidator.js` | **Sim** (prod) | — | Não | Sim (lacuna: pode faltar no `.env` actual) |
| `DATABASE_URL` / `DB_*` | `db/index.js` | **Sim** | `127.0.0.1:5432/impetus_db` | Defaults dev | Sim |
| `ALLOWED_ORIGINS` | `security.js` | **Sim** (prod efectivo) | Recusa se vazio | Não | Sim |
| `NODE_ENV` | PM2 / server | Recomendado | `development` | Não | Sim |
| `PORT` | PM2 | Não | `4000` | PM2 prod | Sim |
| `LISTEN_HOST` | PM2 | Não | `127.0.0.1` prod | PM2 | Sim |
| `FRONTEND_URL` | email, links | Funcional | `https://app.impetus.com.br` | **Fallback hardcoded** | Sim |
| `OPENAI_API_KEY` | serviços IA | Não | — | Não | Sim |
| `LICENSE_VALIDATION_ENABLED` | `license.js` | Não | `false` | Não | Sim |
| `IMPETUS_INDUSTRIAL_BACKBONE_MODE` | `industrialFlags.js` | Não | `shadow` | Não | Sim (prod: `on`) |
| `VITE_API_URL` | frontend build | Recomendado | `/api` | Não | Sim |
| `VITE_DID_SOURCE_URL` | `frontend/.env.production` | Não | — | **IP `72.61.221.152`** | Parcial |

### Configurações fixas identificadas (sem alteração)

1. Fallback `https://app.impetus.com.br` em `emailService.js` e billing notifications  
2. URLs upstream IA: `api.openai.com`, `api.anthropic.com`, `api.anam.ai`, `api.d-id.com`  
3. Paths PM2 logs: `/root/.pm2/logs/`  
4. Paths lab/lipsync: `/var/www/impetus-completa`  
5. WebSocket paths: `/socket.io`, `/impetus-voice`, `/impetus-avatar`, `/impetus-realtime`  
6. IP allowlist Asaas em `asaasService.js`  
7. Contacto financeiro fallback: `financeiro@impetus.com.br`, WhatsApp em `SubscriptionExpired.jsx`

---

## PARTE 4 — Multiempresa

### CompanyId é obrigatório?

**Sim**, para utilizadores de empresa. Excepções whitelist: auth, webhooks, health, rotas admin-portal (`tenantIsolationGuard.js`).

### Utilização por módulo

| Módulo | Depende `company_id`? | Evidência |
|--------|----------------------|-----------|
| **Pulse** (RH + operacional) | **Sim** | 79+ refs em `pulseCognitive.js`; `pulseService.js` |
| **Controller Cognitivo** | **Sim** | `cognitiveControllerService.js`, rollout chat |
| **Dashboard** | **Sim** | 76 refs em `dashboard.js`; `moduleAccessGovernanceEngine` |
| **Event Backbone** | **Sim** | Outbox, retention, throttle por tenant |
| **Gêmeo Digital** | **Sim** | `digitalTwinService.js`, rotas ManuIA |
| **ManuIA** | **Sim** | `manutencao-ia.js` (27 refs) |
| **ANAM** | **Sim** (sessão) | Contexto de conversação por utilizador/empresa |
| **Workflow** | **Sim** | `workflowOrchestrator.js`, permission gate |
| **Qualidade** | **Sim** | Domínio `quality/` — telemetria, workflows, audit |
| **SST (Safety)** | **Sim** | Domínio `safety/` — activation, risk matrix |
| **Pró-Ação** | **Sim** | `proacao.js`, rotas |
| **TPM** | Parcial | Via MES/manutenção (sem pasta `tpm/` isolada; scoped em rotas MES) |
| **Comunicação** | Parcial | Integrado em chat/voz/dashboard, não módulo isolado com pasta própria |
| **Logística** | **Sim** | `logisticsIntelligenceService.js` (60 refs) |
| **Mapping** | Transversal | Behavior mapping em `organizationalIntelligenceEngine.js`; PLC/ERP mapping em adapters |
| **Executive** | **Sim** | `executiveCockpitConsolidationRuntime.js`, environment executive |
| **Boardroom** | **Sim** (quando activo) | `executivePresentationContext.js`, perfil `boardroom` |

### Remover CompanyId em instalação única?

**Não recomendado arquitecturalmente.** Motivos:

- Isolamento já consolidado em middleware, RBAC, Event Backbone e domínios operacionais  
- RLS enterprise preparado por `company_id`  
- Estado cognitivo particionado por UUID em `backend/data/`  
- Remoção implicaria refactor massivo sem ganho em single-tenant (1 registo em `companies` basta)

### Recomendação técnica

**Manter `company_id` como chave de particionamento lógica** mesmo em on-premise single-fábrica: criar uma única empresa no setup (`/setup-empresa`, `install-industrial.sh`), desactivar portal multi-tenant e billing SaaS. O modelo actual suporta “single factory, single company row” sem alterar schema.

---

## PARTE 5 — Banco de Dados

| Área | Estado | Evidência |
|------|--------|-----------|
| **Migrations** | Maduro | ~95 em `src/models/` + 33 em `migrations/`; runner forward-only com checksum e advisory lock |
| **Seeds** | Parcial | `seed-admin-portal.js` OK; `npm run seed` → `seed-initial.js` **ausente** |
| **Init** | Documentado | `install-industrial.sh`, `INSTALACAO_INDUSTRIAL.md` |
| **Admin** | 3 camadas | Portal IMPETUS, `tenant_admins`, onboarding `/api/companies` |
| **Backup** | Manual | `backup-db-before-manuia.sh` → `pg_dump` |
| **Restore** | Manual | Documentado em manual master; **sem script automatizado** |
| **Índices** | Nas migrations | Incl. outbox, event backbone, RLS registry |
| **Versionamento** | `impetus_migration_history` | Governança em `migrationGovernanceService.js` |

### Respostas directas

- **Instalação limpa:** Sim, via `run-all-migrations.js` + onboarding manual  
- **Migrations suficientes:** Sim para schema; seeds de tenant não automatizados no install script  
- **Dependência manual:** Sim — primeiro admin de fábrica, restore BD, alguns npm scripts órfãos

---

## PARTE 6 — Event Backbone

### Componentes auditados

| Componente | Ficheiro | Default |
|------------|----------|---------|
| Outbox industrial | `industrialOutboxService.js` → `industrial_event_outbox` | OFF/shadow |
| Outbox AIOI | `aioiOutboxWorkerService.js` → `aioi_outbox` | PG soberano, sem Kafka/Redis |
| Retention CERT-01 | `eventRetentionEngine.js` | `shadow`; purge nunca automático |
| Archive | `industrialArchiveService.js` | `IMPETUS_INDUSTRIAL_ARCHIVE_ENABLED=false` |
| Scheduler | `industrialBackboneScheduler.js` | `IMPETUS_INDUSTRIAL_BACKBONE_SCHEDULER=false` |
| Lifecycle | `eventLifecycleStates.js` | ACTIVE → … → PURGED |

### Dependência SaaS?

**Não.** Backbone usa PostgreSQL + Node schedulers. Comentário explícito em `aioi_outbox_foundation_migration.sql`: sem Kafka/Rabbit/Redis obrigatório.

### Dependência infra actual?

Parcial: schedulers no mesmo processo PM2; `auditOutboxService` in-memory (single-instance).

### Funciona on-prem sem alterações?

**Sim**, com flags conservadoras (defaults shadow). Produção actual tem backbone **ligado** (`IMPETUS_INDUSTRIAL_BACKBONE_MODE=on`) — comportamento mais agressivo que defaults de código; requer revisão na migração on-prem.

---

## PARTE 7 — Módulos Cognitivos

| Módulo | Classificação | Justificativa |
|--------|---------------|---------------|
| **Controller Cognitivo** | **Compatível** | Serviço interno; depende de PG + flags; sem SaaS obrigatório |
| **Pulse Cognitivo (RH)** | **Compatível** | Congelado CERT-PULSE-05; PG + event ingestion; IA opcional |
| **Conversation Context Engine** | **Compatível** | Flag `IMPETUS_CONVERSATION_CONTEXT_ENGINE`; não altera auth |
| **ANAM** | **Parcialmente compatível** | Requer internet + `ANAM_API_KEY`; degradável |
| **Gêmeo Digital** | **Compatível** | PG + APIs internas; sem cloud obrigatório |
| **Executive Boardroom** | **Compatível** | Default `off`; activação gradual |
| **Mapping** | **Compatível** | Capacidade transversal (OIE, PLC, ERP, SAML) |

---

## PARTE 8 — Serviços Externos (tabela completa)

| Serviço | Classificação | Substituível | Env | Internet | Offline |
|---------|---------------|--------------|-----|----------|---------|
| PostgreSQL | Obrigatório | Não (core) | Sim | Não | Sim |
| OpenAI | Opcional | Parcial (outro LLM) | Sim | Sim | Não |
| Anthropic/Claude | Opcional | Parcial | Sim | Sim | Não |
| Google Gemini | Opcional | Parcial | Sim | Sim | Não |
| ANAM | Opcional | D-ID/Akool/3D local | Sim | Sim | Não |
| D-ID | Opcional | Sim | Sim | Sim | Não |
| Akool | Opcional | Sim | Sim | Sim | Não |
| Google TTS | Opcional | TTS local/OpenAI | Sim | Sim | Não |
| ElevenLabs | Não usado em src | — | Em `.env` | — | — |
| SMTP | Opcional | Qualquer SMTP | Sim | Depende | Possível LAN |
| Asaas | Opcional (billing) | Outro PSP | Sim | Sim | Não |
| Stripe (Nexus) | Opcional | — | HTTP directo | Sim | Não |
| Licença IMPETUS | Preparado, OFF | Servidor próprio | Sim | Sim | Grace se OFF |
| Prometheus/Grafana | Opcional | Sim | Sim | Não | Sim |
| Let's Encrypt | Prod HTTPS | Cert manual | Nginx | Sim | Não (renovação) |
| Cloudflare | Opcional | — | `cloudflare-real-ip.conf` | Parcial | N/A |
| MQTT/Modbus/OPC-UA | Opcional OT | — | Sim | Não | Sim |
| Meta webhooks | Opcional | — | `META_APP_SECRET` | Sim | Não |
| AWS/GCP KMS | Opcional | HSM local | Sim | Parcial | Possível |

---

## PARTE 9 — Docker Readiness (sem criar Docker)

### O sistema está preparado?

**Parcialmente.** Compose existe só para observabilidade (`infra/observability/`) e lab industrial. **Aplicação principal não tem Dockerfile** — deploy assume PM2 + host Linux.

### Componentes que impedem containerização imediata

- Paths absolutos (`/var/www/impetus-completa`, `/root/.pm2/logs/`)  
- Uploads e `backend/data/` no filesystem host  
- Lipsync Python venv no host  
- Single-process schedulers (não cluster-aware)  
- `auditOutboxService` in-memory  

### Matriz de persistência

| Recurso | Persistir? | Local actual | Docker-ready? |
|---------|------------|--------------|---------------|
| **Config** | Sim | `backend/.env` | Sim (secrets mount) |
| **Uploads** | Sim | `uploads/`, `backend/uploads/` | Volume obrigatório |
| **Logs** | Sim | PM2 `/root/.pm2/logs/` | Volume ou sidecar |
| **Banco** | Sim | PostgreSQL externo | Container PG ou managed |
| **Backups** | Sim | `backend/backups/` | Volume |
| **Cache** | Mínimo | In-memory (license, rate limit) | Stateless OK |
| **Temp** | Sim | Multer temp por módulo | Volume efémero |
| **IA** | Não (stateless) | Chaves em env | Secrets; egress internet |

---

## PARTE 10 — Segurança

| Área | Estado | Evidência |
|------|--------|-----------|
| **Segredos no código** | Limpo em `src/` | Chaves via env; testes com valores fictícios |
| **JWT** | Robusto | HS256; 8h; `JWT_SECRET` validado; sessões em BD |
| **HTTPS** | Nginx + LE | Template `infra/nginx/impetus.conf` |
| **CORS** | Fail-closed prod | `ALLOWED_ORIGINS` obrigatório efectivo |
| **Helmet/CSP** | Activo | `unsafe-inline` (trade-off SPA) |
| **Rate limit** | Dupla camada | IP + utilizador; rotas pesadas |
| **Cookies** | Não usados para auth | JWT em `localStorage` |
| **Uploads** | ACL tenant | `secureStaticUploads.js`, auth em `GET /uploads` |

### Riscos de segurança identificados (sem alteração)

1. JWT em `localStorage` — superfície XSS  
2. `.env` produção com segredos em texto claro no host  
3. `IMPETUS_ADMIN_JWT_SECRET` pode estar em falta  
4. CSP `unsafe-inline`  
5. Licença preparada mas middleware arquivado — enforcement inconsistente com UI `LicenseExpired.jsx`

---

## PARTE 11 — Licenciamento

| Pergunta | Resposta |
|----------|----------|
| Sistema actual? | **Sim** — `backend/src/services/license.js` (validação remota HTTP) |
| Dependência financeira? | **Parcial** — Asaas/Stripe/Nexus para billing SaaS; licença produto separada |
| Dependência SaaS? | `LICENSE_SERVER_URL` default `https://licenca.impetus.com.br/api/validate` |
| Ponto preparado para licença? | **Sim** — vars `LICENSE_*`, `IMPETUS_LICENSE_KEY`; middleware em `_archived/middlewares/license.js` (**não montado**) |
| Enforcement activo? | **Não** — `LICENSE_VALIDATION_ENABLED=false` por defeito; serviço retorna `valid: true` se desligado |

---

## PARTE 12 — Classificação de prontidão

| Área | Status | Justificativa |
|------|--------|---------------|
| **Configuração** | 🟡 AMARELO | ~990 vars; fallbacks hardcoded; lacuna admin JWT |
| **Banco** | 🟢 VERDE | Migrations maduras; install documentado |
| **Docker** | 🔴 VERMELHO | Sem imagem app; paths host; PM2-only |
| **Multiempresa** | 🟢 VERDE | Modelo maduro; adequado a single-factory com 1 row |
| **Segurança** | 🟡 AMARELO | Boa base HTTP; JWT localStorage; secrets no host |
| **IA** | 🟡 AMARELO | Parametrizável mas cloud-dependent para full features |
| **Event Backbone** | 🟢 VERDE | PG soberano; defaults seguros |
| **Controller Cognitivo** | 🟢 VERDE | Interno; flags |
| **Pulse Cognitivo** | 🟢 VERDE | Congelado; PG-scoped |
| **ANAM** | 🟡 AMARELO | Requer SaaS externo |
| **Dashboard** | 🟢 VERDE | `company_id` integrado; governança modular |
| **Executive** | 🟢 VERDE | Feature-flag off por defeito |
| **Uploads** | 🟡 AMARELO | Duas raízes; precisa volume persistente |
| **Logs** | 🟡 AMARELO | PM2 paths absolutos; sem rotação documentada no repo |
| **Backups** | 🟡 AMARELO | `pg_dump` manual; sem restore automatizado |
| **Atualização** | 🟡 AMARELO | Migrations OK; sem pipeline container; PM2 restart |

---

## PARTE 13 — Riscos

### Arquiteturais

| Risco | Nível | Descrição |
|-------|-------|-----------|
| Confusão `impetus_complete/` vs `backend/` | **Alto** | Deploy no espelho legado |
| Single-instance schedulers/outbox | **Médio** | Escala horizontal não suportada |
| Duas raízes de uploads | **Médio** | Inconsistência em migração |

### Funcionais

| Risco | Nível | Descrição |
|-------|-------|-----------|
| Módulos IA sem internet | **Alto** | Degradação voz/chat/visão |
| Scripts seed órfãos | **Médio** | `npm run seed` falha |
| Backbone ON em prod vs shadow default | **Médio** | Comportamento inesperado em novo ambiente |

### Operacionais

| Risco | Nível | Descrição |
|-------|-------|-----------|
| Restore BD manual | **Alto** | DR lento |
| PM2 paths `/root/.pm2` | **Médio** | Não portável entre users |
| Prometheus scrape `:3333` | **Baixo** | Métricas desalinhadas |

### Segurança

| Risco | Nível | Descrição |
|-------|-------|-----------|
| Secrets em `.env` host | **Alto** | Exposição em backup/snapshot |
| JWT localStorage | **Médio** | XSS → session hijack |
| Admin JWT em falta | **Médio** | Arranque bloqueado ou insecure |

### Migração

| Risco | Nível | Descrição |
|-------|-------|-----------|
| IP/domínio hardcoded no build FE | **Alto** | `VITE_DID_SOURCE_URL` com IP |
| Billing SaaS activo | **Médio** | Asaas webhooks inúteis on-prem |
| Licença remota obrigatória se ON | **Crítico** | Air-gap bloqueado sem servidor licença local |

---

## PARTE 14 — Roadmap recomendado (NÃO IMPLEMENTAR)

```
CERT-ONPREM-FORENSICS-01  ← CONCLUÍDA (este laudo)
        ↓
CERT-ONPREM-ARCHITECTURE-01
        ↓
CERT-ONPREM-INFRA-01
        ↓
CERT-ONPREM-DATA-01
        ↓
CERT-LICENSE-01
        ↓
CERT-ONPREM-VALIDATION-01
```

| Certificação | Objetivo | Pré-requisito |
|--------------|----------|---------------|
| **FORENSICS-01** | Diagnóstico read-only completo | — |
| **ARCHITECTURE-01** | Desenho alvo on-prem: single-tenant lógico, desactivação portal SaaS, boundaries de módulos, ADRs | Aprovação FORENSICS-01 |
| **INFRA-01** | Runbook host: Nginx, PM2, secrets, paths, observabilidade, sem VPS lock-in | ARCHITECTURE-01 |
| **DATA-01** | DR: backup/restore automatizado, seeds, admin bootstrap, retention policy enforce | INFRA-01 |
| **LICENSE-01** | Modelo de licença on-prem (offline/air-gap, enforcement, grace period) | DATA-01 |
| **VALIDATION-01** | Smoke/E2E em ambiente limpo; regressão cognitiva; go-live checklist | LICENSE-01 |

**Nenhuma etapa posterior deve iniciar antes da conclusão e aprovação formal da anterior.**

---

## Critérios de aceite — verificação

| Critério | Estado |
|----------|--------|
| Nenhum arquivo alterado | ✅ Confirmado (auditoria read-only) |
| Arquitetura mapeada | ✅ |
| Dependências SaaS identificadas | ✅ |
| Riscos classificados | ✅ |
| Recomendações com evidência de código | ✅ |
| Diagramas, matrizes, prontidão, roadmap | ✅ |

---

## Conclusão executiva

O IMPETUS Comunica IA é uma **plataforma SaaS multi-tenant híbrida madura**, com isolamento por `company_id` consolidado em middleware, RBAC em camadas, Event Backbone soberano em PostgreSQL e ecossistema cognitivo extensivamente flaggado (shadow-first). A migração para **Enterprise On-Premise é viável para o núcleo industrial** (MES/OT + PostgreSQL + PM2/Nginx), preservando a arquitetura cognitiva **sem remover `company_id`** — basta operar com uma única empresa e desactivar billing/portal multi-tenant.

Os bloqueadores principais para on-prem **air-gapped completo** são: dependência de APIs IA cloud (OpenAI, Claude, Gemini, ANAM), ausência de containerização da app, restore BD manual, configurações hardcoded de domínio/IP no build frontend, e modelo de licenciamento remoto ainda não integrado ao runtime.

**Próximo passo recomendado:** aprovação deste laudo e início de **CERT-ONPREM-ARCHITECTURE-01** para definir o desenho alvo sem tocar no código até lá.