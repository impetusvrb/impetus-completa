# PERMCHECKER_COMPATIBILITY

**Emitido em:** 2026-07-23 17:06 UTC  
**Fase:** INT-LIM-003  

---

## 1. Compatibilidade com Comportamentos Existentes (FASE 5)

### 1.1 Verificação de permissões (chmod)

| Aspecto | Status |
|---|---|
| Lógica alterada | Não |
| Campo `expected_perm` utilizado | Sim |
| Evento `INTEGRITY_PERM_CHANGED` gerado | Sim (Cenário 6: PASS) |
| Campos `perm_previous` / `perm_current` | Preservados |

### 1.2 Verificação de UID (chown user)

| Aspecto | Status |
|---|---|
| Lógica de `resolveUid()` | Inalterada |
| Campo `changed_attribute: 'UID'` | Adicionado (não breaking) |
| Evento `INTEGRITY_OWNER_CHANGED` | Gerado correctamente (Cenário 4: PASS) |
| Campos `owner_previous` / `owner_current` | Preservados |
| Cache `_uidCache` | Inalterado |

### 1.3 Nova verificação de GID (chgrp group)

| Aspecto | Status |
|---|---|
| `resolveGid()` adicionado | Sim |
| Cache `_gidCache` separado de `_uidCache` | Sim — sem interferência |
| Evento `INTEGRITY_OWNER_CHANGED` com `changed_attribute: 'GID'` | Gerado (Cenário 2: PASS) |
| Campos `group_previous` / `group_current` | Adicionados |

---

## 2. Ausência de Duplicação de Eventos

Nos cenários de alteração simultânea (Cenário 5):
- 1 evento UID (bloco UID)
- 1 evento GID (bloco GID)
- 0 duplicados

Os dois blocos são independentes e verificam atributos distintos (`stat.uid` vs `stat.gid`), não podendo gerar eventos duplicados para a mesma violação.

---

## 3. Compatibilidade com Componentes Downstream

### 3.1 IntegrityEventBus

O EventBus aceita eventos com qualquer estrutura de payload. Os campos novos (`changed_attribute`, `group_previous`, `group_current`) são adicionais e não interferem com o processamento existente.

### 3.2 IntegrityCorrelationEngine

O CorrelationEngine classifica `INTEGRITY_OWNER_CHANGED` como CRITICAL para activos CRITICAL (lógica pré-existente). Os novos eventos GID usam o mesmo tipo, garantindo a severidade correcta sem qualquer alteração ao CorrelationEngine.

### 3.3 IntegrityStateStore

O StateStore persiste eventos como JSONL. Os campos adicionais são simplesmente serializados — sem breaking change.

### 3.4 Dashboard

O Dashboard consome `integrity_state` do StateStore. A adição de campos ao evento não afecta a apresentação existente.

---

## 4. Análise de Risco da Implementação

| Risco | Mitigação | Resultado |
|---|---|---|
| `resolveGid()` falha para grupo não existente | Retorna `null`; bloco GID não dispara | Seguro |
| Alteração de GID e UID em simultâneo gera storm de eventos | Máximo 2 eventos por activo por ciclo | Aceitável |
| `_gidCache` acumula entradas obsoletas | Cache simples; poucos grupos distintos | Negligível |
| Regressão no bloco de perm | Lógica não tocada; testada (Cenário 6) | Sem risco |

---

## 5. Estado Final do IntegrityPermChecker

| Capacidade | Pré-LIM-003 | Pós-LIM-003 |
|---|---|---|
| Verificação de mode bits (chmod) | ✓ | ✓ |
| Verificação de UID (chown user) | Código presente; não activo (expected_owner=null) | ✓ Activo |
| Verificação de GID (chgrp group) | ✗ | ✓ Activo |
| Distinção UID vs GID auditável | N/A | ✓ (`changed_attribute`) |
| Performance por activo | ~0.037ms | ~0.037ms |

**SHA-256 do IntegrityPermChecker.js:** `40b4aba4f1ebf7d2a7a073d7e6f89a5a205aff1c76ad0fbdf62885a06c32dac9`  
**SHA-256 do asset_inventory.json:** `d3edf2470cae453cb23dd840107921db7ae70c88e0d28462bbd0ebbe91d8baea`
