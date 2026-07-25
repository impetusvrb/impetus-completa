# Integrity Sensor Reference — IMPETUS

**Documento:** INTEGRITY_SENSOR_REFERENCE.md  
**Missão:** GAP-INT-01-ARCH  
**Data:** 2026-07-23  
**Status:** REFERENCE_DEFINED

---

## 1. Visão geral do sensor

O Integrity Sensor IMPETUS é um componente de monitoramento dedicado que detecta alterações não autorizadas em activos críticos da plataforma. Opera em modo passivo (observação e alerta); nunca bloqueia operações do sistema.

---

## 2. Componentes e responsabilidades

### 2.1 AuditdBridge

**Responsabilidade:** Consumir eventos do sistema de auditoria do kernel Linux (`auditd`), filtrar eventos relevantes ao IMPETUS e convertê-los para o formato de evento de integridade.

**Entradas:**
- `/var/log/audit/audit.log` (leitura tail)
- Alternativamente: `ausearch` ou socket do audispd

**Filtros activos:**
- `key=impetus_repo_write` → eventos de escrita no repositório
- `key=impetus_delete` → deleções em backend/ e frontend/
- `key=impetus_env` → acesso ao `.env`
- `key=impetus_exec_rm` → execução de rm no sistema
- `key=impetus_root_exec` → execuções como root

**Processamento:**
1. Tail do `audit.log` desde último offset (persistido em state)
2. Parse de linhas `type=SYSCALL` e `type=PATH`
3. Extracção: `timestamp`, `syscall`, `path`, `uid`, `pid`, `key`
4. Mapeamento para `IntegrityEvent`

**Limitações:**
- Lag até ~1s (kernel flush do buffer auditd)
- `impetus_root_exec` pode gerar volume alto; throttle necessário

---

### 2.2 HashChecker

**Responsabilidade:** Calcular SHA256 de activos críticos, comparar com baseline e emitir eventos quando divergência é detectada.

**Entradas:**
- Lista de activos configurada (por criticidade)
- `baseline.json` em `/var/lib/impetus/integrity/`

**Ciclo de execução:**
1. A cada `INTEGRITY_HASH_CHECK_INTERVAL` segundos (default: 300s = 5min)
2. Para cada activo: verificar `mtime` via `stat()`
3. Se `mtime` mudou desde último check: calcular SHA256
4. Comparar com baseline; se divergente → emitir `INTEGRITY_HASH_CHANGED`
5. Se baseline não existir para activo → emitir `INTEGRITY_BASELINE_MISSING`
6. Actualizar `last_mtime` e `last_hash` no state

**Optimização diferencial:**
- Apenas re-faz hash se `mtime` mudou → custo normal ≈ 0 CPU (só stat())
- Hash de `server.js` (~100 KB): < 5ms; custo marginal

**Operação de inicialização:**
- `--init-baseline` ou `INTEGRITY_INIT_BASELINE=true` no arranque
- Calcula SHA256 de todos os activos e persiste em `baseline.json`
- Deve ser executado após deploy verificado, nunca automaticamente

---

### 2.3 PermChecker

**Responsabilidade:** Verificar permissões (mode bits) e owner (uid/gid) de activos críticos, detectando alterações inesperadas.

**Entradas:**
- Lista de activos com permissões esperadas (`expected_mode`, `expected_owner`)

**Activos monitorados (permissões esperadas):**

| Activo | Mode esperado | Owner esperado |
|---|---|---|
| `backend/.env` | 600 ou 640 | root ou www-data |
| `ecosystem.runtime.config.cjs` | 644 | root |
| `/etc/nginx/sites-enabled/impetus` | 644 | root |
| `privkey.pem` | 600 | root |
| `/usr/local/bin/impetus-*.sh` | 755 | root |

**Ciclo:** A cada `INTEGRITY_PERM_CHECK_INTERVAL` segundos (default: 120s = 2min)

---

### 2.4 Integrity Event Bus

**Responsabilidade:** Receber eventos de todos os watchers, desduplicar, ordenar por prioridade e entregar ao Correlation Engine.

**Implementação:** `EventEmitter` do Node.js com fila FIFO em memória.

**Desduplicação:**
- Janela: 30 segundos
- Chave: `(asset_path, event_type)`
- Em burst (deploy): suprime duplicados, agrega contador

**Throttle:**
- `impetus_root_exec`: máximo 10 eventos/min; agrupa em burst
- `impetus_repo_write`: máximo 50 eventos/min

---

### 2.5 Integrity Correlation Engine

**Responsabilidade:** Enriquecer eventos com contexto, classificar severidade final, suprimir falsos positivos conhecidos e persistir no state store.

**Supressão de falsos positivos:**

| Condição | Acção |
|---|---|
| `IMPETUS_DEPLOY_MODE=active` | Suprime `HASH_CHANGED` e `PERM_CHANGED` por 10 min após deploy |
| `certbot renewal` detectado (path contém `letsencrypt`) | Suprime `CERT_CHANGED` por 5 min |
| `npm install` em curso (lock file `package-lock.json` em mutação) | Suprime `node_modules/` |
| Rotação de log (ficheiro `.log` em `/var/log/`) | Ignorado por baseline |

