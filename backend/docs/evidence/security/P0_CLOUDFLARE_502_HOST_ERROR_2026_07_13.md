# P0 — Auditoria Forense: Cloudflare 502 Host Error

**Host:** `www.plataformaimpetus.com`  
**Timestamp Cloudflare (relato):** 2026-07-13 11:43:57 UTC  
**Auditoria executada em:** 2026-07-13 12:52–12:56 UTC  
**Modo:** SOMENTE LEITURA — nenhuma alteração, reinício ou restauração foi executada  
**Classificação:** P0 — Indisponibilidade produção  

---

## 1. VEREDITO EXECUTIVO

**Causa principal:**  
**Falha do upstream `impetus-backend` (Node.js :4000)** — processo morto ou incapaz de responder após **JavaScript heap OOM** (~11:06 UTC), com **exaustão do pool PostgreSQL** e **disco raiz a 99% (ENOSPC)** como fatores contribuintes. O nginx permaneceu activo mas não obteve resposta válida do backend; a Cloudflare recebeu erro de origem e expôs **502 Host Error**.

**Confiança:** **ALTA**

**Estado actual (momento da auditoria, ~12:55 UTC):** **PARCIAL**
- Origem local: nginx activo; backend `:4000` → HTTP 200 (lento, ~2,4 s); frontend `:3000` → HTTP 200.
- Público via Cloudflare: **HTTP 403** em todas as rotas testadas (domínio raiz, www, `/painel/`, API, `/health`) — resposta da Cloudflare, não 502.
- PM2: processos `impetus-backend`, `impetus-frontend`, `impetus-admin-portal` **online** desde ~12:39 UTC (uptime ~13 min).
- Disco `/`: **99% usado** (~1,2 GB livres) — condição crítica persistente.

---

## 2. PONTO EXACTO DA FALHA

```
Browser → Cloudflare → Origin (nginx) → Upstream → Aplicação → PostgreSQL
   OK        OK           OK              FALHA        FALHA      FALHA*
```

| Elo | Estado | Evidência |
|-----|--------|-----------|
| Browser → Internet | OK | Relato do operador; CF indica "Browser Working" |
| Cloudflare edge | OK | CF indica "Cloudflare Working"; `cf-ray` presente nos testes |
| Cloudflare → Origin (443) | OK | nginx activo; TLS/handshake funcional em testes locais |
| nginx → frontend (:3000) | OK (actual) | `ss` confirma listener; HTTP 200 local |
| nginx → backend (:4000) | **FALHA (incidente)** | Upstream timeout/504 históricos; OOM; zero logs stdout 08–11 UTC |
| nginx → admin portal | NÃO COMPROVADO no instante | Proxy via nginx; depende do backend para APIs |
| Backend Node.js | **FALHA (incidente)** | 3× `FATAL ERROR: JavaScript heap out of memory`; pool pressure 20/0/30+ |
| PostgreSQL | **FALHA*** (contribuinte) | ENOSPC 07:48 UTC; timeouts de conexão; pool pressure correlacionado |

\*PostgreSQL estava a aceitar conexões (`pg_isready` OK no momento da auditoria), mas com erros de escrita por disco cheio e timeouts que bloquearam o backend.

**Ponto de interrupção exacto:** **nginx → upstream `127.0.0.1:4000` (impetus-backend)** — Cloudflare recebeu resposta inválida/ausente da origem.

---

## 3. LINHA DO TEMPO (UTC)

| Timestamp | Evento |
|-----------|--------|
| 2026-07-13 00:00–03:49 | Múltiplos **504** nginx em `/api/*` (timeout 120 s) — backend lento/congelado |
| 2026-07-13 06:45–07:44 | Backend: dezenas de `OBSERVABILITY_METRICS_PERSIST_FAILED` — `timeout exceeded when trying to connect` (DB) |
| 2026-07-13 07:48:20 | **Backend reiniciado** — boot `[FLAG_RECONCILER]`, `[APPSEC_*]` no PM2 out log |
| 2026-07-13 07:48:27 | PostgreSQL: `could not extend file` / `No space left on device` |
| 2026-07-13 08:35+ | nginx: `write() failed (28: No space left on device)` ao gravar access.log |
| 2026-07-13 08:44 | Probing `/wp-admin/install.php?step=1` — nginx responde **403** (rt=0.000) |
| 2026-07-13 08:54+ | **pm2-root.service** entra em loop de falha (`start operation timed out`, contador ≥42) |
| 2026-07-13 09:34 | **Última entrada** em `impetus-access.log` antes de lacuna de ~3 h |
| 2026-07-13 ~11:06* | **OOM estimado** — uptime processo 11 864 076 ms desde 07:48:20 → crash heap ~2 GB |
| **2026-07-13 11:43:57** | **Relato Cloudflare 502 Host Error** (operador) |
| 2026-07-13 11:59:04 | rsyslog: `No space left on device` (syslog) |
| 2026-07-13 12:00:16 | pm2-root.service: timeout, contador restart **165** |
| 2026-07-13 12:39:32 | PM2 **resurrect bem-sucedido** — todos os apps online (PIDs novos) |
| 2026-07-13 12:40:01 | Backend boot pós-restauro — logs retomam |
| 2026-07-13 12:45:01 | Alerta disco: **CRÍTICO 99%** |
| 2026-07-13 12:52:47 | Auditoria forense — público **403** CF; origem local **200/301** |

