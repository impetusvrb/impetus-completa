# INTEGRITY_TELEMETRY_IMPLEMENTATION.md
## INT-01C — Implementação da Telemetria Interna

**Fase:** INT-01C — Telemetria Interna e Validação Operacional  
**Data:** 2026-07-23  
**Status:** CONCLUÍDO  
**Classificação:** INTERNAL — SHADOW MODE — SEM INTEGRAÇÃO COM DASHBOARD

---

## 1. Contexto

O INT-01B entregou um Motor de Integridade funcional operando em Shadow Mode. A fase INT-01C adiciona a infraestrutura de telemetria interna que:

1. Persiste o estado operacional do motor em `state.json` (escrita atómica).
2. Regista eventos de integridade em `events.jsonl` (append-only, rotação controlada).
3. Coleta métricas de desempenho operacional (hash, scan, correlação, memória).
4. Valida resiliência e recuperação automática sem integrar o Dashboard.

---

## 2. Componentes Implementados

### 2.1 `IntegrityStateStore.js`

| Propriedade | Valor |
|---|---|
| Localização | `backend/src/services/integrity/IntegrityStateStore.js` |
| Padrão | Singleton thread-safe (processo único Node.js) |
| Ficheiro de estado | `/var/lib/impetus/integrity/state.json` |
| Ficheiro de eventos | `/var/lib/impetus/integrity/events.jsonl` |
| Histórico rotacionado | `/var/lib/impetus/integrity/baseline_history/events.<ts>.jsonl` |
| Permissões do directório | `0o700` (acesso restrito a root/impetus) |

**Escrita atómica do `state.json`:**

```
1. fs.writeFileSync(state.json.tmp, payload, 'utf8')
2. fs.renameSync(state.json.tmp, state.json)    // atómico no mesmo filesystem
```

**Rotação do `events.jsonl`:**
- Trigger: tamanho acumulado > `INTEGRITY_EVENTS_MAX_MB` (default: 50 MB)
- Ficheiros antigos eliminados após `INTEGRITY_EVENTS_RETAIN_DAYS` (default: 30 dias)
- Rotação não bloqueia a thread principal

**API pública:**

| Método | Descrição |
|---|---|
| `init(initialState)` | Inicializa directório + state.json; preserva stats históricos |
| `update(patch)` | Merge parcial de estado + escrita atómica |
| `appendEvent(event)` | Append a events.jsonl; actualiza state.json |
| `getState()` | Devolve snapshot do estado em memória |
| `getStoreStats()` | Estatísticas internas (writes, appends, rotations, errors) |
| `readStateFile()` (static) | Lê state.json do disco; detecta staleness |

### 2.2 `IntegrityMetricsCollector.js`

| Propriedade | Valor |
|---|---|
| Localização | `backend/src/services/integrity/IntegrityMetricsCollector.js` |
| Janela deslizante | 100 amostras por métrica |
| Métricas coletadas | avg_hash_ms, avg_scan_ms, avg_correlation_ms, p95_hash_ms, heap_mb, rss_mb, queue_size |

**API pública:**

| Método | Descrição |
|---|---|
| `recordHash(ms)` | Regista tempo de um SHA256 individual |
| `recordScan(ms)` | Regista tempo de um ciclo completo de scan |
| `recordCorrelation(ms)` | Regista tempo de processamento na CorrelationEngine |
| `snapshot(queueSize)` | Devolve snapshot actual de todas as métricas |

### 2.3 Actualizações nos componentes existentes

#### `IntegrityCorrelationEngine.js` (actualizado)

Adicionado suporte a `stateStore` e `metricsCollector` (parâmetros opcionais no construtor para retrocompatibilidade com testes INT-01B):

- Após processar cada evento: chama `stateStore.appendEvent(enriched)` para eventos MEDIUM/HIGH/CRITICAL não suprimidos.
- Actualiza `stats.events_produced` e `stats.events_suppressed` em `stateStore.update()`.
- Regista tempo de correlação em `metricsCollector.recordCorrelation(ms)`.
- Incrementa `violations` no state store quando severity ≥ HIGH.

#### `IntegrityEngine.js` (actualizado)

