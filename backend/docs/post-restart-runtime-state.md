# Estado do runtime pós-restart — IMPETUS

**Data (UTC):** 2026-05-12T17:40Z  
**Ordem executada:** (1) migrations pendentes seguras → (2) `pm2 restart impetus-backend --update-env` → (3) `pm2 restart impetus-frontend --update-env` → (4) validação HTTP.

## 1. PIDs e processos

| App PM2 | PID anterior (referência) | PID novo | Estado |
|---------|---------------------------|----------|--------|
| `impetus-backend` | 2786800 | **2911621** | online |
| `impetus-frontend` | 2787694 | **2911648** | online |

## 2. Validação HTTP imediata

- `GET /health` (porta 4000): **200**

## 3. Portas confirmadas

- **4000** — API + Socket.io no mesmo processo.
- **3000** — frontend.

## 4. Socket.io / realtime (boot log)

Linhas relevantes no stdout pós-arranque:

- `[VOICE_WS] Namespace /impetus-voice ativo`
- `[realtime-proxy] ativo em /impetus-realtime (modelo padrão: gpt-realtime)`
- Servidor a escutar: `[impetus-backend] http://0.0.0.0:4000`

## 5. Schedulers e jobs internos

- `[REMINDER] Scheduler iniciado`
- `[SYSTEM_METRICS] Persistência …`
- `[OPERATIONAL_BRAIN] Alert checker ativo`
- `[DATA_LIFECYCLE] Retenção/expurgo agendado`
- `[EVENT_PIPELINE_BOOT] {"ok":false,"reason":"disabled_by_env"}` — coerente com pipeline desactivado por ENV.

## 6. Queues / caches externos

- Não há processo PM2 dedicado a Redis/memcached no mapa PM2 deste host; filas cognitivas in-process / PG conforme serviços.
- **Workers** npm listados em `package.json` não foram reiniciados por PM2 nesta operação (não mapeados como apps).

## 7. Modo de observação operacional (Fase 10)

Durante as próximas horas / dias:

1. **PM2:** `pm2 monit` ou métricas — memória, CPU, contador de restarts.
2. **Logs:** `/root/.pm2/logs/impetus-backend-*.log` — erros 5xx, timeouts, `[AI_ERROR]`.
3. **Backbone:** volume de inserts em `cognitive_event_backbone` se `IMPETUS_EVENT_BACKBONE_PERSIST=true`.
4. **Latência:** nginx/upstream 4000 e 3000.
5. **Governança:** activar gradualmente kill-switches conforme política de produto (sem authority automática).

**Não** introduzir novas meta-camadas nem authority runtime nesta fase.

---

*Relatório operacional; sem segredos.*
