# ADMIN_LOGIN_ROOT_CAUSE

## Causa raiz exacta

O processo `impetus-backend` esgotou a heap V8 (~2 GB), entrou em GC ineficaz / OOM e **deixou de responder** a pedidos HTTP (incluindo `/api/impetus-admin/auth/bot-config` e login). O nginx devolveu **504 Gateway Timeout**. O frontend mapeou 504 → *"Servidor indisponível…"*.

### Cadeia causal

1. Heap Node → ~94% (~1913 MiB) com stack em `JSON.stringify`  
2. Event loop / aceitação de conexões degradada → timeouts  
3. Pool PG sob pressão (`idleCount:0`) — factor contribuinte  
4. nginx `upstream timed out` → **HTTP 504**  
5. UI admin: mensagem de indisponibilidade  

### Causas contribuintes (configuração)

| Factor | Impacto |
|--------|---------|
| `NODE_OPTIONS` aplicado como **script args** (não interpreter) | Limite de heap 1536 não efectivo |
| `max_memory_restart: 1G` não actuou a tempo | Processo chegou a ~2.1 GB RSS |
| Leak / crescimento de memória (histórico OOM recorrente) | 510 restarts; padrão já visto em 13/07 |

### O que NÃO foi a causa

- Alteração FIX-006 dos endpoints `/health`  
- Bug de endpoint de login / RBAC / tenant / license no caminho feliz  
- Cloudflare / DNS / CORS  
- Frontend com baseURL errada  
- PostgreSQL down (`pg_isready` OK)

## Correção aplicada (mínima)

| Acção | Detalhe |
|-------|---------|
| Restart limpo PM2 | `impetus-backend` (id 11) |
| Patch `ecosystem.config.js` | `node_args: --max-old-space-size=1536`; `max_memory_restart: 1200M`; flags APPSEC em `env_production`; script `./src/server.js` com cwd `backend` |
| `pm2 save` | Persistência do dump correcto |

**Não alterado:** APPSEC, RBAC, Enterprise Security, cadeia forense, lógica FIX-006 health, mensagem frontend (estava correcta).

## Pós-correção (smoke)

| Check | Resultado |
|-------|-----------|
| `GET :4000/health` | 200 ~11 ms |
| `GET :4000/health/integrations` | 200 |
| `GET :4000/api/impetus-admin/auth/bot-config` | 200 ~13 ms |
| `POST :4000/api/impetus-admin/auth/login` (sem human-check) | 403 `HUMAN_CHECK_REQUIRED` (esperado) |
| `POST :4000/api/auth/login` (creds inválidas) | 401 (esperado) |
| Heap após boot | ~138 MiB |
| interpreter args | `--max-old-space-size=1536` |
| script args | N/A (corrigido) |
