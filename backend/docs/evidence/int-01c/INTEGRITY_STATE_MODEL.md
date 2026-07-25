# INTEGRITY_STATE_MODEL.md
## INT-01C — Modelo de Estado Operacional

**Fase:** INT-01C  
**Data:** 2026-07-23  
**Status:** VALIDADO

---

## 1. Propósito

O modelo de estado é o contrato formal entre o Motor de Integridade e os futuros consumidores (Dashboard, Security Intelligence, Security Observatory, Incident Response). Define os campos, os valores permitidos e as semânticas de cada estado.

---

## 2. Estrutura do `state.json`

```json
{
  "schema_version": "1.0",
  "sensor_active": true,
  "sensor_started_at": "2026-07-23T13:52:50.696Z",
  "last_check": "2026-07-23T13:52:51.000Z",
  "last_hash_check": null,
  "last_perm_check": null,
  "mode": "WATCH",
  "baseline_id": "INT-01A-BASELINE-20260720",
  "baseline_version": "2026-07-20T...",
  "assets_monitored": 33,
  "ok": true,
  "violations": 0,
  "violations_last_24h": 0,
  "active_violations": [],
  "last_event": null,
  "stats": {
    "hash_checks": 0,
    "perm_checks": 0,
    "events_produced": 0,
    "events_suppressed": 0,
    "events_persisted": 0,
    "errors": 0
  },
  "metrics": {
    "avg_hash_ms": 0.8,
    "avg_scan_ms": 0,
    "avg_correlation_ms": 0,
    "p95_hash_ms": 4,
    "heap_mb": 4.28,
    "rss_mb": 40.95,
    "external_mb": 1.67,
    "queue_size": 0,
    "samples": { "hash": 0, "scan": 0, "correlation": 0 }
  },
  "last_error": null
}
```

---

## 3. Estados Formais do Motor

| Estado (`mode`) | Descrição | Condições |
|---|---|---|
| `STOPPED` | Motor parado | `stop()` chamado; processo a terminar |
| `WATCH` | Operação normal | Baseline + inventário carregados; todos os checkers activos |
| `DEGRADED` | Operação reduzida | Baseline ou inventário indisponível; HashChecker/PermChecker suspensos; AuditdBridge pode continuar |
| `SUSPENDED` | Pausado por política | Deploy mode activo > limiar configurado |

---

## 4. Transições de Estado

```
                   start() + baseline OK
   STOPPED ─────────────────────────────────────► WATCH
      │                                             │  ▲
      │                                             │  │ tryRecover() + baseline restaurado
      │ start() + baseline ausente                  │  │
      ▼                                             ▼  │
   DEGRADED ────────────────────────────────────────►  │
                   tryRecover() falha               │
                                                    ▼
                                               stop() → STOPPED
```

**Regras de transição:**
- `WATCH → DEGRADED`: apenas se baseline / inventário ficarem indisponíveis em runtime (não implementado no watcher ainda — futuro INT-01D).
- `DEGRADED → WATCH`: via `tryRecover()` chamado pelo Watchdog ou pelo operador.
- `DEGRADED → STOPPED`: `stop()` sempre funciona.
- `STOPPED → WATCH` ou `STOPPED → DEGRADED`: apenas via `start()`.

---

## 5. Campos por Consumidor Futuro

### Dashboard Service (INT-01D)
Campos mínimos necessários para exibição no painel:

| Campo | Tipo | Uso |
|---|---|---|
| `sensor_active` | boolean | Indicador "sensor ligado/desligado" |
| `mode` | string | Estado principal (WATCH / DEGRADED / STOPPED) |
| `ok` | boolean | Semáforo verde/vermelho |
| `violations` | integer | Contador acumulado de violações |
| `violations_last_24h` | integer | Violações nas últimas 24h |
| `assets_monitored` | integer | Activos sob vigilância |
| `last_check` | ISO timestamp | Última actualização |
| `baseline_id` | string | Identificador do baseline activo |

### Security Intelligence
| Campo | Tipo | Uso |
|---|---|---|
| `stats.events_produced` | integer | Taxa de eventos |
| `stats.events_suppressed` | integer | Taxa de supressão (falsos positivos) |
| `stats.events_persisted` | integer | Eventos relevantes persistidos |
| `mode` | string | Contexto operacional |

### Security Observatory
Consome `events.jsonl` directamente. Campos por evento:
- `event_id`, `event_type`, `asset_path`, `severity_final`, `asset_criticality`
- `timestamp`, `sensor_component`, `false_positive_score`, `escalate_to_observatory`
- `suppress_reason` (se suprimido), `confidence`

### Incident Response
| Campo | Tipo | Uso |
|---|---|---|
| `last_error` | string\|null | Diagnóstico rápido |
| `active_violations` | array | Violações activas para triagem |
| `last_event` | object | Último evento para contexto |
| `mode` | string | Avaliar se motor está operacional |

---

## 6. Semântica de `ok`

| `ok` | `mode` | Interpretação |
|---|---|---|
| `true` | `WATCH` | Sistema íntegro, sensor activo |
| `true` | `DEGRADED` | Sensor activo mas com capacidade reduzida |
| `false` | `WATCH` | Violação(ões) detectada(s) — requer atenção |
| `false` | `DEGRADED` | Sensor com falha + possível violação |
| `false` | `STOPPED` | Sensor parado — dados podem estar desactualizados |

---

## 7. Staleness Detection

`IntegrityStateStore.readStateFile()` aplica detecção de staleness:

```javascript
const maxAge = 2 × INTEGRITY_HASH_CHECK_INTERVAL × 1000;  // default: 600s
if (age > maxAge) return { ...data, sensor_active: false, stale: true };
```

Um consumidor que receber `stale: true` deve exibir aviso em vez de estado desactualizado.

---

## 8. Validação do Modelo (INT-01C)

| Teste | Resultado |
|---|---|
| `mode=WATCH` após arranque normal | ✅ PASS |
| `mode=DEGRADED` com baseline ausente | ✅ PASS |
| `mode=WATCH` após `tryRecover()` | ✅ PASS |
| `mode=STOPPED` após `stop()` | ✅ PASS |
| `last_error` preenchido em DEGRADED | ✅ PASS |
| `last_error=null` após recuperação | ✅ PASS |
| Campos de compatibilidade presentes | ✅ PASS (27/27 testes) |

---

**STATE_MODEL_VALIDATED = TRUE**
