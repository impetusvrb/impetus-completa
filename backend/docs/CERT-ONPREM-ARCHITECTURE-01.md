# CERT-ONPREM-ARCHITECTURE-01 — Definição da Arquitetura Enterprise On-Premise

**Tipo:** Certificação Arquitetural  
**Prioridade:** Crítica  
**Pré-requisito:** CERT-ONPREM-FORENSICS-01 (aprovado)  
**Data:** 2026-06-30  
**Status:** CERTIFICADO — Contrato Arquitetural Oficial  
**Modo:** Documentação + ADRs (sem implementação)

---

## Declaração oficial

> Este documento constitui o **Contrato Arquitetural Oficial** da versão **IMPETUS Enterprise On-Premise**.  
> Toda implementação futura (INFRA, DATA, LICENSE, VALIDATION) **deve** conformar-se a este contrato.  
> Nenhuma implementação deve iniciar antes da **aprovação formal** desta certificação.

**Referências:**
- Laudo forense: CERT-ONPREM-FORENSICS-01 (sessão de auditoria 2026-06-30)
- ADRs: [`adrs/`](./adrs/) (9 registros formais)
- Contratos cognitivos preservados: `PULSE_ARCHITECTURE_CONTRACT.md`, `CERT-VOICE-01.md`, `CERT-PULSE-05.md`

---

## Princípios invioláveis

A arquitetura Enterprise On-Premise **preserva integralmente**:

| Componente | Status |
|------------|--------|
| Controller Cognitivo | Preservado |
| Pulse Cognitivo | Preservado (núcleo congelado CERT-PULSE-05) |
| Conversation Context Engine | Preservado |
| Event Backbone | Preservado (núcleo permanente) |
| Gêmeo Digital | Preservado |
| ANAM | Preservado (opcional / externo) |
| Dashboard Cognitivo | Preservado |
| Executive Boardroom | Preservado (feature-flag) |
| RBAC + Hierarquia | Preservados |
| Base Estrutural | Preservada |
| **CompanyId** | **Preservado como partição lógica** |
| Event Ingestion | Preservado |
| Contratos arquiteturais existentes | Preservados |

**Proibição:** remover componentes sem ADR e aprovação formal.

---

## PARTE 1 — Arquitetura-Alvo Enterprise

### Diagrama oficial

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTE (Browser / PWA)                         │
│  Rajdhani + Share Tech Mono │ JWT Bearer │ WebSocket (voz/avatar/realtime)  │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ HTTPS (443)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SERVIDOR ON-PREMISE (Host Linux)                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  REVERSE PROXY (Nginx)                                               │   │
│  │  TLS termination │ /api → backend │ / → frontend │ WS upgrade        │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  │                                           │
│  ┌───────────────────────────────▼─────────────────────────────────────┐   │
│  │  FRONTEND (SPA estático + serveDist.cjs)                             │   │
│  │  Vite build │ proxy API local │ feature flags VITE_*                 │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  │ HTTP/WS (127.0.0.1)                       │
│  ┌───────────────────────────────▼─────────────────────────────────────┐   │
│  │  BACKEND (Node.js 20 + Express + PM2)                                │   │
│  │  ┌─────────────┐ ┌──────────────┐ ┌─────────────────────────────┐  │   │
│  │  │ Auth/RBAC   │ │ Tenant Guard │ │ Módulos Operacionais        │  │   │
│  │  │ JWT+Sessions│ │ company_id   │ │ Quality/Safety/Logistics/…  │  │   │
│  │  └─────────────┘ └──────────────┘ └─────────────────────────────┘  │   │
│  │  ┌─────────────┐ ┌──────────────┐ ┌─────────────────────────────┐  │   │
│  │  │ Cognitivo   │ │ Event        │ │ Schedulers (setInterval/    │  │   │
│  │  │ Controller  │ │ Backbone     │ │ node-cron internos)         │  │   │
│  │  │ Pulse/CCE   │ │ Outbox PG    │ │                             │  │   │
│  │  └─────────────┘ └──────────────┘ └─────────────────────────────┘  │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  │                                           │
│  ┌───────────────────────────────▼─────────────────────────────────────┐   │
│  │  POSTGRESQL (instância dedicada ou co-localizada)                    │   │
│  │  Schema partilhado │ company_id em todas as tabelas operacionais    │   │
│  │  Migrations forward-only │ Event Outbox │ Sessions │ RBAC          │   │
│  └───────────────────────────────┬─────────────────────────────────────┘   │
│                                  │                                           │
│  ┌───────────────────────────────▼─────────────────────────────────────┐   │
│  │  VOLUMES PERSISTENTES (host filesystem — ADR-006)                   │   │
│  │  config/ │ uploads/ │ logs/ │ database/ │ backups/ │ temp/         │   │
│  │  certificates/ │ licenses/ │ backend/data/ (estado cognitivo JSON)  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PROCESS MANAGER (PM2) — impetus-backend + impetus-frontend        │   │
│  │  Opcional: lipsync-api (Wav2Lip) │ observability stack (Docker)    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ HTTPS egress (opcional, controlado)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              SERVIÇOS COGNITIVOS EXTERNOS (Opcionais — ADR-004)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ OpenAI   │ │ Claude   │ │ Gemini   │ │ ANAM     │ │ SMTP / TTS cloud │  │
│  │ Chat/TTS │ │ Painéis  │ │ Visão    │ │ Avatar   │ │ (substituível)   │  │
│  │ Realtime │ │          │ │ ManuIA   │ │ voz      │ │                  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              OT / INDUSTRIAL (Opcional — rede local da fábrica)              │
│  MQTT │ Modbus │ OPC-UA │ Edge Agent │ PLC adapters                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Explicação das camadas

