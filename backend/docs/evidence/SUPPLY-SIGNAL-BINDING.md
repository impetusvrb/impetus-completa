# SUPPLY — Signal Binding (GF-024)

**Runtime:** `supply_native`  
**Modo:** Semantic Read-Only · Z.20 preparatory

---

## Entrada

O binding runtime (`supplySignalBindingRuntime.js`) invoca:

1. `loadSupplyTenantSignals(user, ctx)` — normalização semântica
2. Para cada bloco em `SUPPLY_SEMANTIC_BLOCK_IDS`: `invokeSupplyBlockBridge(blockId, bundle, ctx)`

---

## Saída (`runSupplySignalBinding`)

| Campo | Descrição |
|-------|-----------|
| `signal_bundle` | Resultado do loader (semantic_bundle + domain_events) |
| `binding_validation` | `{ blocks_total, blocks_bound, binding_ratio }` |
| `bound_blocks` | IDs com `binding_ok === true` |
| `missing_blocks` | IDs sem sinal semântico |
| `enriched_blocks` | Shadow Z.20 por bloco |
| `read_only` | sempre `true` |
| `inactive` | sempre `true` (sem promotion) |
| `event_publication` | sempre `false` |

---

## Regras de binding

- Contagens por entidade validadas exclusivamente por `supplyCoreSemantics.isValidStatus()`
- Sem sinal → `reason: NO_SEMANTIC_SIGNAL`, `binding_ok: false`
- Com sinal → `reason: SEMANTIC_BOUND`, métricas `status_counts` preservadas
- Eventos de domínio augmentam o bundle mas **não** publicam eventos

---

## Isolamento

- Zero imports de `logistics-operational`, OCL, `db`, axios, fetch
- Zero chamadas a domain services (PurchaseRequestService, etc.)
- Integração WMS/ERP futura: apenas via `ctx.semantic_signals` alimentado por adaptadores externos

---

*Teste:* `npm run test:supply-signal-loader`
