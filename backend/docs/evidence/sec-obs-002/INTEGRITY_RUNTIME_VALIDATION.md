# INTEGRITY_RUNTIME_VALIDATION.md
## SEC-OBS-002 — Validação Runtime (Saúde, Eventos, Falhas)

**Fase:** SEC-OBS-002  
**Data:** 2026-07-23  
**Status:** PASS

---

## 1. Saúde Operacional (FASE 2)

| Verificação | Resultado |
|---|---|
| Motor inicia | ✅ Log + state.mode=WATCH |
| Baseline carregado | ✅ baseline_id presente, assets=35 |
| Inventário carregado | ✅ getAllAssets via motor |
| state.json legível | ✅ |
| Event Bus | ✅ Eventos emitidos e deduplicados |
| Correlation Engine | ✅ severity_final, shadow log, persistência |

---

## 2. Eventos Controlados (FASE 4)

Activo principal: **INT-M-003** (`infra/security/audit/impetus-audit.rules`).  
Permissão: **INT-C-003** (`ecosystem.runtime.config.cjs`) — INT-M-003 tem `monitor_perm=false` no inventário.

| Teste | Detectado | Latência inject→detect | Evento |
|---|---|---|---|
| Alteração de hash | ✅ | ~15 s | `INTEGRITY_HASH_CHANGED` HIGH int-…0005 |
| Alteração de permissão | ✅ | ~12 s | `INTEGRITY_PERM_CHANGED` HIGH 644→600 int-…0007 |
| Exclusão (rename) | ✅ | ~21 s | `INTEGRITY_FILE_DELETED` HIGH int-…0006 |
| Restauração de conteúdo | ✅ | — | Hash voltou a coincidir com baseline |
| Criação de ficheiro novo | N/A | — | Motor monitora inventário; não há watcher de criação ad-hoc |

Todos os activos de teste foram **restaurados** após a validação.

**EVENT_DETECTION_VALIDATED = TRUE**

---

## 3. Falhas e Recuperação (FASE 5)

| Cenário | Resultado |
|---|---|
| state.json corrompido | `getIntegrityState()` → `available=false`; plataforma intacta |
| Baseline ausente + restart | `mode=DEGRADED`; health API=200 |
| Baseline restaurado + restart | `mode=WATCH`, sensor_active=true, assets=35 |
| audit.log legível | ✅ |

Baseline SHA256 após testes: `6cb5ac487158cdb462a4b01b2b7f25290eaa05a4b9b4425619619e4301760bf6` (inalterado).

**DEGRADED_MODE_VALIDATED = TRUE**  
**AUTO_RECOVERY_VALIDATED = TRUE** (recuperação via restauração de recurso + restart controlado)

---

## 4. Estabilidade (FASE 8)

| Indicador | Valor |
|---|---|
| errors (state.stats) | 0 |
| duplicate_event_ids | 0 |
| queue_size | 4 (residual, sem crescimento descontrolado) |
| event_types observados | HASH_CHANGED, PERM_CHANGED, FILE_DELETED |

**NO_MEMORY_LEAK = TRUE** (sem crescimento anómalo atribuível ao sensor na janela de observação; RSS do processo backend dentro do envelope PM2 1200M).
