# Health check pré-restart — IMPETUS

**Data (UTC):** 2026-05-12T17:40Z  
**Critério:** só prosseguir para restart completo se não houver crash loop agudo, deep health OK, e migrations dry-run sem falhas bloqueantes inesperadas.

## 1. PM2 — `impetus-backend` (antes do restart)

| Campo | Valor |
|-------|--------|
| Estado | `online` |
| PID | 2786800 |
| Restarts acumulados | 114 |
| `unstable_restarts` (PM2 describe) | 0 |
| Memória (ordem de grandeza) | ~115 MB |
| Script | `/var/www/impetus-completa/backend/src/server.js` |
| CWD | `/var/www/impetus-completa/backend` |

**Interpretação:** restarts históricos elevados merecem análise; não impediram deep health OK nem HTTP 200.

## 2. HTTP — API

| Endpoint | Resultado |
|----------|-----------|
| `GET http://127.0.0.1:4000/health` | **200** |
| `GET http://127.0.0.1:4000/api/health` | **200** |
| `GET http://127.0.0.1:4000/api/system/health/deep` | **200**, corpo `{"ready":true,"issues":[]}` |

## 3. Frontend

| Endpoint | Resultado |
|----------|-----------|
| `GET http://127.0.0.1:3000/` | **200** |

## 4. Base de dados

- PostgreSQL em escuta em `127.0.0.1:5432`.
- `npm run migrate:status` concluiu com sucesso (leitura do histórico).

## 5. Migrations — dry-run

- `npm run migrate:dry`: plano com **1** migration segura a correr (`cognitive_event_backbone_migration.sql`), **1** destrutiva bloqueada (`pgvector_semantic_search_migration.sql`), restantes SKIP.
- **Decisão:** prosseguir com execução forward **apenas** da migration segura; não forçar destrutiva.

## 6. Logs — crash loop / fila / WS

- Amostra de `impetus-backend-error.log`: sem stacktrace repetitivo de boot infinito na cauda analisada; entradas operacionais e timeouts pontuais.
- **Não** detectada evidência imediata de *crash loop* na janela analisada.

## 7. Conclusão pré-restart

**APTO** para restart ordenado de `impetus-backend` e `impetus-frontend` com `--update-env`, após aplicar a migration pendente segura.

---

*Sem credenciais. PIDs referem-se ao momento da operação.*