| Camada | Responsabilidade | Notas Enterprise |
|--------|------------------|------------------|
| **Cliente** | UI Industrial 4.0; consome API e WebSockets | Mesmo frontend SaaS; flags desactivam billing/portal |
| **Servidor On-Premise** | Host Linux dedicado na rede do cliente | Sem dependência de VPS IMPETUS |
| **Nginx** | TLS, proxy, WS upgrade, rate limit perimetral opcional | Certificados em `certificates/` |
| **Frontend** | SPA + proxy local para backend | Build com `VITE_*` apontando para domínio local |
| **Backend** | Lógica de negócio, cognitivo, RBAC, Event Backbone | **Código idêntico** ao SaaS; capacidades SaaS **desactivadas** |
| **PostgreSQL** | Persistência soberana | Única dependência obrigatória de dados |
| **Volumes Persistentes** | Estado durável desacoplado do processo | Ver PARTE 5 |
| **Serviços Cognitivos Externos** | IA/voz/avatar quando licenciados e com egress | **Opcionais** — produto degrada graciosamente |
| **OT Industrial** | Conectores chão-de-fábrica | Nativos on-prem; sem cloud |

### O que muda em relação ao SaaS

A migração **não remove código**. Desactiva capacidades SaaS via configuração e distribuição:

- Uma instalação = uma empresa (`companies` com registo único activo)
- Portal IMPETUS Admin, billing, subscription governance: **desactivados**
- Licenciamento: **certificação própria** (CERT-LICENSE-01)
- Infraestrutura: host do cliente, não VPS IMPETUS

---

## PARTE 2 — Single-Tenant Lógico

### Definição formal

| Regra | Especificação |
|-------|---------------|
| **Instalação** | 1 instalação IMPETUS Enterprise = 1 empresa |
| **CompanyId** | Permanece **obrigatório** em JWT, middleware, queries, Event Backbone, Pulse |
| **Registo `companies`** | Exactamente **1 registo activo** por instalação (criado no setup inicial) |
| **Schema multi-tenant** | **100% preservado** — colunas, guards, RLS registry, particionamento JSON |
| **Portal multi-empresa** | **Desactivado** na distribuição Enterprise (não removido do código) |

### Por que manter CompanyId?