**Enriquecimento:**
- Lookup do activo na tabela de criticidade → `asset_criticality`
- Lookup de `uid` para nome de utilizador (quando disponível)
- Score de confiança: `HIGH` se auditd + hash convergem; `MEDIUM` se apenas um

---

### 2.6 Integrity State Store

**Estrutura de ficheiros:**

```
/var/lib/impetus/integrity/
├── baseline.json        # Hashes de referência (SHA256 por activo)
├── state.json           # Estado actual do sensor
├── events.jsonl         # Log append-only de eventos (NDJSON)
└── perm_baseline.json   # Permissões de referência
```

**`state.json` (estrutura):**
```json
{
  "sensor_active": true,
  "sensor_started_at": "2026-07-23T08:00:00Z",
  "last_check": "2026-07-23T08:05:00Z",
  "last_hash_check": "2026-07-23T08:05:00Z",
  "last_perm_check": "2026-07-23T08:04:00Z",
  "last_auditd_offset": 1048576,
  "ok": true,
  "violations": 0,
  "active_violations": [],
  "last_event": null,
  "assets_monitored": 42,
  "assets_baseline_ok": 42
}
```

**`baseline.json` (estrutura):**
```json
{
  "version": "1.0",
  "created_at": "2026-07-23T08:00:00Z",
  "created_by": "integrity-init",
  "assets": {
    "/var/www/impetus-completa/backend/src/server.js": {
      "sha256": "a3f...",
      "size": 104260,
      "mtime": 1784661314,
      "criticality": "CRITICAL"
    }
  }
}
```

---

### 2.7 Watchdog interno

**Responsabilidade:** Detectar falha do próprio sensor e gerar evento `INTEGRITY_SENSOR_DOWN`.

**Mecanismo:**
- `heartbeat` escrito em `state.json` a cada ciclo
- Watchdog verifica que `last_check` não é mais antigo que `2 × HASH_CHECK_INTERVAL`
- Se mais antigo: emite `INTEGRITY_SENSOR_DOWN` para o threat-watch log

---

## 3. Modos de operação

| Modo | Descrição |
|---|---|
| `INIT` | Criação do baseline inicial; apenas na primeira activação ou após deploy autorizado |
| `WATCH` | Operação normal; todos os watchers activos |
| `DEGRADED` | AuditdBridge falhou; apenas HashChecker e PermChecker activos |
| `SUSPENDED` | `IMPETUS_DEPLOY_MODE=active`; supressão temporária de alertas |
| `STOPPED` | Sensor parado; telemetria indica `SEM_TELEMETRIA` |

---

## 4. Integração no processo backend

O sensor será carregado como módulo no arranque do servidor:

```
backend/src/server.js
  └── require('./services/integrityMonitorService.js')  [opcional; try-catch]
        ├── AuditdBridge.start()
        ├── HashChecker.start()
        ├── PermChecker.start()
        └── EventBus.on('integrity_event', correlationEngine.process)
```

Carregamento condicional via variável de ambiente:
```
INTEGRITY_SENSOR_ENABLED=true   # default: false (fase de transição)
```

---

## 5. Canal de saída — threat-watch log

Formato de evento no log (compatível com pipeline existente):
```
[2026-07-23T08:05:00Z] ALERT CRITICAL INTEGRITY_BREACH 192.0.2.1 "HASH_CHANGED backend/src/server.js prev=a3f curr=b7e"
```

Campos separados por espaço:
1. `[timestamp]`
2. `ALERT`
3. `severity` (CRITICAL | HIGH | MEDIUM | LOW)
4. `event_type` (INTEGRITY_BREACH | INTEGRITY_ANOMALY)
5. `origin_ip` (quando disponível; `0.0.0.0` se não aplicável)
6. `detail` (quoted string com contexto)

Este formato permite que o pipeline existente do `adminPortalSecurityDashboardService.js` consuma os alertas sem modificação.

---

## 6. Configuração via variáveis de ambiente

| Variável | Default | Descrição |
|---|---|---|
| `INTEGRITY_SENSOR_ENABLED` | `false` | Liga/desliga o sensor |
| `INTEGRITY_HASH_CHECK_INTERVAL` | `300` | Segundos entre hash checks |
| `INTEGRITY_PERM_CHECK_INTERVAL` | `120` | Segundos entre perm checks |
| `INTEGRITY_INIT_BASELINE` | `false` | Inicializa baseline no arranque |
| `INTEGRITY_STATE_DIR` | `/var/lib/impetus/integrity` | Directório do state store |
| `INTEGRITY_DEPLOY_SUPPRESS_MINUTES` | `10` | Supressão durante deploy |
| `INTEGRITY_LOG_PATH` | `/var/log/impetus-threat-watch.log` | Canal de saída |
| `INTEGRITY_AUDIT_LOG` | `/var/log/audit/audit.log` | Fonte auditd |
