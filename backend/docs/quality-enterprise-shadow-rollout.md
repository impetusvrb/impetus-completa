# Quality — Shadow rollout operacional

## Objectivo

Validar em produção controlada:

- tempo de import do chunk operacional / shadow probe;
- estabilidade de reconnect do socket (métrica `rto` na status bar);
- profundidade de fila offline;
- overhead de bundle sem expor UI completa a todos os utilizadores.

## Activação

```bash
VITE_IMPETUS_QUALITY_OPERATIONAL_SHADOW_MODE=true
```

Opcional em conjunto com flags parciais (ex.: operational OFF, shadow ON) — o bootstrap em `main.jsx` apenas corre `import()` de `qualityShadowChunkProbe.js` em `requestIdleCallback` e grava `sessionStorage.impetus_q_shadow_chunk_ms`.

## Telemetry-only

- Não monta rotas nem hooks de realtime por si só.
- Com `VITE_IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED=false`, utilizadores normais não vêm redirecionados para `/app/quality/*`; o card em `Operacional.jsx` também fica oculto (build-time).

## Painel diagnostics

Com shadow OU `VITE_IMPETUS_QUALITY_OPERATIONAL_DIAGNOSTICS=true`, o workspace mostra fila offline, contadores de anexo/scanner e reconnects (snapshot em memória).

## Plano de escalonamento

1. Shadow ON, operational OFF — medir chunk ms e erros de consola.
2. Operational ON, pilot users — colaborador com path `/app/quality/operacional` permitido na guard.
3. Realtime collection ON (backend + frontend) — validar eventos `quality_operational_update` na sala `company:*`.
4. Kiosk ON apenas em tablets de posto.

## Rollback

Desligar `VITE_IMPETUS_QUALITY_OPERATIONAL_SHADOW_MODE` e rebuild; limpar `sessionStorage` keys `impetus_q_*` se necessário em QA.