1. **Contratos congelados:** Pulse (`eventIngestion.ingestHumanEvent(companyId, …)`), Event Backbone (outbox/throttle/archive por tenant), Controller Cognitivo, Gêmeo Digital e domínios operacionais assumem `company_id`.
2. **Zero reengenharia de schema:** ~128 migrations e dezenas de serviços permanecem válidos.
3. **RLS enterprise:** Políticas PostgreSQL preparadas por `company_id` continuam aplicáveis se activadas.
4. **Estado cognitivo JSON:** Particionado em `backend/data/<uuid>/` — o UUID é o `companies.id`.
5. **Roadmap futuro:** Holding multi-fábrica (N empresas numa instalação) permanece possível **sem refactor** — apenas política de distribuição.

### Benefícios futuros

- Expansão para multi-site dentro da mesma instalação (múltiplos `companies.id`) sem fork de código
- Testes de isolamento e RLS reutilizam infra existente
- Paridade total SaaS ↔ Enterprise — mesmo binário, mesmas migrations

### Regressões evitadas

| Regressão | Impacto evitado |
|-----------|-----------------|
| Remover `company_id` das queries | IDOR, data leakage cross-fábrica |
| Refactor Pulse/Event Backbone | Quebra CERT-PULSE-05 e contratos de ingestão |
| Simplificar RBAC para single-user | Perda de hierarquia, cargos estruturais, governança modular |
| Unificar `tenantId`/`companyId` | Spoofing, inconsistência JWT vs handlers |

**ADR:** [`adrs/ADR-001-preservacao-company-id.md`](./adrs/ADR-001-preservacao-company-id.md), [`adrs/ADR-002-single-tenant-logico.md`](./adrs/ADR-002-single-tenant-logico.md)

---

## PARTE 3 — Componentes SaaS (classificação arquitectural)

| Componente | Decisão Enterprise | Justificativa |
|------------|-------------------|---------------|
| **Portal SaaS (onboarding público multi-empresa)** | **Desactivado** | `POST /api/companies` público; substituído por setup controlado local |
| **Billing (cobrança recorrente)** | **Desactivado** | Asaas/Stripe; sem receita SaaS on-prem |
| **Subscription (subscrição/governance cron)** | **Desactivado** | `ENABLE_SUBSCRIPTION_GOVERNANCE_CRON=false`; `requireCompanyActive` billing bypass via flag |
| **Asaas** | **Desactivado** | Webhook `/api/webhooks/asaas`; vars `ASAAS_*` vazias |
| **Stripe (Nexus Wallet)** | **Desactivado** | Rotas nexus-wallet; sem cobrança por token |
| **Nexus Billing (token billing cron)** | **Desactivado** | `ENABLE_NEXUS_TOKEN_BILLING_CRON=false` |
| **Portal IMPETUS Admin** | **Removido da distribuição** | Rotas `/api/impetus-admin`, `/api/admin-portal` não expostas; JWT admin não configurado |
| **Administração Global (cross-tenant)** | **Removido da distribuição** | CRUD multi-empresa; equipa IMPETUS não opera instalação cliente |
| **Licenciamento remoto SaaS** | **Opcional / certificação própria** | Tratado em CERT-LICENSE-01; desacoplado (ADR-009) |
| **Onboarding self-service** | **Desactivado** | Fluxo substituído por `install-industrial.sh` + `/setup-empresa` |
| **Observabilidade IMPETUS centralizada** | **Opcional** | Prometheus/Grafana local do cliente |
| **Multi-tenant RLS piloto** | **Opcional** | Activável; irrelevante com 1 company activa |
| **Federation SSO/SCIM** | **Opcional** | Útil em enterprise; requer IdP cliente |
| **Industrial Lab / enrichment sintético** | **Desactivado** | Flags `IMPETUS_INDUSTRIAL_LAB_ENABLED=false` |

### Legenda de decisões

- **Desactivado:** código permanece; flags/env impedem execução; rotas podem retornar 404/403 via nginx ou middleware
- **Removido da distribuição:** não incluído no runbook, nginx, seeds ou documentação de instalação Enterprise; código permanece no repositório
- **Opcional:** activável pelo cliente se necessário
- **Mantido:** core operacional e cognitivo

**ADR:** [`adrs/ADR-003-separacao-saas-enterprise.md`](./adrs/ADR-003-separacao-saas-enterprise.md)

