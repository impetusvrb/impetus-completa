# APPSEC-02A — Runtime Validation

**Componentes:** `runtimeConfigurationReadiness.js`, `runtimeRestartValidator.js`

---

## Parte 2 — Runtime Configuration Validation

Valida obrigatoriamente (read-only):

| Área | Checks |
|------|--------|
| Variáveis | `LICENSE_VALIDATION_ENABLED`, `ADMIN_PORTAL_DEBUG_INVITE_LINK`, `TIME_CLOCK_ENC_KEY`, `IMPETUS_ADMIN_JWT_SECRET`, `JWT_SECRET` |
| HTTP | CORS, Helmet, HSTS (via código + headers) |
| Infra | Nginx config (se presente), PM2 process list |
| Segurança | Flags inseguras em produção |

Severidades: **CRITICAL**, **HIGH**, **MEDIUM**, **LOW**

**Nunca corrige automaticamente** (`auto_fix: false` em todos os findings).

---

## Parte 4 — Operational Restart Validator

Antes de restart (snapshot `pre_restart`):

- PM2 — processos `impetus-*`
- PostgreSQL — `pg_isready` ou socket
- Redis — ping
- MQTT — broker reachability (se configurado)
- Nginx — config test
- TLS — certificado local (se aplicável)
- Health — `/health`, `/api/health`
- Endpoints APPSEC — `/api/audit/appsec-01`, `/api/audit/appsec-validation`
- Endpoints SEC — amostra certificação v2

Após restart: revalidação e comparação de snapshots (`comparison`).

---

## Relatórios JSON

| Ficheiro | Conteúdo |
|----------|----------|
| `runtime-readiness.json` | Findings config + `passed` |
| `restart-validation.json` | Snapshots + comparison |

---

## RT-08

Finding RT-08 (config produção insegura) reflete-se em findings CRITICAL/HIGH em `runtime-readiness.json`. Correcção é **operacional** (alterar `.env` + `pm2 restart --update-env`).

---

## APPSEC-02 reexecução (Parte 5)

O orquestrador reexecuta APPSEC-02 em ambiente operacional:

- Validação estática (cenários código)
- Validação dinâmica (HTTP quando backend online)
- Comparação vs baseline 04/07/2026

Resultado em `appsec02-rerun.json` e embutido em `readiness-latest.json`.