\*Estimativa derivada de `[1389545] 11864076 ms` no error log PM2 + PID birth 07:48:20 UTC.

---

## 4. EVIDÊNCIAS

### 4.1 Escopo da indisponibilidade (testes auditoria)

| Alvo | UTC teste | HTTP | Latência | Origem resposta |
|------|-----------|------|----------|-----------------|
| `https://plataformaimpetus.com/` | 12:52:47 | 403 | 61 ms | Cloudflare |
| `https://www.plataformaimpetus.com/` | 12:52:47 | 403 | 58 ms | Cloudflare |
| `https://www.plataformaimpetus.com/painel/` | 12:52:48 | 403 | 70 ms | Cloudflare |
| `https://www.plataformaimpetus.com/painel/seguranca` | 12:52:48 | 403 | 82 ms | Cloudflare |
| `https://www.plataformaimpetus.com/api/health` | 12:52:48 | 403 | 52 ms | Cloudflare |
| `https://www.plataformaimpetus.com/health` | 12:52:49 | 403 | 70 ms | Cloudflare |
| `http://127.0.0.1:4000/health` (local) | 12:52:07 | 200 | 2,35 s | Origem |
| `http://127.0.0.1:3000/` (local) | 12:52:07 | 200 | — | Origem |
| nginx local c/ Host www | 12:52:07 | 301 | 1,2 ms | Origem |

**Classificação escopo incidente (11:43 UTC):** **A — todo o domínio afectado** para tráfego que depende do backend (páginas/API). Evidência: padrão histórico de 502/504 em rotas `/api/*` e indisponibilidade global quando `:4000` cai.

**Nota:** Estado actual (403) é **diferente** do 502 reportado — provável combinação de IP allowlist nginx + guard Cloudflare para IPs não autorizados nos testes da auditoria.

### 4.2 PM2 (sem reinício durante auditoria)

| Processo | Status | Uptime audit. | Restarts | PID |
|----------|--------|---------------|----------|-----|
| impetus-backend | online | ~13 min | 0* | 1426466 |
| impetus-frontend | online | ~13 min | 0* | 1426460 |
| impetus-admin-portal | online | ~13 min | 0* | 1426482 |

\*Contador PM2 resetado na resurrect de 12:39; histórico de OOM e crashes presente nos logs.