---

## PARTE 4 — Serviços Cognitivos

| Serviço | Categoria | On-Prem | Offline | Cloud | Notas |
|---------|-----------|---------|---------|-------|-------|
| **ANAM** | Externo, Opcional | Sim (com egress) | Não | Sim | Avatar/voz primário; degradável |
| **OpenAI** | Externo, Opcional | Sim (com egress) | Não | Sim | Chat, TTS, Whisper, Realtime proxy |
| **Claude (Anthropic)** | Externo, Opcional | Sim (com egress) | Não | Sim | Painéis, visão, council |
| **Gemini (Google)** | Externo, Opcional | Sim (com egress) | Não | Sim | Visão ManuIA; Vertex opcional |
| **Google TTS** | Externo, Opcional | Sim | Parcial | Sim | Substituível por OpenAI TTS ou local |
| **D-ID / Akool** | Externo, Opcional | Sim | Não | Sim | Alternativas avatar |
| **SMTP** | Externo, Substituível | Sim | Parcial | Parcial | SMTP local/LAN possível |
| **PostgreSQL** | Interno, Obrigatório | Sim | Sim | Não | Núcleo de dados |
| **Event Backbone** | Interno, Obrigatório | Sim | Sim | Não | Outbox PostgreSQL |
| **Prometheus** | Externo, Opcional | Sim | Sim | Não | Stack local Docker opcional |
| **Grafana** | Externo, Opcional | Sim | Sim | Não | Acompanha Prometheus |
| **MQTT** | Externo OT, Opcional | Sim | Sim | Não | Broker local (Mosquitto) |
| **OPC-UA** | Externo OT, Opcional | Sim | Sim | Não | PLCs rede local |
| **Modbus** | Externo OT, Opcional | Sim | Sim | Não | TCP/RTU local |
| **Lipsync (Wav2Lip)** | Interno, Opcional | Sim | Sim | Não | Processo PM2 Python local |
| **Controller Cognitivo** | Interno, Mantido | Sim | Sim* | Não | *LLM externo se council activo |
| **Pulse Cognitivo** | Interno, Mantido | Sim | Sim | Não | Núcleo congelado |
| **Conversation Context Engine** | Interno, Mantido | Sim | Sim | Não | |
| **Gêmeo Digital** | Interno, Mantido | Sim | Sim | Não | PG + JSON local |

### Política oficial

> IMPETUS Enterprise On-Premise **não é um produto offline**.  
> É um produto **auto-hospedável** com **serviços cognitivos externos opcionais**.  
> Sem chaves API, módulos IA/voz/avatar **degradam graciosamente**; núcleo operacional permanece funcional.

**ADR:** [`adrs/ADR-004-servicos-cognitivos-externos-opcionais.md`](./adrs/ADR-004-servicos-cognitivos-externos-opcionais.md)

---

## PARTE 5 — Estrutura de Persistência

### Layout oficial (host filesystem)

```
/opt/impetus/                          # Raiz de instalação (configurável IMPETUS_HOME)
├── config/                            # Configuração (secrets, env, feature flags)
│   ├── .env                           # Variáveis runtime (nunca no repositório)
│   ├── .env.production                # Template aplicado
│   └── nginx/                         # Snippets site-specific
├── uploads/                           # Ficheiros utilizador (documentos, media, anexos)
├── logs/                              # Logs applicação + PM2 + nginx
│   ├── backend/
│   ├── frontend/
│   └── nginx/
├── database/                          # Dados PostgreSQL (data directory PG)
│   └── pgdata/                        # Se PG co-localizado
├── backups/                           # pg_dump, snapshots config, export JSON
│   ├── db/
│   └── config/
├── temp/                              # Multer temp, processamento, cache efémero
├── certificates/                      # TLS (fullchain, privkey, CA interna)
├── licenses/                          # Artefactos licença offline (CERT-LICENSE-01)
├── data/                              # Estado cognitivo JSON por company_id
│   └── <company-uuid>/
│       ├── operational-context/
│       └── governance-learning/
└── app/                               # Código deployado (git tag / release tarball)
    ├── backend/
    └── frontend/dist/
```

