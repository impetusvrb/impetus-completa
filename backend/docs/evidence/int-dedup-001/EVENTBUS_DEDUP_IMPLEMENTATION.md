# EVENTBUS_DEDUP_IMPLEMENTATION

**Emitido em:** 2026-07-23 18:21 UTC  
**Fase:** INT-DEDUP-001  

---

## 1. Ficheiro Alterado

| Ficheiro | Alteração |
|---|---|
| `backend/src/services/integrity/IntegrityEventBus.js` | Função `buildDedupKey()` + uso em `emit()` |
| SHA-256 | `e29db70ccf4d7a21130f0ab2e0382f3ac4b4055b2462157241e23f9ef4dade71` |

## 2. Componentes NÃO Alterados

IntegrityPermChecker, CorrelationEngine, Dashboard, StateStore, HashChecker, AuditdBridge, baseline.

## 3. Código Essencial

```javascript
function buildDedupKey(rawEvent) {
  const path = rawEvent.asset_path || '';
  const type = rawEvent.event_type || '';
  const attr = rawEvent.changed_attribute;
  if (attr !== undefined && attr !== null && String(attr).length > 0) {
    return `${path}::${type}::${attr}`;
  }
  return `${path}::${type}`;
}
```

Exportado: `module.exports.buildDedupKey`, `module.exports.DEDUP_WINDOW` (para testes).

## 4. Reversibilidade

Reverter = restaurar `const key = \`\${rawEvent.asset_path}::\${rawEvent.event_type}\``. Alteração localizada a ~15 linhas.
