# GF-019 — Ishikawa Pilot Enablement (Operational Dataset)

**Data:** 2026-07-17  
**Tipo:** habilitação operacional controlada  
**Pré-requisitos:** [GF-018-ISHIKAWA-PROMOTION.md](GF-018-ISHIKAWA-PROMOTION.md) · [GF-017-ISHIKAWA-SIGNAL-LOADER.md](GF-017-ISHIKAWA-SIGNAL-LOADER.md) · [GF-016-ISHIKAWA-CORE-DOMAIN.md](GF-016-ISHIKAWA-CORE-DOMAIN.md) · [BASELINE-SYSTEM-v1.3.md](../architecture/BASELINE-SYSTEM-v1.3.md) (LOCKED)

---

## Gate de validação

| Flag | Valor |
|------|-------|
| `PILOT_DATASET_CREATED` | **YES** |
| `ISHIKAWA_SIGNAL_READINESS` | **ready** |
| `BOUND_BLOCKS` | **12 / 12** |
| `BINDING_RATIO` | **1.00** |
| `PROMOTION_APPLIED` | **YES** (flags ON + pipeline natural) |
| `CONSOLIDATION_APPLIED` | **YES** |
| `COGNITIVE_CENTERS_REGISTERED` | **YES** (10) |
| `CENTRO_COMANDO_RENDERING` | **YES** |
| `BYPASS_USED` | **NO** |
| `THRESHOLDS_MODIFIED` | **NO** |
| `SIGNAL_LOADER_MODIFIED` | **NO** |
| `CORE_DOMAIN_MODIFIED` | **NO** |
| `PROMOTION_LOGIC_MODIFIED` | **NO** |
| `BASELINE_SYSTEM_v1.3` | **PRESERVED** |
| `ARC_001_CONFORMANCE` | **PRESERVED** |

---

## Princípio

Cria **massa operacional real** via Core Domain GF-016 — **sem alterar** Signal Loader, Promotion, Consolidação, Semantics, Workflow ou ARC-001.

Espelha disciplina **GF-005 (PPAP Pilot Enablement)** e **GF-012 (MSA Pilot Enablement)**.

---

## Pipeline homologado (intacto)

```
Z.19  Pilot Dataset      → ishikawaCockpitPilot.js / runIshikawaPilotScenario()
        ↓
Z.20  Signal Loader      → runIshikawaSignalBinding()
        ↓
Z.22  Promotion          → applyIshikawaControlledRenderPromotion()
        ↓
Z.23  Consolidação       → applyIshikawaCockpitConsolidation()
```

Nenhuma etapa ignorada. Proibido `force_ishikawa_*`.

---

## Implementação

| Componente | Path | Função |
|------------|------|--------|
| Pilot scenario | `domains/ishikawa/services/ishikawaPilotScenario.js` | `runIshikawaPilotScenario()` |
| Core Domain | `domains/ishikawa/services/ishikawaInvestigationService.js` | CRUD + workflow |
| Fishbone | `domains/ishikawa/services/ishikawaFishboneService.js` | 6M + 5 Whys |
| Signal Loader | `domains/ishikawa/bridge/ishikawaSignalBindingRuntime.js` | **Inalterado** |
| Promotion Z.22 | `renderPromotion/ishikawa/*` | **Inalterado** |
| Consolidação Z.23 | `domains/ishikawa/runtime/ishikawaCockpitConsolidationRuntime.js` | **Inalterado** |
| Testes | `tests/ishikawa/runIshikawaPilotEnablementTests.js` | Cenários A/B/C |

---

## Cenários validados

| Cenário | binding_ratio | promotion | consolidation | CC render |
|---------|---------------|-----------|---------------|-----------|
| A — Tenant vazio | 0.00 | false | false | oculto |
| B — Parcial | 0.35 | false (`INSUFFICIENT_BINDING`) | false | oculto |
| C — Dataset piloto + flags ON | ≥ 0.50 | true | true | 10 centers |

---

## Flags para Cenário C (sem bypass)

```
IMPETUS_ISHIKAWA_COGNITIVE_RUNTIME_ENABLED=on
IMPETUS_ISHIKAWA_RENDER_PROMOTION=controlled
IMPETUS_ISHIKAWA_NATIVE_COCKPIT=on
```

Promotion e consolidação activam **apenas** quando `binding_ratio >= 0.50` (Z.22) e critérios Z.23 satisfeitos.

---

## Testes

```bash
npm run test:ishikawa-pilot
npm run test:ishikawa-promotion
npm run test:ishikawa-signal-loader
npm run test:ishikawa-core-domain
npm run test:ishikawa-runtime-foundation
npm run test:architecture-conformance
```

Regressão dos 10 runtimes homologados via `test:architecture-conformance`.

### Resultados (2026-07-17)

| Suite | Resultado |
|-------|-----------|
| `test:ishikawa-pilot` | **13 / 13 PASS** |
| `test:ishikawa-promotion` | **11 / 11 PASS** |
| `test:ishikawa-signal-loader` | **10 / 10 PASS** |
| `test:ishikawa-core-domain` | **10 / 10 PASS** |
| `test:ishikawa-runtime-foundation` | **11 / 11 PASS** |
| `test:architecture-conformance` | **84 / 84 PASS** (10 runtimes homologados) |

**Pilot enablement:** `binding_ratio=1.00` · `signal_readiness=ready` · 12/12 blocos bound · Cenários A/B/C validados · pipeline Z.19→Z.20→Z.22→Z.23 sem bypass.

---

## Restrições respeitadas

- `ishikawaCoreSemantics.js` — **inalterado**
- Workflow engine — **inalterado**
- Signal Loader / Promotion / Consolidação / facade — **inalterados**
- Thresholds Z.22 (≥ 0.50) / Z.23 (≥ 0.35) — **inalterados**
- Sem `force_ishikawa_*`
- PPAP / MSA / Quality payloads — **preservados**

---

## Evidências geradas

| Documento | Conteúdo |
|-----------|----------|
| [ISHIKAWA-PILOT-DATASET.md](ISHIKAWA-PILOT-DATASET.md) | 10 cenários + cobertura funcional |
| [ISHIKAWA-BINDING-REPORT.md](ISHIKAWA-BINDING-REPORT.md) | binding_ratio, blocos bound/missing |
| [ISHIKAWA-ARCHITECTURE-v1.0.md](ISHIKAWA-ARCHITECTURE-v1.0.md) §2.5 | Pilot Enablement |

---

## Próximo passo

**GF-020 — Homologation:** validar cenários OFF/ON formalmente, emitir `BASELINE-ISHIKAWA-v1.0`, preparar INC-047.

---

## Referências

- [ISHIKAWA-ARCHITECTURE-v1.0.md](ISHIKAWA-ARCHITECTURE-v1.0.md) §2.5
- [GF-012-MSA-PILOT-ENABLEMENT.md](GF-012-MSA-PILOT-ENABLEMENT.md) (modelo espelho)
- [GF-005-PPAP-PILOT-ENABLEMENT.md](GF-005-PPAP-PILOT-ENABLEMENT.md) (modelo espelho)
