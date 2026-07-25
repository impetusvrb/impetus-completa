# INTEGRITY_OPERATIONAL_OBSERVABILITY.md
## SEC-OBS-002 — Observabilidade Operacional do Sensor de Integridade

**Fase:** SEC-OBS-002  
**Data:** 2026-07-23  
**Status:** PASS  
**Flag:** `INTEGRITY_SENSOR_ENABLED=true` (activada nesta missão)

---

## 1. Activação Controlada (FASE 1)

| Campo | Valor |
|---|---|
| Início | 2026-07-23T14:28:43Z |
| Fim | 2026-07-23T14:28:58Z |
| Indisponibilidade aproximada | ~15 s (health 200 após ~12–15 s) |
| Processo | `pm2 restart … --only impetus-backend --update-env` |
| PID | 3134989 → 3140001 |
| Confirmação de boot | `[INTEGRITY_SENSOR] Motor de integridade iniciado` (14:29:08Z) |

Variáveis activadas em `backend/.env`:

```
INTEGRITY_SENSOR_ENABLED=true
INTEGRITY_SENSOR_VERBOSE=true
INTEGRITY_HASH_CHECK_INTERVAL=30
INTEGRITY_PERM_CHECK_INTERVAL=20
```

Intervalos reduzidos apenas para a janela de observação SEC-OBS-002 (acelerar ciclos).

---

## 2. Estado Operacional Publicado

`/var/lib/impetus/integrity/state.json` após arranque:

| Campo | Valor |
|---|---|
| sensor_active | true |
| mode | WATCH |
| assets_monitored | 35 |
| baseline_id | INT-01A-BASELINE-20260723 |
| ok | false (violações de drift legítimo) |
| violations | ≥4 (ver secção 3) |
| last_error | null |

---

## 3. Telemetria Observada no Arranque

Na primeira varredura (~2 s pós-start), o motor detectou divergências reais face ao baseline INT-01A — **esperadas** após evolução INT-01B/C/D:

| Asset | Tipo | Severidade | Causa |
|---|---|---|---|
| INT-C-001 `server.js` | HASH_CHANGED | CRITICAL | Hook de inicialização INT-01B |
| INT-C-002 `.env` | HASH_CHANGED | CRITICAL | Flag SEC-OBS-002 |
| INT-H-001 Dashboard Service | HASH_CHANGED | HIGH | Integração INT-01D |
| INT-H-002 Intelligence Service | HASH_CHANGED | HIGH | Integração INT-01D |

Isto confirma telemetria operacional real, não simulação.

Camada INTEGRITY no Intelligence: **ATUOU** (violations > 0).

---

## 4. Consumo pelo Centro de Comando

`getIntegrityState()` (Dashboard Service):

- `available: true`
- `mode`, `assets_monitored`, `baseline_id`, `violations`, `last_check`, `stats` presentes
- `avg_read_ms ≈ 0`–`0.5 ms`
- Fallbacks: 0 em estado válido

---

## 5. Cadeia de Observabilidade

```
Motor (WATCH)
  → state.json + events.jsonl
  → getIntegrityState()
  → payload.integrity_state
  → case 'INTEGRITY' → ATUOU | OBSERVADA | SEM_TELEMETRIA
```

**OBSERVABILITY_CERTIFIED = TRUE** (telemetria gerada, persistida e consumível).

---

## 6. Nota para SEC-BASELINE-002

O baseline criptográfico deve ser regenerado após certificação para absorver alterações legítimas INT-01B/C/D e fechar violações permanentes de drift de implementação.
