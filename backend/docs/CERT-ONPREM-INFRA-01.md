# CERT-ONPREM-INFRA-01 — Contrato Oficial da Infraestrutura Enterprise

**Tipo:** Certificação Arquitetural de Infraestrutura  
**Prioridade:** Crítica  
**Pré-requisitos:** CERT-ONPREM-FORENSICS-01 ✅ · CERT-ONPREM-ARCHITECTURE-01 ✅  
**Data:** 2026-06-30  
**Status:** CERTIFICADO — Contrato Oficial de Infraestrutura Enterprise  
**Modo:** Documentação + ADRs (sem implementação)

---

## Declaração oficial

> Este documento constitui o **Contrato Oficial da Infraestrutura Enterprise** do IMPETUS.  
> Define padrões únicos independentes do método de implantação (**PM2 hoje**, **Docker futuro**).  
> Serve de base para: DATA-01, LICENSE-01, CONTAINER-01, VALIDATION-01.

**Referências:**
- Contrato arquitetural: [`CERT-ONPREM-ARCHITECTURE-01.md`](./CERT-ONPREM-ARCHITECTURE-01.md)
- ADRs infra: [`adrs/ADR-010`](./adrs/ADR-010-infraestrutura-enterprise.md) … [`ADR-019`](./adrs/ADR-019-recovery-dr.md)

**Proibições desta certificação:** alterar código, banco, migrations, PM2, Nginx, APIs, Dockerfiles, docker-compose, Event Backbone, módulos cognitivos, licenciamento.

---

# PARTE 1 — Auditoria da Infraestrutura Atual (READ ONLY)

## 1.1 Mapa do estado actual (produção canónica)

```
/var/www/impetus-completa/                    ← Raiz repo (VPS actual)
├── ecosystem.config.js                       ← PM2 produção (paths /root/.pm2/logs)
├── backend/
│   ├── .env                                  ← Config activa (~990 vars)
│   ├── src/server.js                         ← Express :4000, graceful shutdown
│   ├── uploads/                              ← Uploads candidato #1
│   ├── data/<company-uuid>/                  ← Estado cognitivo JSON
│   ├── backups/*.sql                         ← pg_dump manual
│   └── scripts/ops/install-industrial.sh     ← Instalação industrial
├── frontend/
│   ├── dist/                                 ← Build SPA
│   ├── serveDist.cjs                         ← Proxy :3000 → :4000
│   └── .env.production                       ← VITE_* build-time
├── uploads/                                  ← Uploads candidato #2 (raiz repo)
├── infra/nginx/impetus.conf                  ← Template nginx
├── infra/observability/docker-compose.yml    ← Prometheus/Grafana (opcional)
├── lipsync/                                  ← Wav2Lip Python (:5001, PM2 separado)
└── /etc/nginx/sites-available/impetus        ← Nginx produção (host)
    /root/.pm2/logs/                          ← Logs PM2 (user root)
    PostgreSQL externo/co-local               ← Via DATABASE_URL / DB_*
```

## 1.2 Componentes auditados

| Componente | Estado actual | Path / Porta | Dependência host |
|------------|---------------|--------------|------------------|
| **Backend** | PM2 `impetus-backend` | `127.0.0.1:4000` | Node 20, `backend/.env` |
| **Frontend** | PM2 `impetus-frontend` | `127.0.0.1:3000` | `serveDist.cjs`, `dist/` |
| **PM2** | 2 apps fork, user root | `/root/.pm2/logs/` | root, paths absolutos logs |
| **Nginx** | Reverse proxy TLS | `:443` → :3000/:4000 | `/etc/nginx`, Let's Encrypt |
| **PostgreSQL** | Externo/co-local | `DB_*` / `DATABASE_URL` | Serviço sistema ou remoto |
| **Uploads** | Duas raízes | `backend/uploads`, `/uploads` | `paths.js` resolve ambas |
| **Logs** | PM2 + nginx | `/root/.pm2/logs/`, `/var/log/nginx/` | root |
| **Backups** | Manual | `backend/backups/pre_manuia_*.sql` | `pg_dump`, script único |
| **Estado cognitivo** | JSON por tenant | `backend/data/<uuid>/` | Disco host |
| **Certificados** | Let's Encrypt | `/etc/letsencrypt/live/<domínio>/` | Certbot, DNS |
| **Scripts** | install-industrial, smoke, migrate | `backend/scripts/` | bash, node, curl |

## 1.3 Dependências identificadas

| Tipo | Dependência | Evidência | Impacto Enterprise |
|------|-------------|-----------|-------------------|
| **Path absoluto** | `/var/www/impetus-completa` | `ecosystem.lipsync.config.cjs`, install script | Substituir por `IMPETUS_HOME` |
| **User root** | PM2 logs em `/root/.pm2/` | `ecosystem.config.js` L34-35, L63-64 | User dedicado `impetus` |
| **VPS** | `FRONTEND_URL`, `ALLOWED_ORIGINS` hostinger | `.env` produção | Parametrizar domínio cliente |
| **PM2** | Deploy canónico | `INSTALACAO_INDUSTRIAL.md` | Standard profile; Container futuro |
| **Diretórios dispersos** | `.env` em `backend/`, data em `backend/data/` | Estado actual | Consolidar em `IMPETUS_HOME` |
| **IP hardcoded FE** | `VITE_DID_SOURCE_URL` | `frontend/.env.production` | Domínio HTTPS local |
| **Prometheus scrape** | `:3333` vs backend `:4000` | `prometheus.yml` | Alinhar em INFRA ops |

