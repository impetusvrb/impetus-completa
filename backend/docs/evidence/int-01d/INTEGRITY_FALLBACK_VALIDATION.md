# INTEGRITY_FALLBACK_VALIDATION.md
## INT-01D — Validação do Mecanismo de Fallback

**Fase:** INT-01D  
**Data:** 2026-07-23  
**Status:** PASS

---

## 1. Mecanismo de Fallback

O fallback preserva o mecanismo indirecto certificado (proxy via fail2ban) quando o Motor de Integridade não está disponível. O Centro de Comando nunca degrada por ausência do sensor.

---

## 2. Cenários de Fallback Testados

### Cenário 1: Feature flag desligada (`INTEGRITY_SENSOR_ENABLED=false`)

**Trigger:** Flag ausente ou `false`  
**Comportamento:** `getIntegrityState()` retorna imediatamente `available: false, reason: 'sensor_disabled'`  
**Intelligence:** Usa proxy fail2ban certificado  
**Impacto no Dashboard:** Zero (campo `integrity_state.available=false`, Dashboard ignora)  
**Teste:** ✅ PASS

### Cenário 2: `state.json` ausente (motor nunca arrancou ou reiniciado)

**Trigger:** `/var/lib/impetus/integrity/state.json` não existe  
**Comportamento:** `readStateFile()` → `{ sensor_active: false, reason: 'state_file_missing' }` → `getIntegrityState()` → `available: false`  
**Intelligence:** Usa proxy fail2ban certificado  
**Impacto no Dashboard:** Zero  
**Teste:** ✅ PASS

### Cenário 3: `state.json` corrompido (erro de disco, escrita incompleta)

**Trigger:** `state.json` contém JSON inválido  
**Comportamento:** `JSON.parse` lança excepção → `readStateFile()` captura → `{ sensor_active: false, error: true }` → `getIntegrityState()` → `available: false`  
**Intelligence:** Usa proxy fail2ban certificado  
**Impacto no Dashboard:** Zero  
**Teste:** ✅ PASS

### Cenário 4: Estado stale (motor parou de actualizar)

**Trigger:** `last_check` mais antigo que `2 × INTEGRITY_HASH_CHECK_INTERVAL` (600s default)  
**Comportamento:** `readStateFile()` retorna `{ ...data, sensor_active: false, stale: true }` → `getIntegrityState()` → `available: false, reason: 'stale'`  
**Intelligence:** Usa proxy fail2ban certificado  
**Impacto no Dashboard:** Zero  
**Teste:** Validado em INT-01C (readStateFile inclui staleness detection)

### Cenário 5: Motor em modo DEGRADED

**Trigger:** Baseline indisponível → `mode: 'DEGRADED'` mas `sensor_active: true`  
**Comportamento:** `getIntegrityState()` → `available: true, mode: 'DEGRADED'`  
**Intelligence:** `status = SEM_TELEMETRIA`, evidence inclui `last_error`  
**Impacto no Dashboard:** Painel reflecte capacidade reduzida (não degradação total)  
**Teste:** ✅ PASS

### Cenário 6: Módulo IntegrityStateStore não carregado

**Trigger:** Ficheiro ausente ou erro de require  
**Comportamento:** IIFE captura erro → `_IntegrityStateStore = null` → `getIntegrityState()` → `available: false, reason: 'module_not_found'`  
**Intelligence:** Usa proxy fail2ban certificado  
**Impacto no Dashboard:** Zero  
**Teste:** Coberto por lógica de `!_IntegrityStateStore`

---

## 3. Integridade do Mecanismo Certificado

O proxy fail2ban (mecanismo certificado original) foi **preservado sem alteração**:

```javascript
// Fallback certificado — intacto
status = fail2banActive ? STATUS.OBSERVADA : STATUS.SEM_TELEMETRIA;
evidence = _intSensorEnabled
  ? 'Motor de Integridade: estado não disponível — usando telemetria proxy via threat-watch'
  : 'Monitoramento de integridade via threat-watch activo (sensor não activado)';
```

A única diferença no texto de `evidence` é que quando o sensor está habilitado mas indisponível, o texto indica explicitamente o uso do proxy (para diagnóstico). O comportamento de `status` é idêntico ao original.

---

## 4. Decisão de Árvore do Fallback

```
getIntegrityState()
    │
    ├── INTEGRITY_SENSOR_ENABLED ≠ 'true'  ──▶ available=false (sensor_disabled)
    │
    ├── _IntegrityStateStore = null         ──▶ available=false (module_not_found)
    │
    └── readStateFile()
            │
            ├── excepção                    ──▶ available=false (exception)
            ├── !raw                        ──▶ available=false (read_error)
            ├── raw.error = true            ──▶ available=false (read_error)
            ├── raw.stale = true            ──▶ available=false (stale)
            ├── !raw.sensor_active          ──▶ available=false (state_file_missing ou reason)
            │
            └── raw.sensor_active = true    ──▶ available=true
                    │
                    ├── violations > 0      ──▶ ATUOU
                    ├── mode = DEGRADED     ──▶ SEM_TELEMETRIA
                    └── mode = WATCH        ──▶ OBSERVADA
```

---

**FALLBACK_VALIDATED = TRUE**
