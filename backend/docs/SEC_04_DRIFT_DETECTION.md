# SEC-04 — Drift Detection

## Tipos de drift

| Código | Severidade | Descrição |
|--------|------------|-----------|
| HASH_DRIFT | CRITICAL | SHA256 diverge |
| FILE_MISSING | CRITICAL | Ficheiro crítico ausente |
| SCRIPT_CHANGED | CRITICAL | PM2 script alterado |
| PROCESS_OFFLINE | CRITICAL | impetus-backend/frontend offline |
| NGINX_CONFIG_DRIFT | CRITICAL | Nginx alterado |
| BACKEND_PUBLIC_BIND | CRITICAL | :4000 fora localhost |
| FRONTEND_PUBLIC_BIND | CRITICAL | :3000 fora localhost |
| ENV_DRIFT | CRITICAL/WARNING | LISTEN_HOST, NODE_ENV |
| UNEXPECTED_RESTARTS | WARNING | Restarts >> baseline |
| UFW_DRIFT | WARNING | Regras firewall alteradas |
| BLUEPRINT_DRIFT | CRITICAL | Volume blueprint alterado |
| GIT_DELETED_FILES | CRITICAL | Ficheiros tracked apagados |

## Acções

SEC-04 **regista apenas** — correção manual ou SEC-06 Response Orchestrator.
