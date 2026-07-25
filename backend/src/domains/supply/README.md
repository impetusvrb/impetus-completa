# Supply Domain — Runtime Foundation (GF-022 → GF-025)

**Runtime:** `supply_native` · **Status:** FOUNDATION + CORE + SIGNAL_LOADER + **PROMOTION + CC**  
**Governança:** REV-001 · **Norma:** ARC-002

## Estrutura

| Path | Função |
|------|--------|
| `core/` | Identidade e entidades conceptuais |
| `semantics/` | SSOT `supplyCoreSemantics.js` |
| `runtime/` | Foundation · Signal Loader · **Promotion** |
| `cognitive/` | **Command Center Foundation** (7 centros) |
| `registry/` | Runtime + semantic block registry |
| `model/` · `policies/` · `services/` | Core Domain (GF-023) |

## Fluxo cognitivo (GF-024 → GF-025)

```
semantic_signals → Signal Loader → Block Bridge → Promotion → CC Foundation
```

## Testes

```bash
npm run test:supply-foundation
npm run test:supply-core-domain
npm run test:supply-signal-loader
npm run test:supply-promotion
```