## 1.4 Variáveis e scripts existentes

- Catálogo completo documentado: `deploy_backups/20260601_2259/.env.example` (~615 linhas)
- Validador arranque: `backend/src/config/configValidator.js`
- Instalação: `backend/scripts/ops/install-industrial.sh`
- Backup BD: `backend/scripts/ops/backup-db-before-manuia.sh`
- Smoke: `backend/scripts/ops/smoke-clean-install.js`
- Migrations: `backend/scripts/run-all-migrations.js`

**Nada foi alterado durante esta auditoria.**

---

# PARTE 2 — Arquitetura Oficial da Infraestrutura Enterprise

## Diagrama oficial

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  CLIENTE (Browser / PWA / Tablet chão-de-fábrica)                            │
│  HTTPS │ WebSocket │ JWT Bearer │ Design System Industrial 4.0               │
└────────────────────────────────────┬─────────────────────────────────────────┘
                                     │ :443 TLS
                                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  REVERSE PROXY (Nginx)                                                       │
│  TLS termination │ rate limit │ /api,/uploads,/health → backend              │
│  /socket.io, /impetus-realtime → backend WS │ /* → frontend                  │
│  Block Enterprise: /api/impetus-admin, /api/admin-portal, webhooks billing   │
└────────────────────────────────────┬─────────────────────────────────────────┘
                                     │
              ┌──────────────────────┴──────────────────────┐
              ▼                                              ▼
┌─────────────────────────────┐              ┌─────────────────────────────┐
│  FRONTEND (serveDist.cjs)   │              │  BACKEND (Express + PM2)    │
│  SPA estático dist/         │   proxy      │  :4000 LISTEN_HOST=127.0.0.1│
│  :3000 loopback             │◄────────────►│  Schedulers │ Socket.IO     │
│  VITE build-time config     │              │  Event Backbone │ Cognitivo │
└─────────────────────────────┘              └──────────────┬──────────────┘
                                                            │
                                                            ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│  POSTGRESQL 14+                                                              │
│  Schema + migrations │ sessions │ outbox │ Pulse │ RBAC │ company_id        │
└────────────────────────────────────┬─────────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼─────────────────────────────────────────┐
│  IMPETUS_HOME — VOLUMES PERSISTENTES                                         │
│  config/ │ app/ │ uploads/ │ data/ │ database/ │ backups/ │ licenses/       │
│  certificates/ │ logs/ │ temp/ │ scripts/ │ monitoring/ │ runtime/          │
└────────────────────────────────────┬─────────────────────────────────────────┘
              ┌──────────────────────┼──────────────────────┐
              ▼                      ▼                      ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────────┐
│  BACKUPS            │  │  LOGS               │  │  ESTADO COGNITIVO       │
│  pg_dump schedule   │  │  rotação 90d        │  │  data/<company_id>/     │
│  config snapshot    │  │  PM2 + nginx + app  │  │  JSON runtime           │
└─────────────────────┘  └─────────────────────┘  └─────────────────────────┘
              │
              ▼
┌─────────────────────┐  ┌─────────────────────────────────────────────────────┐
│  LICENCIAMENTO      │  │  SERVIÇOS IA EXTERNOS (opcionais — egress HTTPS)    │
│  licenses/ (CERT-   │  │  OpenAI │ Claude │ Gemini │ ANAM │ SMTP           │
│  LICENSE-01)        │  └─────────────────────────────────────────────────────┘
└─────────────────────┘
              │
              ▼ (rede OT local)
┌──────────────────────────────────────────────────────────────────────────────┐
│  MQTT │ Modbus │ OPC-UA │ Edge Agent (opcional)                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Explicação das camadas

| Camada | Função | Enterprise |
|--------|--------|------------|
| **Cliente** | UI; token localStorage; WS voz/avatar | Mesmo frontend; build com domínio local |
| **HTTPS** | TLS 1.2+; cert em `certificates/` | LE ou CA interna |
| **Reverse Proxy** | Único ponto exposto; WS upgrade | Block rotas SaaS |
| **Frontend** | SPA + proxy API/WS/uploads | Processo PM2 ou container futuro |
| **Backend** | API, cognitivo, schedulers | Loopback only; PM2 fork |
| **PostgreSQL** | Soberano; única BD obrigatória | Co-local ou dedicado |
| **Volumes** | `IMPETUS_HOME`; sobrevivem updates | Contrato CONTAINER-01 mapeia volumes |
| **Backups** | RPO/RTO definidos Parte 9 | DATA-01 implementa scripts |
| **Logs** | Observabilidade operacional | Rotação + retenção |
| **Estado cognitivo** | JSON por `company_id` | Backup obrigatório |
| **Licenciamento** | Periférico; LICENSE-01 | `licenses/` |
| **IA externa** | Opcional; degradável | Firewall egress whitelist |

---

# PARTE 3 — IMPETUS_HOME (formalização oficial)

## Definição

```bash
IMPETUS_HOME=/opt/impetus          # Default oficial; override permitido
```

Toda instalação Enterprise **deve** mapear paths persistentes relativos a `IMPETUS_HOME`. O código actual usa paths legados; **INFRA ops** (post-certificação) redirecciona via env (`UPLOADS_DIR`, symlinks, ou vars futuras `IMPETUS_DATA_DIR`).

## Estrutura definitiva

```
${IMPETUS_HOME}/
├── config/           # .env, nginx site, feature flags export
├── app/              # Código deployado (backend + frontend/dist) — EFÉMERO relativo a dados
├── uploads/          # Ficheiros utilizador (documentos, media, anexos)
├── logs/             # backend/, frontend/, nginx/, audit/
├── database/         # pgdata/ se PostgreSQL co-localizado
├── backups/          # db/, config/, data/ snapshots
├── licenses/         # Artefactos licença (LICENSE-01)
├── certificates/     # TLS fullchain, privkey, CA
├── data/             # Estado cognitivo JSON (<company_id>/)
├── temp/             # Multer, conversões, cache efémero
├── scripts/          # install, backup, restore, smoke (DATA-01)
├── monitoring/       # prometheus.yml, grafana provisioning (opcional)
└── runtime/          # PID files, locks, sockets (opcional)
```

## Matriz de persistência IMPETUS_HOME

| Pasta | Backup | Sobrevive update | Temporária | Permissões |
|-------|:------:|:----------------:|:----------:|------------|
| `config/` | **Sim** | Sim | Não | 0750, `.env` 0600 |
| `app/` | Não | Substituída | Sim* | 0755 |
| `uploads/` | **Sim** | Sim | Não | 0750 |
| `logs/` | Opcional | Sim (append) | Parcial | 0750 |
| `database/` | **Sim** | Sim | Não | 0700 postgres |
| `backups/` | Replicar off-site | Sim | Não | 0750 |
| `licenses/` | **Sim** | Sim | Não | 0640 |
| `certificates/` | **Sim** | Sim | Não | 0640 |
| `data/` | **Sim** | Sim | Não | 0750 |
| `temp/` | Não | Não | **Sim** | 0770 |
| `scripts/` | Opcional | Substituível | Não | 0755 |
| `monitoring/` | Opcional | Sim | Não | 0755 |
| `runtime/` | Não | Não | **Sim** | 0755 |

\* `app/` é substituída a cada release; dados nunca dentro de `app/`.

**ADR:** [`ADR-011-impetus-home.md`](./adrs/ADR-011-impetus-home.md)

---

# PARTE 4 — Perfis Oficiais de Instalação

## 4.1 Enterprise Standard

| Aspecto | Especificação |
|---------|---------------|
| **Host** | Linux (Ubuntu 22.04+ / RHEL 8+ recomendado) |
| **Runtime** | PM2 fork (backend + frontend) |
| **Proxy** | Nginx TLS |
| **BD** | PostgreSQL 14+ dedicado ou co-local |
| **User** | `impetus` (não root) |
| **Rede** | Egress HTTPS para IA (opcional); OT LAN |
| **Referência** | Evolução de `install-industrial.sh` → DATA-01 |

## 4.2 Enterprise Container

| Aspecto | Especificação |
|---------|---------------|
| **Arquitectura** | Idêntica ao Standard |
| **Runtime** | Containers (CERT-ONPREM-CONTAINER-01) |
| **Volumes** | Mapeamento 1:1 de `IMPETUS_HOME` |
| **Networks** | `impetus-front`, `impetus-data`, `impetus-obs` |
| **Esta certificação** | **Apenas contrato** — sem Dockerfile |

Contratos para CONTAINER-01:
- Imagem app = conteúdo de `app/` only
- Volumes named: `impetus-config`, `impetus-uploads`, `impetus-data`, etc.
- Healthcheck: `GET http://backend:4000/health`
- PM2 substituído por process supervisor container (tini + node)

## 4.3 Enterprise Air-Gapped

| Aspecto | Especificação |
|---------|---------------|
| **Internet** | Sem egress obrigatório |
| **IA cloud** | Desactivada (sem API keys) |
| **Degradação** | Chat/voz/avatar offline; core operacional OK |
| **SMTP** | Servidor LAN ou desactivado |
| **Licença** | Offline em `licenses/` (LICENSE-01) |
| **Updates** | Mídia física / rede interna |
| **Código** | **Inalterado** — flags env only |

**ADR:** [`ADR-012-perfis-instalacao.md`](./adrs/ADR-012-perfis-instalacao.md)

---

# PARTE 5 — Serviços Oficiais

| Serviço | Obrig. | Opc. | Externo | Interno | Persistente | Efémero |
|---------|:------:|:----:|:-------:|:-------:|:-----------:|:-------:|
| Backend (Node) | ✅ | | | ✅ | | ✅ processo |
| Frontend (serveDist) | ✅ | | | ✅ | | ✅ processo |
| Nginx | ✅ | | | ✅ | | |
| PostgreSQL | ✅ | | | ✅ | ✅ | |
| PM2 (Standard) | ✅* | | | ✅ | | ✅ |
| Prometheus | | ✅ | | ✅ | ✅ TSDB | |
| Grafana | | ✅ | | ✅ | ✅ | |
| OTEL Collector | | ✅ | | ✅ | | ✅ |
| Lipsync (Wav2Lip) | | ✅ | | ✅ | | ✅ |
| ANAM | | ✅ | ✅ | | | |
| OpenAI | | ✅ | ✅ | | | |
| Claude | | ✅ | ✅ | | | |
| Gemini | | ✅ | ✅ | | | |
| Google TTS | | ✅ | ✅ | | | |
| D-ID / Akool | | ✅ | ✅ | | | |
| SMTP | | ✅ | ✅/✅ | | | |
| MQTT | | ✅ | | ✅ | | |
| OPC-UA | | ✅ | | ✅ | | |
| Modbus | | ✅ | | ✅ | | |
| Redis | | ✅ futuro | | ✅ | ✅ | |

\* PM2 obrigatório no perfil Standard; substituído por supervisor container no perfil Container.

---

# PARTE 6 — Runtime Oficial

## Processos (Standard)

| Processo | Comando | Porta | User |
|----------|---------|-------|------|
| `impetus-backend` | `node src/server.js` | 4000 | impetus |
| `impetus-frontend` | `npm run preview:prod` | 3000 | impetus |
| `nginx` | system service | 443/80 | www-data |
| `postgresql` | system service | 5432 | postgres |
| `lipsync-api` (opt) | Python Wav2Lip | 5001 | impetus |

## Inicialização (ordem)

```
1. PostgreSQL ready
2. Validar config/.env (configValidator)
3. run-all-migrations.js (se update)
4. PM2 start backend → wait /health 200
5. PM2 start frontend → wait / 200
6. nginx reload
7. Schedulers boot no backend (8-9s delay backbone)
```

## Shutdown gracioso (existente — preservar)

Evidência: `server.js` — `SIGTERM`/`SIGINT` → `gracefulShutdown()`:
1. Para workers (AIOI, machine monitoring, cron)
2. `io.close()` Socket.IO
3. `httpServer.close()`
4. `db.pool.end()`
5. Watchdog 12s → `process.exit(1)` se hang

| Parâmetro | Valor actual | Enterprise |
|-----------|--------------|------------|
| `kill_timeout` PM2 | 8000 ms | ≥12000 ms (alinhar watchdog) |
| Sinais | SIGTERM, SIGINT | PM2 send SIGINT |
| Healthcheck | `GET /health` | 200 + `{status:'ok'}` |
| Deep health | `GET /api/system/health/deep` | Admin/key only |
| Recovery | PM2 autorestart | max_restarts=10, delay 4s |

**ADR:** [`ADR-013-runtime-oficial.md`](./adrs/ADR-013-runtime-oficial.md)

---

# PARTE 7 — Catálogo Oficial de Variáveis de Ambiente

Legenda: **Obr** = obrigatória em prod · **Ent** = relevante Enterprise · **SaaS** = só distribuição SaaS

## Infraestrutura

| Variável | Descrição | Default | Obr | Ent | SaaS |
|----------|-----------|---------|:---:|:---:|:----:|
| `IMPETUS_HOME` | Raiz persistência (contrato) | `/opt/impetus` | | ✅ | |
| `NODE_ENV` | Ambiente runtime | `development` | ✅ | ✅ | ✅ |
| `PORT` | Porta backend | `4000` | | ✅ | ✅ |
| `LISTEN_HOST` | Bind backend | `127.0.0.1` prod | | ✅ | ✅ |
| `SERVE_DIST_PORT` | Porta frontend | `3000` | | ✅ | ✅ |
| `SERVE_DIST_HOST` | Bind frontend | `127.0.0.1` prod | | ✅ | ✅ |
| `TZ` | Timezone schedulers | `America/Sao_Paulo` | | ✅ | ✅ |
| `ALLOW_PARTIAL_ENV` | Bypass validação | `false` | | ❌ proibido | ❌ |

## URLs / Nginx / Frontend

| Variável | Descrição | Default | Obr | Ent | SaaS |
|----------|-----------|---------|:---:|:---:|:----:|
| `FRONTEND_URL` | Links email/UI | — | ✅ | ✅ | ✅ |
| `BASE_URL` | URL backend | — | | ✅ | ✅ |
| `ALLOWED_ORIGINS` | CORS | — | ✅ | ✅ | ✅ |
| `VITE_API_URL` | Build FE API base | `/api` | ✅ | ✅ | ✅ |
| `API_PROXY_TARGET` | Proxy serveDist | `http://127.0.0.1:4000` | | ✅ | ✅ |
| `DIST_DIR` | Pasta dist frontend | `dist` | | ✅ | ✅ |

## Banco

| Variável | Descrição | Default | Obr | Ent | SaaS |
|----------|-----------|---------|:---:|:---:|:----:|
| `DATABASE_URL` | Connection string PG | — | ✅* | ✅ | ✅ |
| `DB_HOST` | Host PG | `127.0.0.1` | ✅* | ✅ | ✅ |
| `DB_PORT` | Porta PG | `5432` | | ✅ | ✅ |
| `DB_NAME` | Nome BD | `impetus_db` | ✅* | ✅ | ✅ |
| `DB_USER` | User PG | `postgres` | ✅* | ✅ | ✅ |
| `DB_PASSWORD` | Password PG | — | ✅* | ✅ | ✅ |
| `DB_POOL_MAX` | Pool size | `20` | | ✅ | ✅ |

\* URL ou trio HOST+NAME+USER

## Segurança / JWT

| Variável | Descrição | Default | Obr | Ent | SaaS |
|----------|-----------|---------|:---:|:---:|:----:|
| `JWT_SECRET` | Assinatura JWT tenant | — | ✅ | ✅ | ✅ |
| `IMPETUS_ADMIN_JWT_SECRET` | JWT portal admin | — | ✅ SaaS | ❌ | ✅ |
| `HEALTH_DETAIL_KEY` | Detalhes /health | — | | ✅ | ✅ |
| `ENCRYPTION_KEY` | Cifra dados | — | | ✅ | ✅ |
| `ALLOWED_ORIGINS` | CORS prod | — | ✅ | ✅ | ✅ |
| `RATE_LIMIT_API_PER_MIN` | Rate limit IP | código | | ✅ | ✅ |
| `RATE_LIMIT_USER_PER_MIN` | Rate limit user | código | | ✅ | ✅ |

## Uploads / Paths

| Variável | Descrição | Default | Obr | Ent | SaaS |
|----------|-----------|---------|:---:|:---:|:----:|
| `UPLOADS_DIR` | Raiz uploads | `backend/uploads`+`/uploads` | | ✅ | ✅ |

## Logs / Observabilidade

| Variável | Descrição | Default | Obr | Ent | SaaS |
|----------|-----------|---------|:---:|:---:|:----:|
| `AUDIT_LOG_RETENTION_DAYS` | Retenção audit | `90` | | ✅ | ✅ |
| `IMPETUS_OBSERVABILITY_V2_ENABLED` | Stack obs | `false` | | ✅ | ✅ |
| `IMPETUS_PROMETHEUS_ENDPOINT_ENABLED` | Métricas /metrics | `false` | | ✅ | ✅ |
| `IMPETUS_OTEL_ENDPOINT` | OTLP export | — | | ✅ | ✅ |
| `IMPETUS_BACKEND_METRICS_HOST` | Scrape target | `host.docker.internal:3333` | | ✅ | ✅ |

## IA / Voice

| Variável | Descrição | Default | Obr | Ent | SaaS |
|----------|-----------|---------|:---:|:---:|:----:|
| `OPENAI_API_KEY` | OpenAI | — | | ✅ opt | ✅ |
| `ANTHROPIC_API_KEY` | Claude | — | | ✅ opt | ✅ |
| `GEMINI_API_KEY` | Gemini | — | | ✅ opt | ✅ |
| `ANAM_API_KEY` | ANAM avatar | — | | ✅ opt | ✅ |
| `ANAM_API_BASE` | Base ANAM | `https://api.anam.ai` | | ✅ | ✅ |
| `IMPETUS_REALTIME_PROXY_ENABLED` | WS OpenAI | `false` | | ✅ | ✅ |
| `IMPETUS_CONVERSATION_CONTEXT_ENGINE` | CCE | `on` | | ✅ | ✅ |
| `IMPETUS_TTS_PROVIDER` | openai/google | — | | ✅ | ✅ |
| `IMPETUS_LIPSYNC_URL` | Wav2Lip local | `http://127.0.0.1:5001` | | ✅ | ✅ |

## Industrial

| Variável | Descrição | Default | Obr | Ent | SaaS |
|----------|-----------|---------|:---:|:---:|:----:|
| `IMPETUS_INDUSTRIAL_LAB_ENABLED` | Lab simuladores | `false` | | ✅ off | ✅ |
| `IMPETUS_COGNITIVE_LIVING_ENRICHMENT` | KPIs sintéticos | `false` | | ✅ off | ✅ |
| `IMPETUS_MQTT_BROKER_URL` | MQTT | `mqtt://127.0.0.1:1883` | | ✅ opt | ✅ |
| `IMPETUS_MODBUS_*` | Modbus | lab defaults | | ✅ opt | ✅ |
| `IMPETUS_OPCUA_*` | OPC-UA | lab defaults | | ✅ opt | ✅ |

## Event Backbone

| Variável | Descrição | Default | Obr | Ent | SaaS |
|----------|-----------|---------|:---:|:---:|:----:|
| `IMPETUS_INDUSTRIAL_BACKBONE_MODE` | off/shadow/on | `shadow` | | ✅ | ✅ |
| `IMPETUS_INDUSTRIAL_BACKBONE_SCHEDULER` | Scheduler | `false` | | ✅ | ✅ |
| `IMPETUS_EVENT_RETENTION_MODE` | shadow/enforce | `shadow` | | ✅ | ✅ |

## Licenciamento

| Variável | Descrição | Default | Obr | Ent | SaaS |
|----------|-----------|---------|:---:|:---:|:----:|
| `LICENSE_VALIDATION_ENABLED` | Enforcement | `false` | | LICENSE-01 | ✅ |
| `LICENSE_KEY` | Chave produto | — | | LICENSE-01 | ✅ |
| `LICENSE_SERVER_URL` | Validador remoto | — | | LICENSE-01 | ✅ |

## Backup / Runtime Enterprise

| Variável | Descrição | Default | Obr | Ent | SaaS |
|----------|-----------|---------|:---:|:---:|:----:|
| `IMPETUS_BACKUP_DIR` | Destino backups (contrato) | `${IMPETUS_HOME}/backups` | | DATA-01 | |
| `IMPETUS_DATA_DIR` | Estado cognitivo (contrato) | `${IMPETUS_HOME}/data` | | DATA-01 | |

## SaaS-only (desactivar Enterprise)

| Variável | Descrição | Enterprise |
|----------|-----------|------------|
| `ASAAS_API_KEY` | Billing Asaas | **vazio / unset** |
| `ENABLE_NEXUS_TOKEN_BILLING_CRON` | Cron tokens | `false` |
| `ENABLE_SUBSCRIPTION_GOVERNANCE_CRON` | Cron subscrição | `false` |

**Catálogo completo:** `deploy_backups/20260601_2259/.env.example` + `frontend/.env.production.example`

**Template Enterprise (contrato):** ver Anexo A no final deste documento.

---

# PARTE 8 — Estratégia de Atualização

## Fluxo oficial (sem implementação)

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│ PRÉ-UPDATE  │───►│ BACKUP FULL  │───►│ MANUTENÇÃO  │───►│ STOP PM2     │
└─────────────┘    └──────────────┘    └─────────────┘    └──────┬───────┘
                                                                  │
┌─────────────┐    ┌──────────────┐    ┌─────────────┐           │
│ SMOKE TEST  │◄───│ START PM2    │◄───│ MIGRATIONS  │◄──────────┤
└──────┬──────┘    └──────────────┘    └─────────────┘           │
       │                              ┌─────────────┐              │
       │         ┌──────────────┐     │ REPLACE app/│◄─────────────┘
       ▼         │ ROLLBACK     │     └─────────────┘
   GO-LIVE       │ (se falha)   │
                 └──────────────┘
```

| Fase | Acções |
|------|--------|
| **Pré-update** | Verificar versão; changelog; janela manutenção |
| **Backup** | BD + uploads + config + data + licenses (Parte 9) |
| **Manutenção** | Nginx 503 ou `IMPETUS_MAINTENANCE_MODE` (DATA-01) |
| **Update** | Substituir `app/`; `npm ci`; merge `.env` novas keys |
| **Migrations** | `run-all-migrations.js` forward-only |
| **Smoke** | `smoke-clean-install.js` + health + login |
| **Rollback** | Restaurar `app/` + BD se migration aplicada |
| **Recovery** | DR runbook Parte 9 |

**ADR:** [`ADR-014-atualizacoes-infra.md`](./adrs/ADR-014-atualizacoes-infra.md) · Referência ADR-007 ARCHITECTURE

---

# PARTE 9 — Estratégia de Backup

## Escopo de backup

| Artefacto | Método | Frequência | Retenção |
|-----------|--------|------------|----------|
| **Banco** | `pg_dump -Fc` | Diário + pré-update | 30d local, 90d off-site |
| **Uploads** | `tar.gz` incremental | Diário | 30d |
| **Estado cognitivo** | `tar.gz data/` | Diário | 30d |
| **Configuração** | cópia `config/` encriptada | Cada alteração + diário | 90d |
| **Licenças** | cópia `licenses/` | Mensal + pré-update | Vigência contrato |
| **Logs** | Opcional archive | Semanal | 90d (AUDIT_LOG_RETENTION_DAYS) |
| **Certificados** | cópia + documentação renew | Mensal | — |

## Tipos

- **Completo:** BD + uploads + data + config + licenses
- **Incremental:** uploads/data (rsync/tar delta) — DATA-01

## Restore

| Cenário | Procedimento |
|---------|--------------|
| BD corrupta | `pg_restore` → `${IMPETUS_HOME}/backups/db/` |
| Uploads perdidos | Extrair tar para `uploads/` |
| Config errada | Restaurar snapshot `config/.env.bak` |
| DR total | Restore BD + volumes + restart PM2 |

## Objectivos

| Métrica | Target Enterprise (contrato) |
|---------|-------------------------------|
| **RPO** | ≤ 24h (backup diário); ≤ 1h se WAL contínuo (DATA-01 opcional) |
| **RTO** | ≤ 4h (restore manual documentado) |

**ADR:** [`ADR-018-backup-estrategia.md`](./adrs/ADR-018-backup-estrategia.md) · [`ADR-019-recovery-dr.md`](./adrs/ADR-019-recovery-dr.md)

---

# PARTE 10 — Observabilidade

## Arquitectura

```
Backend ──► logs/ (PM2 stdout/stderr)
         ──► GET /health (público mínimo)
         ──► GET /api/system/health/deep (admin/key)
         ──► GET /api/internal/observability/metrics (Prometheus, flag)

Nginx ──► /var/log/nginx/access.log, error.log

Stack opcional (monitoring/):
  Prometheus :9090 ── scrape ──► backend metrics
  Grafana :3001 ── dashboards
  OTEL Collector :4318 (profile otel)
```

| Pilar | Implementação actual | Enterprise |
|-------|---------------------|------------|
| **Logs** | PM2 + nginx | `${IMPETUS_HOME}/logs/`; logrotate |
| **Métricas** | Prometheus opt-in | `IMPETUS_PROMETHEUS_ENDPOINT_ENABLED` |
| **Health** | `/health`, deep readiness | Monitor externo poll 30s |
| **Alertas** | `prometheus/alerts.yml` | Grafana alerting DATA-01 |
| **Tracing** | OTEL opt-in | `IMPETUS_OTEL_EXPORTER_ENABLED` |
| **Rotação** | OS logrotate | 100MB/10 files backend |
| **Retenção** | 90d audit; 15d Prometheus TSDB | Configurável |

**ADR:** [`ADR-016-observabilidade-enterprise.md`](./adrs/ADR-016-observabilidade-enterprise.md)

---

# PARTE 11 — Segurança Enterprise

| Área | Especificação |
|------|---------------|
| **Firewall** | IN: 443 (443→nginx); OUT: 443 whitelist IA (opcional); DENY 4000/5432 público |
| **HTTPS** | TLS 1.2+; cert em `certificates/`; HSTS |
| **Secrets** | `config/.env` 0600; nunca em git; rotação 90d recomendada |
| **User serviço** | `impetus:impetus` — PM2, app, uploads, data |
| **PostgreSQL** | User `impetus_app` least privilege; não superuser |
| **Volumes** | 0750 dirs; 0640 secrets; SELinux/AppArmor recomendado |
| **Backups** | Encriptação at-rest (GPG); off-site |
| **Hardening** | fail2ban nginx; `client_max_body_size 55m`; rate limit nginx+express |
| **CORS** | `ALLOWED_ORIGINS` = domínio único factory |
| **JWT** | Preservado localStorage model (ARCHITECTURE-01) |

**ADR:** [`ADR-017-seguranca-enterprise.md`](./adrs/ADR-017-seguranca-enterprise.md)

---

# PARTE 12 — Matriz de Compatibilidade Infraestrutura

| Módulo | Compatível | Necessita adaptação | N/A | Observações |
|--------|:----------:|:-------------------:|:---:|-------------|
| Controller Cognitivo | ✅ | | | PG + flags; sem deps infra extra |
| Pulse Cognitivo | ✅ | | | company_id; event ingestion |
| ANAM | ✅ | Config egress | | ANAM_API_KEY; firewall 443 |
| Conversation Context | ✅ | | | Flag on |
| Event Backbone | ✅ | Config flags | | PG scheduler PM2 |
| Gêmeo Digital | ✅ | | | PG + uploads |
| Dashboard | ✅ | | | Nginx + FE proxy |
| Workflow | ✅ | | | PG |
| Qualidade | ✅ | | | Domínio + WS fanout |
| SST (Safety) | ✅ | | | Domínio |
| MES | ✅ | | | OT opcional |
| TPM | ✅ | | | /api/tpm |
| Logística | ✅ | | | Domínio |
| Comunicações | ✅ | | | WS + API |
| Mapping (OIE) | ✅ | | | PG |
| Executive | ✅ | Config flag | | off default |
| Boardroom | ✅ | Config flag | | off default |
| Licenciamento | | ✅ | | LICENSE-01 ✅; `licenses/` offline Ed25519 |
| Uploads | ✅ | Path IMPETUS_HOME | | Consolidar duas raízes |
| Backup | | ✅ | | DATA-01 scripts |
| Observabilidade | ✅ | Config | | Stack opcional |
| Portal SaaS Admin | | | ✅ | Removido distribuição |
| Billing Asaas/Stripe | | | ✅ | Desactivado Enterprise |

---

# PARTE 13 — ADRs (índice)

| ADR | Título |
|-----|--------|
| [ADR-010](./adrs/ADR-010-infraestrutura-enterprise.md) | Infraestrutura Enterprise |
| [ADR-011](./adrs/ADR-011-impetus-home.md) | IMPETUS_HOME |
| [ADR-012](./adrs/ADR-012-perfis-instalacao.md) | Perfis de Instalação |
| [ADR-013](./adrs/ADR-013-runtime-oficial.md) | Runtime Oficial |
| [ADR-014](./adrs/ADR-014-atualizacoes-infra.md) | Atualizações Infra |
| [ADR-015](./adrs/ADR-015-persistencia-infra.md) | Persistência Infra |
| [ADR-016](./adrs/ADR-016-observabilidade-enterprise.md) | Observabilidade |
| [ADR-017](./adrs/ADR-017-seguranca-enterprise.md) | Segurança Enterprise |
| [ADR-018](./adrs/ADR-018-backup-estrategia.md) | Backup |
| [ADR-019](./adrs/ADR-019-recovery-dr.md) | Recovery / DR |

---

# PARTE 14 — Roadmap Atualizado

```
CERT-ONPREM-FORENSICS-01      ✅
        ↓
CERT-ONPREM-ARCHITECTURE-01   ✅
        ↓
CERT-ONPREM-INFRA-01          ✅  ← ESTA CERTIFICAÇÃO
        ↓  aprovação OBRIGATÓRIA
CERT-ONPREM-DATA-01           ✅  scripts backup/restore, bootstrap, seeds
        ↓
CERT-LICENSE-01               ✅  enforcement, offline, grace, capabilities, CLI
        ↓
CERT-ONPREM-CONTAINER-01      ✅  Dockerfile, compose, volumes, networks
        ↓
CERT-ENTERPRISE-BACKUP-01     ✅  NC-V006 encerrada — manifest >2 GiB
        ↓
CERT-ENTERPRISE-ROLLBACK-01   ❌  Rollback/DR — **REPROVADA** (host produção; re-exec em staging)
        ↓
CERT-ENTERPRISE-ENV-QUALIFICATION-01  ❌  **REPROVADA** neste host
        ↓
CERT-ENTERPRISE-PROVISIONING-01       ✅  Spec oficial multi-cloud (documental)
        ↓
CERT-ENTERPRISE-STAGING-01            ⏳  VM dedicada — validar após provisionamento
        ↓
CERT-ONPREM-VALIDATION-01     ⏳  Homologação — **NÃO HOMOLOGADA** (re-exec staging)
        ↓
CERT-ENTERPRISE-GOLIVE-01             📋  **PREPARADA** — liberação formal (decisão pendente)
```

**4 fases finais:** (1) STAGING exec → (2) ROLLBACK re-exec → (3) VALIDATION re-exec → (4) GOLIVE autorização.

Após GOLIVE **AUTORIZADO**, ciclo Enterprise v1 **encerrado** — evoluções = nova versão.

---

# Anexo A — Template `.env.enterprise` (contrato)

```env
# IMPETUS Enterprise On-Premise — template contratual (não aplicar automaticamente)
IMPETUS_HOME=/opt/impetus
NODE_ENV=production
PORT=4000
LISTEN_HOST=127.0.0.1
SERVE_DIST_HOST=127.0.0.1
SERVE_DIST_PORT=3000

# URLs — substituir pelo domínio da fábrica
FRONTEND_URL=https://impetus.factory.local
ALLOWED_ORIGINS=https://impetus.factory.local
BASE_URL=https://impetus.factory.local

# Banco
DATABASE_URL=postgresql://impetus_app:***@127.0.0.1:5432/impetus_db

# Segurança
JWT_SECRET=<gerar-32+-chars>
# IMPETUS_ADMIN_JWT_SECRET — NÃO configurar em Enterprise

# Paths (DATA-01 implementará redireccionamento)
UPLOADS_DIR=${IMPETUS_HOME}/uploads

# Industrial limpo
IMPETUS_COGNITIVE_LIVING_ENRICHMENT=false
IMPETUS_INDUSTRIAL_LAB_ENABLED=false

# Event Backbone conservador
IMPETUS_INDUSTRIAL_BACKBONE_MODE=shadow
IMPETUS_EVENT_RETENTION_MODE=shadow

# SaaS desactivado
ENABLE_NEXUS_TOKEN_BILLING_CRON=false
ENABLE_SUBSCRIPTION_GOVERNANCE_CRON=false

# IA opcional — preencher se egress permitido
# OPENAI_API_KEY=
# ANTHROPIC_API_KEY=
# GEMINI_API_KEY=
# ANAM_API_KEY=

# Licenciamento — LICENSE-01
LICENSE_VALIDATION_ENABLED=false
LICENSE_MODE=local
LICENSE_GRACE_PERIOD_DAYS=14
# LICENSE_PUBLIC_KEY_PATH=${IMPETUS_HOME}/licenses/public.pem
```

---

# Critérios de aceite

| Critério | Estado |
|----------|--------|
| Código / banco / PM2 / nginx / APIs intocados | ✅ |
| Diagrama infra completo | ✅ |
| IMPETUS_HOME formalizado | ✅ |
| 3 perfis definidos | ✅ |
| Catálogo env (grupos) | ✅ |
| Estratégias update/backup/obs/seg | ✅ |
| 10 ADRs | ✅ |
| Matriz compatibilidade | ✅ |
| Roadmap + CONTAINER-01 | ✅ |

---

# Relatório Executivo

## Sumário

A certificação **CERT-ONPREM-INFRA-01** consolida a infraestrutura Enterprise do IMPETUS como **padrão único** desacoplado do método de deploy. A auditoria do estado actual (VPS `/var/www/impetus-completa`, PM2 root, paths dispersos) foi mapeada sem alterações.

## Decisões-chave

1. **`IMPETUS_HOME=/opt/impetus`** — layout canónico de 12 pastas com matriz backup/update/temp
2. **Três perfis:** Standard (PM2), Container (contrato futuro), Air-Gapped (flags only)
3. **Runtime preservado** — graceful shutdown existente; PM2 kill_timeout alinhar a 12s
4. **Catálogo env** — separação Enterprise vs SaaS-only vars
5. **RPO 24h / RTO 4h** — contrato backup; implementação DATA-01
6. **CONTAINER-01** adicionada ao roadmap após DATA + LICENSE

## Riscos residuais (para DATA-01 / CONTAINER-01)

| Risco | Mitigação planeada |
|-------|-------------------|
| Duas raízes uploads | Consolidar em `${IMPETUS_HOME}/uploads` |
| PM2 como root | User `impetus` no runbook |
| Sem restore automatizado | DATA-01 |
| Prometheus scrape :3333 | Alinhar `:4000` no monitoring/ |

## Próximo passo

**Aprovação formal deste contrato** → iniciar **CERT-ONPREM-DATA-01** (scripts backup/restore, bootstrap admin fábrica, redireccionamento paths).

---

*OPS · Infraestrutura Enterprise v1.0 · 2026-06-30*