- Instancia `IntegrityStateStore` (singleton) e `IntegrityMetricsCollector`.
- Wraps `IntegrityHashChecker` com `IntegrityHashCheckerInstrumented` para registar tempos.
- Chama `store.init(...)` com campos de baseline no arranque.
- Timer de 30 s para `_flushMetrics()` → actualiza campo `metrics` no state.json.
- Método `tryRecover()`: tenta recarregar baseline e retomar modo WATCH a partir de DEGRADED.

---

## 3. Fluxo de Dados Interno

```
[HashChecker / PermChecker / AuditdBridge]
        │ emit event
        ▼
  [IntegrityEventBus]   ── dedup 30s ──▶ [descartado se duplicado]
        │ integrity_event
        ▼
  [IntegrityCorrelationEngine]
        │ enrich + classify + fp-suppress
        ├──▶ /var/log/impetus-integrity-shadow.log  (todos os eventos)
        └──▶ IntegrityStateStore.appendEvent()      (MEDIUM/HIGH/CRITICAL não suprimidos)
                  ├──▶ /var/lib/impetus/integrity/events.jsonl
                  └──▶ /var/lib/impetus/integrity/state.json  (atómico)
```

---

## 4. Modelo de Estado Formal

Ver `INTEGRITY_STATE_MODEL.md` (documento dedicado).

---

## 5. Variáveis de Ambiente

| Variável | Default | Descrição |
|---|---|---|
| `INTEGRITY_STATE_DIR` | `/var/lib/impetus/integrity` | Directório para state.json e events.jsonl |
| `INTEGRITY_EVENTS_MAX_MB` | `50` | Tamanho máximo de events.jsonl antes de rotação |
| `INTEGRITY_EVENTS_RETAIN_DAYS` | `30` | Dias de retenção dos ficheiros rotacionados |
| `INTEGRITY_SENSOR_ENABLED` | `false` | Flag de activação do sensor |
| `INTEGRITY_HASH_CHECK_INTERVAL` | `300` | Intervalo de varredura em segundos |
| `INTEGRITY_SHADOW_LOG` | `/var/log/impetus-integrity-shadow.log` | Log de shadow mode |
| `INTEGRITY_AUDIT_LOG` | `/var/log/audit/audit.log` | Log do auditd |
| `INTEGRITY_DEPLOY_SUPPRESS_MINUTES` | `10` | Janela de supressão após deploy |

---

## 6. Ficheiros Adicionados/Modificados

| Ficheiro | Tipo | LOC | Descrição |
|---|---|---|---|
| `IntegrityStateStore.js` | Novo | ~150 | State.json atómico + events.jsonl |
| `IntegrityMetricsCollector.js` | Novo | ~65 | Coleta de métricas com janela deslizante |
| `IntegrityCorrelationEngine.js` | Actualizado | +40 | Integração com StateStore e MetricsCollector |
| `IntegrityEngine.js` | Actualizado | +60 | Orquestração com StateStore, Métricas, tryRecover() |
| `tests/runResilienceTests.js` | Novo | ~310 | Testes FASES 4, 5, 6, 7 |
| `/var/lib/impetus/integrity/` | Dir | — | Directório de estado em produção (mode 0700) |

**Ficheiros NÃO modificados:** `server.js`, `IntegrityRuntime.js`, `IntegrityHashChecker.js`, `IntegrityPermChecker.js`, `IntegrityAuditdBridge.js`, `IntegrityEventBus.js`, `IntegrityBaselineManager.js`, todos os serviços certificados.

---

## 7. Cadeia de Custódia

| Artefacto | Hash preservado | Localização |
|---|---|---|
| `baseline.json` | Intacto (INT-01A) | `backend/security/integrity/baseline.json` |
| `asset_inventory.json` | Intacto (INT-01A) | `backend/security/integrity/asset_inventory.json` |
| Shadow log INT-01B | Preservado | `/var/log/impetus-integrity-shadow.log` |
| Evidências INT-01A | Intactas | `backend/docs/evidence/int-01a/` |
| Evidências INT-01B | Intactas | `backend/docs/evidence/int-01b/` |

---

**INT-01C — Telemetria Interna: IMPLEMENTADO**
