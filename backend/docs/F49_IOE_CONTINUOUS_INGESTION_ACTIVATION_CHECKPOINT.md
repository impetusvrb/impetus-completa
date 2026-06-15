# F49-C — IOE Continuous Ingestion Activation Checkpoint

**Gerado:** 2026-06-14T19:13:08.427Z
**Modo:** READ ONLY · CHECKPOINT ONLY · sem activação automática

## Contexto (F49-B)

A auditoria F49-B concluiu que a pausa de IOE é **controlada** (`worker_stopped`), não falha operacional.
Este checkpoint garante que, antes de piloto permanente ou observação contínua, os workers
não permaneçam desactivados por configuração de certificação.

> **Nota:** variáveis efectivas usam prefixo `IMPETUS_` (ex.: `IMPETUS_AIOI_OUTBOX_WORKER_ENABLED`).

## Estado actual

```json
{
  "continuous_ingestion_enabled": false,
  "outbox_worker_enabled": false,
  "event_pipeline_boot_ok": false,
  "continuous_ingestion_ready": false,
  "event_pipeline_operational": false
}
```

## Checklist pré-deploy / pós-activação

| # | Item | Fase | Estado |
|---|------|------|--------|
| 1 | IMPETUS_AIOI_OUTBOX_WORKER_ENABLED=true | pre_deploy | FAIL |
| 2 | IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED=true | pre_deploy | FAIL |
| 3 | EVENT_PIPELINE_BOOT ok:true após restart | post_restart | FAIL |
| 4 | Geração de novos IOE | post_activation | FAIL |
| 5 | Entrega aioi_outbox + industrial_operational_events | post_activation | FAIL |

## Critério F49-C

```json
{
  "continuous_ingestion_ready": false,
  "event_pipeline_operational": false
}
```

## Bloqueio actual

`Workers desactivados por configuracao (F49-B root_cause: worker_stopped)`

## Passos do operador (manual)

- 1. Definir IMPETUS_AIOI_OUTBOX_WORKER_ENABLED=true no .env
- 2. Definir IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED=true no .env
- 3. Definir IMPETUS_EVENT_PIPELINE_ENABLED=true no .env (se pipeline cognitivo necessario)
- 4. Confirmar IMPETUS_AIOI_ENABLED=true e IMPETUS_AIOI_PILOT_TENANTS configurados
- 5. Executar pm2 restart impetus-backend --update-env (decisao manual)
- 6. Re-executar este checkpoint e confirmar Items 3–5

---

*F49-C — checkpoint read-only. Nenhuma alteração operacional executada.*