### Responsabilidades

| Diretório | Conteúdo | Backup | Retenção |
|-----------|----------|--------|----------|
| `config/` | `.env`, flags, nginx site | **Sim** (encriptado) | Permanente |
| `uploads/` | Documentos, imagens, anexos operacionais | **Sim** | Política cliente |
| `logs/` | PM2, nginx, audit append | Opcional | Rotação (ex. 90d) |
| `database/` | Cluster PostgreSQL | **Sim** (pg_dump + WAL se configurado) | Permanente |
| `backups/` | Dumps agendados | Replicar off-host | Política cliente |
| `temp/` | Uploads parciais, conversão | Não | Limpeza automática |
| `certificates/` | TLS + CA | **Sim** | Até renovação |
| `licenses/` | Ficheiros licença offline | **Sim** | Vigência contrato |
| `data/` | JSON cognitivo por tenant | **Sim** | Permanente |

**Mapeamento actual → alvo:** `backend/uploads` + `uploads/` → `uploads/`; `backend/data/` → `data/`; `backend/.env` → `config/.env`; PM2 logs → `logs/`.

**ADR:** [`adrs/ADR-006-persistencia-desacoplada.md`](./adrs/ADR-006-persistencia-desacoplada.md)

---

## PARTE 6 — Arquitetura de Atualização

### Princípio

Atualizações Enterprise são **substituição de código** (`app/`) preservando **todos os volumes persistentes**.

### Fluxo oficial (definição — implementação em INFRA/DATA)

```
1. PRÉ-UPDATE
   ├── Verificar versão actual (build-meta.json)
   ├── Backup: database/ + uploads/ + config/ + data/ + licenses/
   └── Modo manutenção (nginx 503 ou flag)

2. UPDATE
   ├── Parar PM2 (backend → frontend)
   ├── Substituir app/backend + app/frontend/dist (release tag)
   ├── npm ci --production (backend)
   └── Executar migrations forward-only (run-all-migrations.js)

3. PÓS-UPDATE
   ├── Validar config (configValidator.js)
   ├── Reiniciar PM2
   ├── Smoke test (smoke-clean-install.js adaptado)
   └── Desactivar manutenção

4. ROLLBACK (se falha)
   ├── Restaurar app/ da versão anterior
   ├── Restaurar backup BD se migration aplicada
   └── Reiniciar PM2
```

### Preservação por artefacto

| Artefacto | Preservado em update? | Mecanismo |
|-----------|----------------------|-----------|
| **Banco** | Sim | Migrations forward-only; nunca DROP destrutivo automático |
| **Uploads** | Sim | Volume externo ao `app/` |
| **Logs** | Sim | Append-only; não sobrescritos |
| **Licença** | Sim | `licenses/` independente de versão código |
| **Configuração** | Sim | `config/.env` merge manual de novas vars |
| **Backups** | Sim | Directório separado |
| **Estado cognitivo JSON** | Sim | `data/<company-uuid>/` |

**ADR:** [`adrs/ADR-007-atualizacoes-sem-perda-dados.md`](./adrs/ADR-007-atualizacoes-sem-perda-dados.md)

---

## PARTE 7 — Arquitetura de Segurança Enterprise

| Elemento | Localização | Política Enterprise |
|----------|-------------|---------------------|
| **Segredos** | `config/.env` (0600, user impetus) | Nunca no repositório; rotação periódica |
| **JWT_SECRET** | `config/.env` | Obrigatório; ≥32 chars recomendado |
| **IMPETUS_ADMIN_JWT_SECRET** | Não configurado | Portal admin desactivado |
| **Certificados TLS** | `certificates/` | Let's Encrypt ou CA interna |
| **HTTPS** | Nginx termination | Obrigatório; HSTS recomendado |
| **JWT (auth)** | Header Bearer; sessões PG | 8h; HS256; sem cookie httpOnly (preservado) |
| **Firewall** | Host + rede fábrica | 443 público; 4000/5432 apenas localhost |
| **Rate Limit** | Express middleware | Preservado; ajustável por env |
| **CORS** | `ALLOWED_ORIGINS` = domínio local | Fail-closed em produção |
| **Helmet/CSP** | Backend | Preservado; `CSP_CONNECT_SRC_EXTRA` para APIs IA |
| **Volumes** | Permissões 0750/0640 | User dedicado `impetus` |
| **Licença** | `licenses/` + env | Desacoplada (CERT-LICENSE-01) |
| **Uploads ACL** | Middleware tenant | Preservado; auth em GET |
| **Egress IA** | Firewall outbound | Whitelist domínios API se política restritiva |

