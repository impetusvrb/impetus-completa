# GID_MONITORING_IMPLEMENTATION

**Emitido em:** 2026-07-23 17:05 UTC  
**Fase:** INT-LIM-003 — Eliminação da LIM-003  

---

## 1. Auditoria do Estado Anterior (FASE 1)

### 1.1 Comportamento do IntegrityPermChecker pré-INT-LIM-003

O `IntegrityPermChecker` verificava:
- Mode bits (`chmod`) via `stat.mode` e `asset.expected_perm` ✓
- UID via `stat.uid` e `asset.expected_owner`

**Gap identificado:** O bloco de verificação de UID existia no código mas **nunca disparava**, porque `expected_owner` era `null` para todos os activos (campo não populado no inventário). Da mesma forma, GID (`stat.gid`) não era verificado de todo.

### 1.2 Campos de inventário antes da correcção

| Campo | Valor pré-INT-LIM-003 |
|---|---|
| `expected_owner` | `null` (todos os 33 activos com `monitor_owner=True`) |
| `expected_group` | `null` (todos os 33 activos) |

### 1.3 Ponto de extensão identificado

A lógica existente de UID no `_checkAsset()` era o modelo perfeito para o GID. A extensão segue exactamente o mesmo padrão com `resolveGid()`.

---

## 2. Implementação (FASE 2)

### 2.1 Alterações ao IntegrityPermChecker.js

**Ficheiro:** `backend/src/services/integrity/IntegrityPermChecker.js`  
**SHA-256 pós-INT-LIM-003:** `40b4aba4f1ebf7d2a7a073d7e6f89a5a205aff1c76ad0fbdf62885a06c32dac9`

#### 2.1.1 Bloco UID corrigido (added `changed_attribute: 'UID'`)

```javascript
if (asset.monitor_owner && asset.expected_owner) {
  const actualUid     = stat.uid;
  const expectedOwner = asset.expected_owner;
  const expectedUid   = resolveUid(expectedOwner);
  if (expectedUid !== null && actualUid !== expectedUid) {
    this._stats.violations++;
    this._bus.emit({
      event_type:        'INTEGRITY_OWNER_CHANGED',
      severity:          'CRITICAL',
      changed_attribute: 'UID',           // campo de distinção auditável
      owner_previous:    expectedOwner,
      owner_current:     `uid:${actualUid}`,
      detail:            `owner alterado: esperado=${expectedOwner}(uid=${expectedUid}) actual=uid:${actualUid}`,
      // ... campos comuns
    });
  }
}
```

#### 2.1.2 Bloco GID novo (INT-LIM-003)

```javascript
if (asset.monitor_owner && asset.expected_group) {
  const actualGid      = stat.gid;
  const expectedGroup  = asset.expected_group;
  const expectedGid    = resolveGid(expectedGroup);
  if (expectedGid !== null && actualGid !== expectedGid) {
    this._stats.violations++;
    this._bus.emit({
      event_type:        'INTEGRITY_OWNER_CHANGED',  // reutiliza tipo existente (severidade CRITICAL preservada)
      severity:          'CRITICAL',
      changed_attribute: 'GID',           // distinção auditável
      group_previous:    expectedGroup,
      group_current:     `gid:${actualGid}`,
      owner_previous:    expectedGroup,   // compatibilidade com consumidores existentes
      owner_current:     `gid:${actualGid}`,
      detail:            `group alterado: esperado=${expectedGroup}(gid=${expectedGid}) actual=gid:${actualGid}`,
      // ... campos comuns
    });
  }
}
```

#### 2.1.3 Função resolveGid() adicionada

```javascript
const _gidCache = new Map();
function resolveGid(name) {
  if (_gidCache.has(name)) return _gidCache.get(name);
  try {
    const { execSync } = require('child_process');
    const line = execSync(`getent group ${name}`, { stdio: 'pipe' }).toString().trim();
    const gid = parseInt(line.split(':')[2], 10);
    _gidCache.set(name, isNaN(gid) ? null : gid);
    return _gidCache.get(name);
  } catch {
    _gidCache.set(name, null);
    return null;
  }
}
```

### 2.2 Actualização do asset_inventory.json

**Acção:** populados `expected_owner` e `expected_group` para os 33 activos com `monitor_owner=True`.  
**Valores:** todos `"root"` (confirmado via `os.stat()` de cada activo).  
**SHA-256 pós-actualização:** `d3edf2470cae453cb23dd840107921db7ae70c88e0d28462bbd0ebbe91d8baea`

### 2.3 Decisão de design: reutilizar `INTEGRITY_OWNER_CHANGED`

O tipo de evento `INTEGRITY_OWNER_CHANGED` já está na lista de severidade CRITICAL do `IntegrityCorrelationEngine`. Para respeitar a restrição "Não alterar CorrelationEngine" e garantir que eventos GID recebam severidade CRITICAL, optou-se por reutilizar este tipo de evento com o campo `changed_attribute: 'GID'` como mecanismo de distinção auditável.

Todos os consumidores (Dashboard, StateStore, EventBus) tratam este evento de forma idêntica, e o campo `changed_attribute` permite distinguir UID de GID em análise forense.

---

## 3. Componentes Inalterados

| Componente | Alterado | Confirmação |
|---|---|---|
| `IntegrityHashChecker.js` | Não | Fora do escopo |
| `IntegrityAuditdBridge.js` | Não | Fora do escopo |
| `IntegrityEventBus.js` | Não | Fora do escopo |
| `IntegrityCorrelationEngine.js` | Não | Restrição respeitada |
| `IntegrityEngine.js` | Não | Sem necessidade |
| Dashboard | Não | Fora do escopo |
| `baseline.json` | Não | Será tratado em SEC-BASELINE-003 |
