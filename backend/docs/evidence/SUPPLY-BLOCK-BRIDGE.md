# SUPPLY — Block Bridge (GF-024)

**Módulo:** `supplyBlockBridge.js`  
**Registry:** `supplySemanticBlockRegistry.js`

---

## Responsabilidade

Converter semântica normalizada em **resultados de binding por bloco**, preservando SSOT e contratos read-only.

---

## API

```javascript
invokeSupplyBlockBridge(blockId, signalBundle, ctx) → {
  block_id,
  binding_ok,
  entity,
  signal_count,
  reason,           // SEMANTIC_BOUND | NO_SEMANTIC_SIGNAL | UNKNOWN_BLOCK
  bridge_status,    // semantic_bound | semantic_empty
  read_only: true,
  render_active: false,
  metrics: { status_counts }
}
```

---

## Mapeamento entidade → bloco

Ver `SUPPLY_ENTITY_BLOCK_MAP` em `registry/supplySemanticBlockRegistry.js`.

---

## Observabilidade

Cada invocação regista `BLOCK_BOUND` ou `BLOCK_EMPTY` via `supplySignalLoaderLogger.js` (sem dados sensíveis).

---

## Diferencial vs Greenfields anteriores (PPAP/MSA/Ishikawa)

| Aspecto | Supply GF-024 |
|---------|----------------|
| Fonte de sinal | Semântica SSOT + ctx in-memory |
| Objetos de negócio | **Nunca** consumidos directamente |
| BD / SQL | **Proibido** |
| Preparação WMS/ERP | Adaptadores futuros → `semantic_signals` |

---

*Teste:* `npm run test:supply-signal-loader`