---

## PARTE 8 — ADRs (índice)

| ADR | Título | Ficheiro |
|-----|--------|----------|
| ADR-001 | Preservação do CompanyId | [`adrs/ADR-001-preservacao-company-id.md`](./adrs/ADR-001-preservacao-company-id.md) |
| ADR-002 | Single-Tenant Lógico | [`adrs/ADR-002-single-tenant-logico.md`](./adrs/ADR-002-single-tenant-logico.md) |
| ADR-003 | Separação Plataforma SaaS vs Distribuição Enterprise | [`adrs/ADR-003-separacao-saas-enterprise.md`](./adrs/ADR-003-separacao-saas-enterprise.md) |
| ADR-004 | Serviços Cognitivos Externos Opcionais | [`adrs/ADR-004-servicos-cognitivos-externos-opcionais.md`](./adrs/ADR-004-servicos-cognitivos-externos-opcionais.md) |
| ADR-005 | Event Backbone como Núcleo Permanente | [`adrs/ADR-005-event-backbone-nucleo-permanente.md`](./adrs/ADR-005-event-backbone-nucleo-permanente.md) |
| ADR-006 | Persistência Desacoplada do Container/Processo | [`adrs/ADR-006-persistencia-desacoplada.md`](./adrs/ADR-006-persistencia-desacoplada.md) |
| ADR-007 | Atualizações sem Perda de Dados | [`adrs/ADR-007-atualizacoes-sem-perda-dados.md`](./adrs/ADR-007-atualizacoes-sem-perda-dados.md) |
| ADR-008 | CompanyId como Partição Lógica | [`adrs/ADR-008-company-id-particao-logica.md`](./adrs/ADR-008-company-id-particao-logica.md) |
| ADR-009 | Licenciamento Desacoplado da Arquitetura Principal | [`adrs/ADR-009-licenciamento-desacoplado.md`](./adrs/ADR-009-licenciamento-desacoplado.md) |

---

## PARTE 9 — Matriz de Compatibilidade

| Módulo | Compatível | Requer alteração | Observações |
|--------|:----------:|:----------------:|-------------|
| Controller Cognitivo | ✅ | Config only | Preservado; council pode precisar API keys |
| Pulse Cognitivo (RH) | ✅ | Config only | Núcleo congelado CERT-PULSE-05 |
| Pulse Operacional (UI) | ✅ | Não | Dashboard cognitive-pulse |
| Conversation Context Engine | ✅ | Config only | Flag default on |
| Event Backbone | ✅ | Config only | Defaults shadow; revisar flags prod |
| Gêmeo Digital | ✅ | Não | PG + APIs internas |
| ANAM | ✅ | Config only | Requer egress + ANAM_API_KEY |
| Dashboard Cognitivo | ✅ | Não | moduleAccessGovernanceEngine |
| Executive Boardroom | ✅ | Config only | Flag off default |
| RBAC / Hierarquia | ✅ | Não | company_roles, tenant_admins |
| Base Estrutural | ✅ | Não | /setup-empresa, admin/structural |
| Auth / Sessions | ✅ | Config only | JWT + PG sessions |
| Chat / IA Central | ✅ | Config only | Degrada sem OpenAI/Claude |
| ManuIA | ✅ | Config only | Gemini opcional visão |
| Qualidade | ✅ | Não | Domínio quality/ |
| SST (Safety) | ✅ | Não | Domínio safety/ |
| Ambiente | ✅ | Não | Domínio environment/ |
| Logística | ✅ | Não | Domínio logistics/ |
| MES / Produção | ✅ | Não | /api/mes |
| TPM | ✅ | Não | /api/tpm |
| Pró-Ação | ✅ | Não | company_id scoped |
| Workflow Engine | ✅ | Não | /api/workflow-engine |
| Comunicações | ✅ | Não | /api/communications |
| AIOI / IOE | ✅ | Config only | Outbox PG soberano |
| Mapping (OIE/PLC/ERP) | ✅ | Não | Transversal |
| Federation SSO/SCIM | ✅ | Opcional | IdP cliente |
| RLS Enterprise | ✅ | Opcional | Piloto; 1 company activa |
| Portal IMPETUS Admin | ⚠️ | Desactivar | Removido da distribuição |
| Billing / Asaas | ⚠️ | Desactivar | Flags + nginx |
| Stripe / Nexus Wallet | ⚠️ | Desactivar | Sem cobrança token |
| Subscription Governance | ⚠️ | Desactivar | Cron off |
| Onboarding público | ⚠️ | Desactivar | Setup controlado |
| Licenciamento remoto | ✅ | CERT-LICENSE-01 | Modo `remote` preservado; offline `local` |
| Observabilidade central IMPETUS | ⚠️ | Opcional | Stack local |
| Industrial Lab | ⚠️ | Desactivar | Flag off |
| Docker (app) | ❌ | INFRA-01 | Fora de scope; PM2 first |

