# GF-020 — Ishikawa Runtime Homologation & Baseline v1.0

**Data:** 2026-07-17  
**Tipo:** homologação arquitectural · certificação (Certification Mode)  
**Pré-requisitos:** [GF-019-ISHIKAWA-PILOT-ENABLEMENT.md](GF-019-ISHIKAWA-PILOT-ENABLEMENT.md) · [GF-018-ISHIKAWA-PROMOTION.md](GF-018-ISHIKAWA-PROMOTION.md) · [ISHIKAWA-ARCHITECTURE-v1.0.md](ISHIKAWA-ARCHITECTURE-v1.0.md)  
**Baseline gerado:** [BASELINE-ISHIKAWA-v1.0.md](BASELINE-ISHIKAWA-v1.0.md)

---

## Objetivo

Homologar oficialmente o runtime **`ishikawa_native`**, validando a cadeia **Z.19 → Z.23** com dados reais do piloto GF-019 e publicar **BASELINE-ISHIKAWA-v1.0** — **sem alterar** BASELINE-SYSTEM v1.3 (INC-047 futura).

| Modo | Condição | Comportamento esperado |
|------|----------|------------------------|
| **Runtime OFF** | Tenant sem massa · `binding_ratio = 0` | `inactive=true` · `promotion_applied=false` · cockpit oculto |
| **Runtime ON** | `binding_ratio = 1.0` + flags homologadas | Promoção **automática** Z.22→Z.23 · sem `force_*` |

---

## Modo de execução

**Certification Mode** — nenhuma alteração a código de runtime, BD, APIs, Signal Loader, Promotion, Consolidação, Centro de Comando, registries, Semantics, Workflow, thresholds, ARC-001 ou BASELINE-SYSTEM.

Instrumento de certificação: `tests/ishikawa/runIshikawaRuntimeHomologationTests.js`

---

## Gate de validação final

| Flag | Valor |
|------|-------|
| `ISHIKAWA_RUNTIME_HOMOLOGATED` | **YES** |
| `OFF_SCENARIO_VALIDATED` | **YES** |
| `ON_SCENARIO_VALIDATED` | **YES** |
| `PROMOTION_AUTOMATIC` | **YES** |
| `NO_BYPASS` | **YES** |
| `BINDING_RATIO` | **1.0** (12/12) |
| `ISHIKAWA_SIGNAL_READINESS` | **ready** |
| `COGNITIVE_CENTERS` | **10** |
| `NO_RUNTIME_REGRESSION` | **YES** |
| `LEGACY_ENGINE_IMPORTED` | **NO** |
| `SSOT_PRESERVED` | **YES** |
| `ARC_001_CONFORMANCE` | **PASS** |
| `BASELINE_ISHIKAWA_v1.0` | **PUBLISHED** |
| `BASELINE_SYSTEM_v1.3` | **PRESERVED** |

---

## Cenário A — Runtime OFF

Tenant: `00000000-0000-4000-8000-000000000099`

| Campo | Valor |
|-------|-------|
| `binding_ratio` | `0` |
| `signal_readiness` | `NO_DATASET` |
| `promotion_applied` | `false` |
| `consolidation_applied` | `false` |
| `inactive` | `true` |
| `ishikawa_cognitive_centers` | `[]` |
| `cockpit_hidden` | `true` |

Frontend: `resolveIshikawaCockpitRuntime` → `null` · nenhum hub renderizado

---

## Cenário B — Runtime ON

Tenant piloto GF-019 · flags homologadas (sem bypass):

```
IMPETUS_ISHIKAWA_COGNITIVE_RUNTIME_ENABLED=on
IMPETUS_ISHIKAWA_RENDER_PROMOTION=controlled
IMPETUS_ISHIKAWA_NATIVE_COCKPIT=on
IMPETUS_ISHIKAWA_RUNTIME_FOUNDATION=true
```

| Campo | Valor |
|-------|-------|
| `binding_ratio` | `1.0` |
| `signal_readiness` | `ready` |
| `promotion_applied` | `true` |
| `consolidation_applied` | `true` |
| `inactive` | `false` |
| `cockpit_mode` | `ishikawa_native` |
| `ishikawa_cognitive_centers` | **10** |
| `bound_blocks` | **12/12** |

---

## Cadeia Z homologada

```
Z.19  runIshikawaCockpitPilot / dataset GF-019
  ↓
Z.20  ishikawa_signal_loader (observador passivo)
  ↓
Z.22  applyIshikawaControlledRenderPromotion  [gate ≥ 0.5]
  ↓
Z.23  applyIshikawaCockpitConsolidation      [gate ≥ 0.35 + Z.22]
  ↓
Foundation attach (preserva estado promovido)
  ↓
IshikawaNativeCockpitPromotion (Centro de Comando)
```

`phase_stack` observado: `…-ISHIKAWA-Z.19-ISHIKAWA-Z.22-ISHIKAWA-Z.23`

---

## Contratos arquiteturais confirmados

| Contrato | Estado |
|----------|--------|
| Core Domain = SSOT | **YES** |
| Signal Loader apenas observa | **YES** |
| Promotion não recalcula binding | **YES** |
| Consolidação não cria regras próprias | **YES** |
| Centro de Comando consome Promotion | **YES** |
| Sem duplicação Semantics/Workflow | **YES** |
| `qualityRootCauseEngine.js` legado não importado | **YES** |
| Algoritmos em `domains/ishikawa/core/` | **YES** |

---

## Testes executados

```bash
npm run test:ishikawa-runtime-homologation
npm run test:ishikawa-runtime-foundation
npm run test:ishikawa-core-domain
npm run test:ishikawa-signal-loader
npm run test:ishikawa-promotion
npm run test:ishikawa-pilot
npm run test:architecture-conformance
```

Regressão dos 10 runtimes homologados incluída na suite de homologação.

### Resultados (2026-07-17)

| Suite | Resultado |
|-------|-----------|
| `test:ishikawa-runtime-homologation` | **16 / 16 PASS** |
| `test:ishikawa-runtime-foundation` | 11 / 11 (incluída) |
| `test:ishikawa-core-domain` | 10 / 10 (incluída) |
| `test:ishikawa-signal-loader` | 10 / 10 (incluída) |
| `test:ishikawa-promotion` | 11 / 11 (incluída) |
| `test:ishikawa-pilot` | 13 / 13 (incluída) |
| `test:architecture-conformance` | 84 / 84 (incluída) |
| Regressão 9 runtimes cross-domain | ✅ |

**Total agregado suítes:** 139 passed · **Homologation checks:** 16 passed · **0 failed**

---

## Entregáveis

| Artefacto | Path |
|-----------|------|
| Evidência GF-020 | `backend/docs/evidence/GF-020-ISHIKAWA-HOMOLOGATION.md` |
| Relatório | `backend/docs/evidence/ISHIKAWA-HOMOLOGATION-REPORT.md` |
| Baseline LOCKED | `backend/docs/evidence/BASELINE-ISHIKAWA-v1.0.md` |
| Testes | `backend/tests/ishikawa/runIshikawaRuntimeHomologationTests.js` |

---

## Próximo passo

**INC-047** — registo oficial de `ishikawa_native` no BASELINE-SYSTEM v1.4 (11º runtime homologado).

---

## Restrições respeitadas

GF-020 exclusivamente de **certificação** — zero alterações a runtime, banco, migrations, Core Domain, Signal Loader, Promotion, thresholds, registries, CentroComando, APIs ou ARC-001.
