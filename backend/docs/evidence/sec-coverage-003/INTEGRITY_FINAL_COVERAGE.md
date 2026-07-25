# INTEGRITY_FINAL_COVERAGE

**Emitido em:** 2026-07-23 20:31 UTC  
**Fase:** SEC-COVERAGE-003 — Cobertura Final para Certificação Plena  
**Tipo:** Auditoria read-only (sem alteração de código / baseline / Dashboard / auditd)

---

## 1. Cobertura Funcional (FASE 1)

| Capacidade | Estado | Evidência |
|---|---|---|
| HashChecker | ✓ | SEC-OBS-003R |
| UID | ✓ | SEC-OBS-003R |
| GID | ✓ | SEC-OBS-003R |
| chmod | ✓ | SEC-OBS-003R |
| delete / restore | ✓ | SEC-OBS-003R |
| Auditd (regras + Bridge) | ✓ | INT-LIM-001 + OBS-003R |
| EventBus (dedup refinada) | ✓ | INT-DEDUP-001 + OBS-003R |
| CorrelationEngine | ✓ | SEC-OBS-003R |
| Dashboard (consumo) | ✓ | SEC-OBS-003R |
| Activos MEDIUM | ✓ | INT-LIM-002 + OBS-003R |
| CRITICAL / HIGH | ✓ | inventário + baseline v2 + runtime |

Componentes (10/10): presentes.  
`resolveGid` + `buildDedupKey`: presentes.  
Runtime: `mode=WATCH`, `sensor_active=true`, `assets_monitored=35`.

---

## 2. Cobertura de Activos (FASE 2)

| Criticidade | Inventário | Cobertura de detecção | Notas |
|---|---|---|---|
| CRITICAL | 10 | **10/10 FULL** | Hash + perm/owner + auditd conforme flags |
| HIGH | 23 | **23/23 FULL** | Idem |
| MEDIUM | 5 | **5/5 detecção** | Ver matriz |

| Pergunta | Resposta |
|---|---|
| Activo descoberto sem cobertura? | **Não** (`uncovered=0`) |
| Activo monitorado fora do inventário? | **Não** |
| Activo parcialmente coberto? | **INT-M-004** — higiene de inventário apenas (ver §4) |

`assets_monitored=35` = 10 CRITICAL + 23 HIGH + 2 MEDIUM no baseline criptográfico.  
INT-M-001/002/005 são grupos de directório cobertos por `impetus_repo_write` (por desenho INT-01A), não como entradas hash individuais.

---

## 3. Cobertura de Fluxos (FASE 3)

| Fluxo | Status |
|---|---|
| Alteração de conteúdo | PASS |
| Permissões (chmod) | PASS |
| UID | PASS |
| GID | PASS |
| UID+GID simultâneos | PASS (OBS-003-F1 CLOSED) |
| Exclusão | PASS |
| Restauração | PASS |
| Eventos auditd (config) | PASS |
| Activos MEDIUM | PASS |

---

## 4. Nota sobre INT-M-004

`monitor_owner=true` com `expected_owner/group=null`. O PermChecker não valida owner deste ficheiro MEDIUM, mas **hash + `impetus_tls_config` estão activos**. Classificado como **RISK-INV-001 (P2 higiene)**, não como limitação operacional da camada.

---

## 5. Conclusão de Cobertura

`FULL_CRITICAL_COVERAGE = TRUE`  
`FULL_HIGH_COVERAGE = TRUE`  
`FULL_MEDIUM_COVERAGE = TRUE` (detecção)  
`NO_CRITICAL_GAPS = TRUE`  
`NO_OPERATIONAL_LIMITATIONS = TRUE`
