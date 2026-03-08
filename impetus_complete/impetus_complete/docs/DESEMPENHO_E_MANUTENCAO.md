# Desempenho e Manutenção - Impetus Comunica IA

Sugestões para evitar travamentos e reduzir necessidade de intervenção manual.

---

## 1. Backend – Estabilidade

### 1.1 Graceful Shutdown ✅ Implementado
**Problema:** Ao reiniciar (deploy, crash), conexões do pool podem ficar abertas e requisições em andamento são interrompidas de forma abrupta.

**Implementado em** `backend/src/index.js`:

```javascript
// backend/src/index.js
const server = app.listen(PORT, () => console.log(`Backend listening on ${PORT}`));

async function gracefulShutdown(signal) {
  console.log(`[${signal}] Encerrando graciosamente...`);
  server.close(() => {
    require('./db').pool.end(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10000); // força saída após 10s
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
```

### 1.2 Limite no cache em memória ✅ Implementado
**Problema:** O cache (`utils/cache.js`) usa um `Map` sem limite. Com muitas empresas e TTL longo, o uso de memória pode crescer.

**Implementado em** `backend/src/utils/cache.js` – limite LRU configurável via `CACHE_MAX_ENTRIES` (padrão 1000):

```javascript
// Limitar tamanho do Map - remover mais antigos quando exceder
const MAX_CACHE_ENTRIES = 1000;
function pruneCache() {
  if (entries.size > MAX_CACHE_ENTRIES) {
    const keys = [...entries.entries()]
      .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    keys.slice(0, keys.length - MAX_CACHE_ENTRIES).forEach(([k]) => entries.delete(k));
  }
}
// Chamar pruneCache() após cada set()
```

### 1.3 Export de logs – paginação ✅ Implementado
**Problema:** Export de até 10.000 registros em uma única resposta pode usar muita memória e gerar timeouts.

**Implementado em** `backend/src/routes/admin/logs.js` – limite máximo de 5.000 registros no export; rotas de listagem usam `safeInteger` para limit/offset (máx. 500 por página).

### 1.4 Handlers para erros não capturados ✅ Implementado
**Problema:** `unhandledRejection` e `uncaughtException` podem derrubar ou travar o processo sem log adequado.

**Implementado em** `backend/src/index.js`:
- `unhandledRejection`: loga e mantém o servidor ativo (evita crash)
- `uncaughtException`: loga e executa graceful shutdown

### 1.5 Pool de DB – handler de erro ✅ Implementado
**Problema:** Erros no pool (ex.: conexão perdida) podem derrubar o processo.

**Implementado em** `backend/src/db/index.js` – `pool.on('error')` loga e evita propagação.

### 1.6 PM2 para produção ✅ Configurado
**Arquivo** `backend/ecosystem.config.cjs` – uso: `cd backend && pm2 start ecosystem.config.cjs` para restart automático em caso de crash.

**Sugestão adicional (opcional):**
- Permitir export por período para facilitar downloads menores.

### 1.4 Health check mais completo ✅ Implementado
**Problema:** `/health` não confirma conexão com o banco nem uso de memória.

**Implementado em** `backend/src/app.js` – retorna status do DB (`SELECT 1`), memória (heapUsed, heapTotal, rss em MB), cache (size, maxEntries). Responde 503 se DB inacessível.

---

## 2. Banco de dados – Manutenção

### 2.1 Índices
Já existem índices em colunas importantes (`company_id`, `created_at`, etc.). Revisar periodicamente:

```sql
-- Verificar queries lentas (PostgreSQL)
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

### 2.2 Limpeza periódica ✅ Implementado
**Arquivo** `backend/scripts/maintenance.js` – executa:
- Remoção de sessões expiradas
- Exclusão de `audit_logs` e `data_access_logs` (> `AUDIT_LOG_RETENTION_DAYS`, padrão 90)
- `VACUUM ANALYZE` em tabelas principais

**Uso:** `npm run maintenance` ou `npm run maintenance:dry` (simulação)
**Cron:** `0 3 * * * cd /path/backend && npm run maintenance`

### 2.3 Limite de `limit` nas queries
**Problema:** Algumas rotas aceitam `limit` arbitrário (ex.: 10.000).

**Sugestão:** Usar `safeInteger(limit, 100, 1, 500)` em todas as rotas paginadas.

---

## 3. Operações bloqueantes

### 3.1 Operações pesadas em workers
**Problema:** Export de logs, embeddings em lote e relatórios grandes são feitos na mesma thread do servidor.

**Sugestão:**
- Usar jobs assíncronos (Bull/BullMQ + Redis) para export e relatórios.
- Ou `worker_threads` para processamento pesado.

### 3.2 OpenAI e timeouts
- Circuit breaker já implementado.
- Timeout de 30s em `chatCompletion`.
- Reforçar: sempre tratar falhas sem derrubar o processo.

---

## 4. Frontend – Desempenho

### 4.1 Lazy loading de rotas
**Sugestão:** Carregar páginas sob demanda:

```javascript
// App.jsx
const AdminUsers = React.lazy(() => import('./pages/AdminUsers'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
// ...
<Suspense fallback={<Loading />}>
  <Routes>...</Routes>
</Suspense>
```

### 4.2 Limite no cache do `useCachedFetch`
**Problema:** O `Map` do hook não tem limite.

**Sugestão:** Implementar LRU ou limite de chaves (ex.: 50) para evitar consumo de memória em sessões longas.

---

## 5. Variáveis de ambiente sugeridas

```env
# Pool de conexões
DB_POOL_MIN=2
DB_POOL_MAX=20

# Timeout HTTP para serviços externos
HTTP_TIMEOUT_MS=15000
HTTP_RETRIES=3

# Limite de cache (se implementado)
CACHE_MAX_ENTRIES=1000

# Manutenção - retenção de logs (dias)
AUDIT_LOG_RETENTION_DAYS=90
```

---

## 6. Monitoramento e alertas

- **Uptime:** Ferramentas como UptimeRobot ou similar.
- **Logs:** Rotação com `logrotate` ou Winston + daily rotate.
- **Métricas:** Prometheus + Grafana (opcional).
- **Alertas:** Email/Slack quando health check falhar ou memória subir.

---

### 2.4 Rotação de logs ✅ Configurado
**Arquivo** `docs/logrotate-impetus.conf` – modelo de configuração para `logrotate`.
Copie para `/etc/logrotate.d/` e ajuste os caminhos conforme seu ambiente (PM2 ou arquivos em `/var/log/impetus`).

### 2.5 Health check para monitoramento ✅ Implementado
**Arquivo** `backend/scripts/health-check.js` – script que retorna exit 0 (healthy) ou 1 (unhealthy).
**Uso:** `npm run health-check` ou com URL: `node scripts/health-check.js https://seu-servidor.com`
Integre com UptimeRobot, cron ou sistema de monitoramento.

---

## 7. Resumo – Prioridades

| Prioridade | Item                           | Esforço |
|-----------|---------------------------------|---------|
| Alta      | Graceful shutdown               | Baixo   |
| Alta      | Limite no cache backend         | Baixo   |
| Média     | Health check com DB             | Baixo   |
| Média     | Job de limpeza de sessões/logs | Médio   |
| Média     | Limitar `limit` em queries      | Baixo   |
| Baixa     | Lazy loading de rotas           | Baixo   |
| Baixa     | Workers para export             | Alto    |

---

## 8. Comandos de manutenção (DBA)

```sql
-- Sessões expiradas
DELETE FROM sessions WHERE expires_at < now();

-- Estatísticas atualizadas
ANALYZE;

-- Tabelas grandes
VACUUM ANALYZE audit_logs;
VACUUM ANALYZE data_access_logs;
VACUUM ANALYZE communications;
```
