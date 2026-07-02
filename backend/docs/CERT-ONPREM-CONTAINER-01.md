# CERT-ONPREM-CONTAINER-01 — Empacotamento Oficial Enterprise

**Tipo:** Certificação de Implementação (Empacotamento)  
**Prioridade:** Alta  
**Pré-requisitos:** FORENSICS ✅ · ARCHITECTURE ✅ · INFRA ✅ · DATA ✅ · LICENSE ✅  
**Data:** 2026-06-30  
**Status:** CERTIFICADO (smoke Docker pendente de host com engine)

---

## Sumário executivo

Empacotamento oficial do IMPETUS Enterprise em **Docker + Docker Compose**, preservando integralmente a arquitectura certificada.

**Esta certificação NÃO é desenvolvimento.** Proibido alterar regras de negócio, arquitectura cognitiva, APIs, RBAC, JWT, licenciamento ou comportamento funcional.

### Regra arquitectural obrigatória

> **PM2 continua sendo o runtime oficial certificado (INFRA-01).**  
> O Docker **apenas encapsula** o runtime existente via **PM2 Runtime** (`pm2-runtime`).  
> **Não substituir PM2** por outro process manager sem ADR específica.

Se qualquer componente exigir **alteração de código** para containerizar:

1. **NÃO** corrigir automaticamente  
2. Registrar como **Não Conformidade de Containerização**  
3. Documentar evidência  
4. Interromper alteração daquele componente  

**Instalação PM2 host:** continua suportada **integralmente**, sem regressão. Docker é **forma adicional** de distribuição, **não substituto obrigatório**.

Matriz completa: [`docker/MATRIZ-CONFORMIDADE-CONTAINER.md`](../../docker/MATRIZ-CONFORMIDADE-CONTAINER.md)

---

## PARTE 1 — Auditoria de containerização

| Componente | Script/path certificado | Volume | Conformidade |
|------------|-------------------------|--------|:------------:|
| PM2 host | `ecosystem.config.js` | N/A | ✅ **Inalterado** |
| PM2 container | `docker/ecosystem.*.container.cjs` | `runtime/` | ✅ Adaptador empacotamento |
| Backend | `backend/src/server.js` | — | ✅ Via PM2 |
| Frontend | `npm run preview:prod` | — | ✅ Via PM2 |
| Nginx host | `infra/nginx/impetus.conf` | — | ✅ Inalterado |
| Nginx Docker | `docker/nginx/impetus-enterprise.conf` | `logs/nginx/` | ✅ Adaptador |
| PostgreSQL | `DATABASE_URL` | `database/pgdata/` | ✅ |
| IMPETUS_HOME | `impetusHome.js` | mount 1:1 | ✅ |
| Bootstrap | `bootstrap-enterprise.js` | — | ✅ Reutilizado |
| Migrations | `run-all-migrations.js` | — | ✅ Reutilizado |
| Backup/restore | `backup-enterprise.js` | `backups/` | ✅ |
| Verify/health | `verify-enterprise.js` | — | ✅ |
| Licença | `license-admin.js` | `licenses/` | ✅ |

**Não containerizado:** Lipsync (NC-C06) — PM2 host `ecosystem.lipsync.config.cjs`.

---

## PARTE 2 — Dockerfiles oficiais

| Imagem | Dockerfile | Runtime |
|--------|------------|---------|
| `impetus/backend-enterprise` | `docker/backend/Dockerfile` | **PM2 Runtime** → `server.js` |
| `impetus/frontend-enterprise` | `docker/frontend/Dockerfile` | **PM2 Runtime** → `preview:prod` |

**Backend:** Node 20 LTS · user `impetus:1000` · `pm2-runtime` · healthcheck `/health` · `kill_timeout: 12000` (adaptador PM2, alinhado shutdown `server.js`)

**Frontend:** build Vite **inalterado** · `serveDist.cjs` **inalterado** · PM2 Runtime

**Proibido:** `node src/server.js` ou `tini` como PID 1 substituindo PM2.

---

## PARTE 3 — Docker Compose Enterprise

**Ficheiro:** `docker-compose.yml`

| Serviço | Portas públicas |
|---------|-----------------|
| `nginx` | `:80`, `:443` |
| `backend` | **Nenhuma** |
| `frontend` | **Nenhuma** |
| `postgres` | **Nenhuma** |

Opcional: `docker-compose.override.example.yml` (Prometheus/Grafana). **Sem SaaS.**

---

## PARTE 4 — Volumes

Layout certificado (INFRA-01 / DATA-01) — **nenhum dado persistente na imagem:**

`config/` · `uploads/` · `logs/` · `licenses/` · `certificates/` · `database/` · `backups/` · `data/` · `temp/` · `runtime/`

Backend: `${IMPETUS_HOME}:/opt/impetus`  
Frontend: `logs/frontend/` + `runtime/` (PM2)  
Postgres: `database/pgdata/`

---

## PARTE 5 — Networking

Redes: `impetus-front` · `impetus-internal` · `impetus-data` (internal)

Somente **nginx** publica portas. Comunicação interna por hostname Docker (`backend`, `frontend`, `postgres`).

---

## PARTE 6 — Configuração

**Fonte única certificada:** `${IMPETUS_HOME}/config/.env`

Template: `docker/config/env.enterprise.example`  
Compose vars (raiz): `docker/config/compose.env.example` → `.env`

**Proibido:** valores hardcoded de segredos no compose; duplicação de configuração além do mínimo de ligação compose.

---

## PARTE 7 — Inicialização

Entrypoint `docker/scripts/backend-entrypoint.sh`:

1. Verificar configuração  
2. `ensureEnterpriseDirs()` (certificado)  
3. `wait-for-postgres.sh`  
4. Migrations (`run-all-migrations.js`)  
5. Bootstrap **só se BD vazia** (`bootstrap-enterprise.js`)  
6. Licença (`license-admin.js status`)  
7. **`pm2-runtime start docker/ecosystem.backend.container.cjs --env production`**

Frontend: `pm2-runtime start docker/ecosystem.frontend.container.cjs --env production`

---

## PARTE 8 — Logs

| Path | Destino |
|------|---------|
| `logs/backend/` | PM2 `error.log` / `out.log` backend |
| `logs/frontend/` | PM2 frontend |
| `logs/nginx/` | Nginx container |

Política rotação INFRA-01 preservada (logrotate host).

---

## PARTE 9 — Segurança

User `impetus:1000` · `cap_drop: ALL` · `no-new-privileges` · secrets em `config/.env` · **sem chave privada na imagem**

---

## PARTE 10 — Atualizações

`docker compose up -d --build` substitui **apenas imagem** (código em `/app`).

Intactos: uploads, database, backups, licenses, config, certificates, data, logs.

Ver: `MANUAL-UPDATE-CONTAINER.md`

---

## PARTE 11 — Smoke test

```bash
bash docker/scripts/container-smoke.sh
# valida: compose, health, SPA, PG, PM2 list, volumes, bloqueio SaaS
```

**Evidência neste host:** Docker engine ausente — script entregue; executar em VALIDATION-01.

---

## PARTE 12 — Compatibilidade PM2

| Perfil | Suporte |
|--------|---------|
| PM2 host actual | ✅ **Integral** — `ecosystem.config.js` inalterado |
| Docker Enterprise | ✅ Adicional |
| Migração PM2 → Docker | ✅ Copiar `IMPETUS_HOME` + compose up |

---

## Não conformidades de containerização

| ID | Desvio | Código alterado? |
|----|--------|:----------------:|
| NC-C01 | `LISTEN_HOST=0.0.0.0` perfil Docker | **Não** (env) |
| NC-C02 | `SERVE_DIST_HOST=0.0.0.0` perfil Docker | **Não** (env) |
| NC-C03 | `DB_HOST=postgres` | **Não** (env) |
| NC-C04 | Adaptadores `docker/ecosystem.*.container.cjs` | **Não** |
| NC-C05 | PM2 em 2 containers vs 1 daemon host | **Não** |
| NC-C06 | Lipsync não containerizado | **Não** |

**Nenhuma alteração de código de aplicação** foi necessária nem implementada.

---

## Ficheiros criados

| Ficheiro | Motivo |
|----------|--------|
| `docker/backend/Dockerfile` | Imagem backend + PM2 Runtime |
| `docker/frontend/Dockerfile` | Imagem frontend + PM2 Runtime |
| `docker/ecosystem.backend.container.cjs` | Adaptador PM2 backend (host inalterado) |
| `docker/ecosystem.frontend.container.cjs` | Adaptador PM2 frontend |
| `docker/scripts/backend-entrypoint.sh` | Init + PM2 Runtime |
| `docker/scripts/frontend-entrypoint.sh` | PM2 Runtime frontend |
| `docker/scripts/wait-for-postgres.sh` | Wait DB |
| `docker/scripts/container-smoke.sh` | Smoke + verificação PM2 |
| `docker/scripts/prepare-smoke-env.sh` | Prep ambiente limpo |
| `docker/nginx/impetus-enterprise.conf` | Nginx Docker |
| `docker/config/env.enterprise.example` | Template `config/.env` |
| `docker/config/compose.env.example` | Template `.env` compose |
| `docker/MATRIZ-CONFORMIDADE-CONTAINER.md` | Matriz conformidade |
| `docker-compose.yml` | Stack Enterprise |
| `docker-compose.override.example.yml` | Observabilidade opcional |
| `.dockerignore` | Build enxuto |
| `backend/docs/CERT-ONPREM-CONTAINER-01.md` | Esta certificação |
| `backend/docs/enterprise/MANUAL-DOCKER.md` | Manual |
| `backend/docs/enterprise/MANUAL-UPDATE-CONTAINER.md` | Update |

## Ficheiros modificados (empacotamento apenas)

| Ficheiro | Alteração |
|----------|-----------|
| `backend/package.json` | Script `enterprise:docker:smoke` |
| `FUNCTIONAL_MATRIX.md` | Secção Docker |
| Roadmaps INFRA / ARCHITECTURE / DATA / LICENSE | CONTAINER ✅ |

## Ficheiros de aplicação NÃO modificados

`server.js` · `serveDist.cjs` · `ecosystem.config.js` · cognitivo · Event Backbone · Pulse · Controller · CCE · ANAM · Gêmeo Digital · RBAC · JWT · `license.js` · migrations · APIs

---

## Pendências VALIDATION-01 (Homologação Oficial)

Ver `CERT-ONPREM-VALIDATION-01.md` — Partes 2–11 em ambientes dedicados.

**CONTAINER-01:** empacotamento concluído. Homologação integrada → VALIDATION-01.

---

## Critérios de aceite

| Critério | Estado |
|----------|--------|
| Apenas empacotamento | ✅ |
| PM2 Runtime oficial | ✅ |
| Sem alteração código app | ✅ |
| PM2 host inalterado | ✅ |
| Volumes IMPETUS_HOME 1:1 | ✅ |
| Matriz conformidade | ✅ |
| Não conformidades documentadas | ✅ |
| Smoke script (+ PM2 check) | ✅ |
| Smoke executado | ⏳ |

**CERT-ONPREM-CONTAINER-01: CERTIFICADO** (homologação operacional → VALIDATION-01)