**Legenda:** ✅ Compatível sem código | ⚠️ Compatível com desactivação/config | ❌ Requer certificação posterior

---

## PARTE 10 — Roadmap Validado

```
CERT-ONPREM-FORENSICS-01     ✅ Concluída (laudo forense)
        ↓ aprovação
CERT-ONPREM-ARCHITECTURE-01  ✅ Concluída (este contrato)
        ↓
CERT-ONPREM-INFRA-01         ✅ Runbook host, nginx, PM2, paths, secrets
        ↓
CERT-ONPREM-DATA-01          ✅ Backup/restore, seeds, bootstrap admin, DR
        ↓
CERT-LICENSE-01              ✅ Modelo licença on-prem / offline / grace
        ↓
CERT-ONPREM-CONTAINER-01     ✅ Empacotamento Docker oficial
        ↓
CERT-ONPREM-VALIDATION-01    ⏳ Homologação Oficial — **NÃO HOMOLOGADA** (Go-Live proibido)
```

### Objetivos das próximas certificações

| Certificação | Entregável | Não inclui |
|--------------|------------|------------|
| **INFRA-01** | Runbook instalação, layout `/opt/impetus/`, nginx, PM2, firewall | Docker app, alteração código |
| **DATA-01** | Scripts backup/restore, bootstrap admin fábrica, seed único company | Migrations novas |
| **LICENSE-01** | Enforcement, offline, grace period, integração ou substituição middleware | Billing SaaS |
| **CONTAINER-01** | Dockerfile, compose, volumes IMPETUS_HOME | Alteração runtime cognitivo |
| **VALIDATION-01** | Checklist go-live, homologação final Enterprise | Features novas |

**Declaração:** Nenhuma implementação (código, infra, Docker, licença) deve ocorrer antes da **aprovação formal** desta certificação ARCHITECTURE-01.

---

## Critérios de aceite

| Critério | Estado |
|----------|--------|
| Nenhum código-fonte alterado | ✅ |
| Nenhuma migration criada | ✅ |
| Nenhuma configuração modificada | ✅ |
| Nenhum Dockerfile criado | ✅ |
| Nenhuma API alterada | ✅ |
| ADRs documentados (9) | ✅ |
| Diagrama arquitectura completo | ✅ |
| Single-Tenant lógico formalizado | ✅ |
| Separação SaaS / Enterprise definida | ✅ |
| Roadmap validado | ✅ |

---

## Assinatura de certificação

**Certificação:** CERT-ONPREM-ARCHITECTURE-01  
**Resultado:** Contrato Arquitetural Oficial Enterprise On-Premise **APROVADO PARA REFERÊNCIA**  
**Próximo passo:** Aprovação stakeholders → iniciar CERT-ONPREM-INFRA-01
