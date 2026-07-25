# IMPETUS-BACKEND-STABILITY-P0-002 — Estado operacional

**Início:** 2026-07-14T13:26:17Z (T0)  
**Soak monitor:** activo (4h, intervalo 5 min)  
**Classificação actual:** `BACKEND_STABILITY_PARTIALLY_RESTORED` + soak em curso

---

## Acções iniciadas

| Acção | Estado |
|---|---|
| Snapshot T0 | ✅ Completo |
| Soak monitor 4h | 🔄 Em execução (background) |
| Pre-flight arquivo externo | ✅ `EXTERNAL_ARCHIVE_DESTINATION_NOT_READY` |
| Novos patches de código | ❌ Nenhum |
| Exclusão de originais | ❌ Nenhuma |

---

## T0 — referência

| Métrica | Valor |
|---|---|
| PM2 restarts | 22 (pós-fix restart) |
| Backend RSS | ~379 MB (`VmRSS` 387968 kB) |
| Pool | total=0 idle=0 waiting=0 (amostra isolada) |
| Outbox delivered | **10.690.957** |
| Outbox PG size | **28 GB** (heap 23 GB + idx 5.7 GB) |
| Disco `/` | **97%** (3.9 GB livres) |
| health / bot-config | 200 / ~3 ms |
| OOM count (log histórico) | 2 |
| BASELINE_001 + SEC-01 | ✅ pass |

---

## Soak monitor

- **Script:** `soak-monitor.sh` (v2 non-interfering desde 2026-07-14T13:39:38Z)
- **Log:** `soak-monitor.log`
- **Amostras:** `samples/sample-NNNN-*.json`
- **Fim previsto:** ~2026-07-14T17:27:05Z
- **Methodology change:** `../backend-stability-p0-003/METHODOLOGY-CHANGE.md`
- **Amostras 0001–0002:** v1 (COUNT pesado); **0003+:** v2 (sem COUNT delivered entre checkpoints)

Verificar progresso:
```bash
tail -f /var/www/impetus-completa/backend/docs/evidence/backend-stability-p0-002/soak-monitor.log
ls -la /var/www/impetus-completa/backend/docs/evidence/backend-stability-p0-002/samples/
```

---

## Archive — próxima observação

- Backend restart: ~13:06 UTC
- Scheduler archive: intervalo 1h → **primeiro ciclo pós-fix esperado ~14:06 UTC**
- Monitor capturará batches reais (não assumir 100k/h)

---

## Arquivo externo

Ver: `PHASE-G-PREFLIGHT-EXTERNAL-ARCHIVE.md`

**Destino externo não montado neste VPS.** Transferência requer workstation + disco ~1 TB via scp/rsync **para fora** do servidor.

Staging packages: hashes T0 confirmados vs manifest ✅

---

## Critérios para `BACKEND_STABILITY_RESTORED`

Requer soak ≥4h completo + zero OOM/restart + heap estável + bot-config estável + archive não degradar produção.

**Relatório final:** após conclusão do soak (~17:27 UTC) ou interrupção por critério de abort.
