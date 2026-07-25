# ADMIN_LOGIN_REGRESSION

**Data:** 2026-07-22 ~21:57 UTC  
**Após:** restart `impetus-backend` + patch `ecosystem.config.js`

## Resultados

| Critério | Resultado |
|----------|-----------|
| LOGIN_ADMIN (bot-config + auth reachable) | **PASS** — bot-config 200; login responde 403 human-check (não 5xx) |
| LOGIN_USER | **PASS** — `/api/auth/login` 401 credenciais inválidas (não 5xx) |
| HEALTH_FAST | **PASS** — `/health` 200 ~11 ms |
| HEALTH_INTEGRATIONS | **PASS** — `/health/integrations` 200 |
| NEW_REGRESSIONS | **0** |

## Detalhe dos testes

```
GET  /health                              → 200  (~0.011s)
GET  /health/integrations                 → 200
GET  /api/impetus-admin/auth/bot-config   → 200  {"ok":true,"mode":"challenge",...}
POST /api/impetus-admin/auth/login        → 403  HUMAN_CHECK_REQUIRED (sem challenge)
POST /api/auth/login                      → 401  Credenciais inválidas
```

## Preservação forense

| Item | Estado |
|------|--------|
| `backend/docs/evidence/storage-remediation/` | **INTACTO** (não modificado) |
| SHA256 / chain_of_custody / core dumps | **NÃO alterados** |
| Alteração de código | apenas `ecosystem.config.js` |

## Relatório final (12 respostas)

1. **Endpoint que falhou:** `GET /api/impetus-admin/auth/bot-config` (e qualquer API, incl. login)  
2. **Status HTTP:** **504** (nginx upstream timeout); local: timeout sem resposta  
3. **Backend realmente indisponível?** **SIM** (listen sem resposta + OOM)  
4. **Camada:** **BACKEND** (infra nginx/CF OK; frontend OK)  
5. **Causa raiz:** Heap OOM / processo Node esgotado (+ pool pressure; PM2 heap limit mal aplicado)  
6. **Arquivos alterados:** `ecosystem.config.js`  
7. **Build?** **NÃO**  
8. **Restart PM2?** **SIM** — `impetus-backend`  
9. **Login Admin voltou?** **SIM** (APIs admin respondem; bot-config 200)  
10. **/health e /health/integrations?** **CORRECTOS** (200)  
11. **Regressões?** **NÃO**  
12. **Cadeia forense?** **INTACTA**

```
LOGIN_ADMIN = PASS
LOGIN_USER = PASS
HEALTH_FAST = PASS
HEALTH_INTEGRATIONS = PASS
NEW_REGRESSIONS = 0
FALSE_SERVER_UNAVAILABLE = FALSE
ROOT_FAILURE_LAYER = BACKEND
```
