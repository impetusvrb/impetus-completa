# EVENTBUS_RUNTIME_VALIDATION

**Emitido em:** 2026-07-23 20:01 UTC  
**Fase:** SEC-OBS-003R — Revalidação Pontual do EventBus  
**Reload:** autorizado (`pm2 restart … --only impetus-backend --env production --update-env`)

---

## 1. Reload Controlado

| Campo | Valor |
|---|---|
| PID anterior | 3180185 |
| PID novo | 3181502 |
| PID alterado | True |
| Status | online |
| Restarts | 27 → 28 |
| SHA-256 EventBus | `e29db70ccf4d7a21130f0ab2e0382f3ac4b4055b2462157241e23f9ef4dade71` |
| `buildDedupKey` presente | True |
| Marcador INT-DEDUP-001 | True |
| Health pós-reload | HTTP 200 |
| Sensor | `mode=WATCH`, `sensor_active=true` |

---

## 2. Validação Funcional Runtime

| Cenário | Resultado |
|---|---|
| chown user (UID) | PASS — 1 evento, `changed_attribute=UID` |
| chgrp group (GID) | PASS — 1 evento, `changed_attribute=GID` |
| **chown user:group** | **PASS — 2 eventos [UID, GID], dedup=0** |
| Repetição na janela 30s | PASS — 0 emitidos, dedup_delta=2 |
| Após expirar janela | PASS — 2 eventos novamente |
| Expiração explícita da janela | PASS |

**OBS-003-F1 eliminado em runtime:** `obs_003_f1_closed = true`

---

## 3. Pipeline

| Etapa | Status |
|---|---|
| PermChecker → EventBus | ✓ |
| EventBus → CorrelationEngine | ✓ processed≥2, errors=0 |
| CorrelationEngine → StateStore | ✓ last_event actualizado |
| Dashboard consumer | ✓ getIntegrityState intacto |

---

## 4. Regressão

| Teste | Resultado |
|---|---|
| HASH | PASS |
| chmod | PASS |
| delete | PASS |
| restore (0 fantasmas) | PASS |
| auditd rules | PASS |
| MEDIUM hash | PASS |
| live WATCH | PASS |
| health 200 | PASS |

**Total:** 19/19 PASS