**OOM (error log — 3 ocorrências):**
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```
Imediatamente precedido por:
```
[DB][POOL_PRESSURE] {"totalCount":20,"idleCount":0,"waitingCount":27-31}
[MODBUS_TRACE] timeout exceeded when trying to connect
[MQTT_TRACE] timeout exceeded when trying to connect
```

**Lacuna de logs stdout:** 0 linhas backend out log nas horas **08, 09, 10, 11 UTC** — processo vivo mas **congelado** (event loop bloqueado).

**pm2-root.service:** falhas `start operation timed out` desde 08:54 UTC; contador ≥165 às 12:00 UTC; **Started** com sucesso às 12:39:32 UTC.

### 4.3 nginx

- **Estado:** `active`
- **Listeners:** `:80`, `:443` (nginx); `:4000`, `:3000` (apps)
- **Upstreams configurados:** `127.0.0.1:4000` (backend), `127.0.0.1:3000` (frontend), admin portal interno
- **error.log 13/Jul (upstream):** 23 entradas `upstream timed out` → `:4000` (horários 03:32–07:23 UTC)
- **502 em impetus-access.log 13/Jul:** **0** (lacuna de logging — ENOSPC)
- **504 em impetus-access.log 13/Jul:** **23** (timeout 120 s em `/api/impetus-admin/*`, `/api/auth/login`)
- **ENOSPC nginx:** múltiplos `write() failed (28: No space left on device)` desde 08:35 UTC

**Primeiro 502 comprovado em logs disponíveis:** 12/Jul/2026 20:56:18 UTC — `GET /api/impetus-admin/security-dashboard` → 502, rt=42,788 s (log rotacionado `.1`).

### 4.4 Lockdown / mecanismos defensivos SEC

| Verificação | Resultado |
|-------------|-----------|
| `/var/lib/impetus/lockdown/active.json` | **AUSENTE** |
| Lockdown activo | **NÃO** |
| threat-watch Jul 13 11:43 | **Sem eventos novos** (últimos: Jul 12 01:18 UTC) |
| Scripts emergência / quarantine | **Não activados** |

**Resposta:** O IMPETUS **NÃO** se retirou do ar por lockdown automático.

### 4.5 UFW / fail2ban

- **Cloudflare ranges:** explicitamente **ALLOW** em 80/443
- **fail2ban:** 4 jails activas; **0 IPs banidos** actualmente
- **UFW DENY:** apenas IPs atacantes históricos (scanners, SSH brute force)
- **Resposta:** **NÃO** há evidência de defesa bloqueando infraestrutura legítima (CF, localhost, nginx→app)

### 4.6 Portas vs upstream

| Upstream config | Porta | Listener confirmado |
|-----------------|-------|---------------------|
| impetus_backend | 4000 | SIM (`127.0.0.1:4000`, node) |
| impetus_frontend | 3000 | SIM (`0.0.0.0:3000`, node) |
| impetus_admin_portal | npm interno | SIM (via nginx `/painel/`) |

No instante do incidente (~11:43): backend **provavelmente sem listener** pós-OOM (~11:06) até resurrect 12:39.

### 4.7 PostgreSQL / pool

- `pg_isready`: accepting connections
- Conexões activas audit.: 11 total (5 idle, 1 active)
- `max_connections`: 100
- Erros Jul 13:
  - 07:48 UTC: `No space left on device` (extend file / pgsql_tmp)
  - 06:45–07:44 UTC: cascata `timeout exceeded when trying to connect` no backend
  - Pool pressure pré-OOM: `totalCount:20, idleCount:0, waitingCount:21-31`

**Resposta:** **SIM** — o backend ficou incapaz de responder porque aguardava/bloqueava no pool PostgreSQL, agravado por ENOSPC.

### 4.8 Recursos VPS

| Recurso | Valor audit. | Notas |
|---------|--------------|-------|
| Disco `/` | **99%** (96G/97G) | CRÍTICO — causa ENOSPC |
| RAM | 1,3 Gi used / 7,8 Gi | Sem pressão actual |
| Swap | 0 B | Sem swap configurado |
| Load avg | 1,16 / 1,01 / 0,84 | Moderado |
| OOM killer (dmesg) | Sem entradas recentes | OOM foi **Node.js heap**, não kernel |

**Consumo disco relevante:** `/var/log/journal` ~809M; PM2 rotated logs ~51M×N; `/var/www/impetus-completa/backend` ~22G.

### 4.9 Cloudflare / reachability

- DNS/resolução: funcional (testes HTTPS chegam à CF)
- SSL origin: funcional (TLS 1.3 nos logs nginx)
- Cadeia no incidente: CF → nginx **OK** → backend **FALHA** → CF traduz como **502 Host Error**

---

## 5. CORRELAÇÃO COM ATIVIDADE HOSTIL

| Actividade | Timestamp | Impacto observado |
|------------|-----------|-------------------|
| `/wp-admin/install.php?step=1` | 08:44, 08:51, 09:13, 09:30 UTC | nginx **403** instantâneo (rt=0.000) |
| `/.git/HEAD` probe | 09:04 UTC | 403 nginx |
| threat-watch bans históricos | Jul 9–12 | IPs externos banidos; **não** CF |

**Classificação de causalidade:** **POSSIVELMENTE CORRELACIONADO** (coincidência temporal), **NÃO CAUSALIDADE COMPROVADA**.

O probing HTTP foi **bloqueado com sucesso** pelo nginx (403 em <1 ms). Não há evidência de que scanners tenham derrubado o backend. A indisponibilidade correlaciona-se com **degradação interna** (disco, OOM, pool DB, PM2).

---

## 6. MECANISMOS DEFENSIVOS

| Mecanismo | Contribuiu para indisponibilidade? |
|-----------|-------------------------------------|
| Lockdown automático | **NÃO** |
| threat-watch / UFW auto-ban | **NÃO** (contra IPs atacantes apenas) |
| fail2ban | **NÃO** |
| nginx hardening (403 paths) | **NÃO** para 502 (resposta instantânea, não overload) |
| IP allowlist | **NÃO** no incidente 502; pode explicar 403 actual nos testes |
| Cloudflare proxy guard | **NÃO** para tráfego CF legítimo |

**Conclusão:** A defesa **não** causou o 502. O 403 actual nos testes da auditoria é comportamento esperado para IPs não allowlisted / testes directos.

---

## 7. CAUSA RAIZ

### Causa raiz
**Colapso operacional do `impetus-backend` por exaustão de memória heap Node.js (~2 GB), precipitado por degradação prolongada do pool PostgreSQL e disco raiz sem espaço.**

### Factores contribuintes
1. **Disco `/` a 99%** — ENOSPC impede logs, extensão PostgreSQL, I/O normal.
2. **Pool PostgreSQL saturado** — 20 conexões ocupadas, 0 idle, 21–31 em espera; queries bloqueadas.
3. **pm2-root.service instável** — loop de timeout systemd (contador ≥165), atrasou recuperação automática ~1,5 h (11:06 → 12:39).
4. **Ausência de swap** — amplifica impacto de picos de memória.
5. **Logs PM2 volumosos** (~51 MB/rotação) — agravam ENOSPC.

### Sintomas (não causas)
- Cloudflare 502 Host Error
- nginx upstream timed out / 504 (120 s)
- Lacuna em access.log (09:34–12:48 UTC)
- Backend stdout silencioso 08–11 UTC

---

## 8. ACÇÃO CORRECTIVA RECOMENDADA

**NÃO IMPLEMENTADA — aguardar decisão humana.**

Ordem mínima e segura:

1. **Libertar espaço em disco** (≥15–20 GB target) — journal, PM2 logs rotacionados, backups antigos, `/var/log/*` — **antes** de qualquer restart adicional.
2. **Verificar estado PostgreSQL** pós-ENOSPC (integridade, espaço em `base/`, temp files).
3. **Reinício controlado** do backend **apenas após** disco estabilizado — monitorizar heap e pool.
4. **Investigar causa do pool pressure** (queries longas, `assigned_to` column errors recorrentes pós-restauro).
5. **Corrigir pm2-root.service timeout** — unit systemd não deve entrar em loop de 90 s timeout.
6. **Aumentar `--max-old-space-size`** ou corrigir leak de memória JSON parsing (stack OOM aponta `JsonParser`).
7. **Alerting proactivo** — disco >85%, pool waitingCount >5, heap >80%.

---

## 9. RISCO DE RESTAURAÇÃO

**Classificação: VERMELHO**

| Factor | Risco |
|--------|-------|
| Disco 99% | Reinício sem limpeza → reincidência ENOSPC imediata |
| OOM recorrente (3× no log) | Alta probabilidade de novo crash |
| pm2-root instável | Recuperação automática não fiável |
| Pool DB degradado | Backend lento (health ~2,4 s) mesmo pós-restauro |

**Restauração imediata sem mitigar disco = alto risco de novo 502.**

---

## 10. VEREDITO FINAL

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | Por que a Cloudflare retornou 502? | A origem (nginx) não obteve resposta válida do backend `:4000` — processo morto pós-OOM ou congelado — e devolveu erro upstream; CF expôs **502 Host Error**. |
| 2 | Qual componente falhou? | **`impetus-backend` (Node.js)** — upstream nginx `127.0.0.1:4000`. |
| 3 | O IMPETUS entrou em lockdown? | **NÃO.** Sem `active.json`; sem acção defensiva de retirada. |
| 4 | A defesa bloqueou infra legítima? | **NÃO** para o incidente 502. UFW/fail2ban/threat-watch operaram correctamente. |
| 5 | PostgreSQL/pool participou da falha? | **SIM.** ENOSPC + pool exhaustion + timeouts bloquearam o backend. |
| 6 | Há relação com eventos hostis recentes? | **POSSIVELMENTE CORRELACIONADO** temporalmente; **causalidade NÃO comprovada**. Probes receberam 403 instantâneo. |
| 7 | Existe evidência de comprometimento? | **NÃO identificada** nesta auditoria. Padrões observados são consistentes com falha operacional (recursos), não intrusão. |
| 8 | Correção mínima recomendada? | **Libertar disco → estabilizar PostgreSQL → reinício controlado backend → corrigir unit PM2 → investigar memory leak/pool.** |

---

## Anexos — Ficheiros consultados (somente leitura)

- `/var/log/nginx/error.log`, `impetus-access.log`, `impetus-access.log.1`
- `/root/.pm2/logs/impetus-backend-error.log`, `impetus-backend-out.log`
- `/var/log/postgresql/postgresql-*.log`
- `/var/log/impetus-threat-watch.log`, `/var/log/impetus-disk-alerts.log`
- `journalctl -u pm2-root` (11:00–12:30 UTC)
- `/var/lib/impetus/lockdown/`
- `infra/nginx/impetus-production.conf`, `snippets/impetus-cloudflare-proxy-guard.conf`

---

*Relatório gerado por auditoria forense P0 — preservação de evidências prioritária. Nenhuma acção correctiva foi executada.*
