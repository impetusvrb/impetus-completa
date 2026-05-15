# Validação de boot — IMPETUS

**Data (UTC):** 2026-05-12T17:40Z

## 1. Critérios

- Processo Node principal sobe sem erro fatal imediato.
- Health endpoints respondem.
- Logs de arranque mostram serviços críticos anunciados (voice WS, realtime proxy, schedulers).
- Sem dependência circular bloqueante visível no arranque (síntoma típico: crash antes de `listen`).

## 2. Evidências (stdout PM2, cauda pós-restart)

Trechos úteis observados:

```
[VOICE_WS] Namespace /impetus-voice ativo
[realtime-proxy] ativo em /impetus-realtime (modelo padrão: gpt-realtime)
[REMINDER] Scheduler iniciado
[SYSTEM_METRICS] Persistência de métricas a cada 60000ms …
[OPERATIONAL_BRAIN] Alert checker ativo (5 min)
[DATA_LIFECYCLE] Retenção/expurgo agendado …
[EVENT_PIPELINE_BOOT] {"ok":false,"reason":"disabled_by_env"}
[impetus-backend] http://0.0.0.0:4000  (health: /health  deep: /api/system/health/deep)
```

## 3. Health

| Verificação | Resultado |
|-------------|-----------|
| `/api/system/health/deep` | `ready: true`, `issues: []` |
| `/health` | HTTP 200 |

## 4. Tags de log solicitadas (`[UNIFIED_ORCHESTRATOR]`, `[EVENT_BACKBONE]`, `[POLICY_*]`, …)

- Estas tags aparecem sobretudo durante **pedidos** ou **jobs** que exercitam esses subsistemas, não necessariamente na primeira linha do boot.
- **Validação indirecta:** suite de testes cognitivos pós-restart (ver `post-restart-smoke-tests.md`) exercita camadas de policy em processo isolado; o runtime PM2 serve a API com módulos carregáveis via `require` lazy ou no arranque conforme `server.js`.

## 5. Duplicação de listeners

- Um único `httpServer.listen(PORT)` no fluxo principal; Socket.io no mesmo servidor — evita segunda porta accidental para HTTP API.

## 6. Migrations vs schema

- Tabela `cognitive_event_backbone` aplicada na mesma janela — alinhamento schema/backbone para persistência futura.

## 7. Conclusão

**Boot válido** para operação; manter monitorização e revisão periódica de logs para tags `[UNIFIED_ORCHESTRATOR]` / `[EVENT_BACKBONE]` sob carga real.

---

*Documento técnico de verificação pós-deploy.*
