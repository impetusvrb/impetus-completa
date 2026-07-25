# INTEGRITY_OPERATIONAL_LOGBOOK.md
## SEC-OBS-002 — Diário Operacional

**Fase:** SEC-OBS-002  
**Data:** 2026-07-23

---

## Timeline (UTC)

| Hora | Evento |
|---|---|
| 14:28:43 | Início activação: `INTEGRITY_SENSOR_ENABLED=true` escrito em `.env` |
| 14:28:43–58 | Restart `impetus-backend` (`--update-env --only`); downtime ~15 s |
| 14:29:08 | Boot do motor: `[INTEGRITY_SENSOR] Motor de integridade iniciado` |
| 14:29:10 | Primeira varredura: 4× HASH_CHANGED (INT-C-001/002, INT-H-001/002) — drift legítimo INT-01* |
| 14:29:57 | Inject hash em INT-M-003 |
| 14:30:12 | Detect HASH_CHANGED INT-M-003 (~15 s) |
| 14:30:12 | Inject chmod 600 INT-M-003 (sem efeito: `monitor_perm=false`) |
| 14:30:48 | Restore conteúdo/perms INT-M-003; hash=baseline |
| 14:31:23 | Rename (delete) INT-M-003 |
| 14:31:44 | Detect FILE_DELETED; ficheiro restaurado |
| 14:36:44 | Inject chmod 600 INT-C-003 (`monitor_perm=true`) |
| 14:36:56 | Detect PERM_CHANGED 644→600; perms restauradas |
| 14:39:07 | Baseline ocultado; restart → DEGRADED; health=200 |
| 14:39:23 | Baseline restaurado (SHA256 intacto); restart → WATCH, 35 assets |
| 14:40:31 | Snapshot final Dashboard/perf: mode=WATCH, layer=ATUOU, errors=0 |

---

## Restarts PM2 (autorizados nesta missão)

| # | Motivo |
|---|---|
| 1 | Activação da flag |
| 2 | Simulação baseline ausente (DEGRADED) |
| 3 | Recuperação pós-restore do baseline |

Apenas `impetus-backend`. Sem `pm2 save` adicional além do necessário ao restart.

---

## Preservação Forense

| Artefacto | SHA256 / Estado |
|---|---|
| baseline.json | `6cb5ac487158cdb462a4b01b2b7f25290eaa05a4b9b4425619619e4301760bf6` |
| asset_inventory.json | Intact (fd8fc113…) |
| INT-M-003 / INT-C-003 | Restaurados após testes |
| Evidências INT-01A→D | Intactas |

---

## Decisões / Observações

1. Sensor permanece **activo** (`INTEGRITY_SENSOR_ENABLED=true`) após OBS PASS.
2. Violações ATUOU reflectem drift de implementação pendente de **SEC-BASELINE-002**.
3. Intervalos 30 s / 20 s mantidos para observação; podem ser elevados a 300/120 em produção estável.
4. Criação ad-hoc de ficheiros fora do inventário: fora de escopo do motor actual.
5. Nenhuma regressão crítica → **sem rollback** da flag.
