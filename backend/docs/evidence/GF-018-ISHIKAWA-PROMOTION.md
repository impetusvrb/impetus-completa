# GF-018 — Ishikawa Promotion & Centro de Comando

**Data:** 2026-07-17  
**Modo:** Infraestrutura Z.22 (Promotion) + Z.23 (Consolidação)  
**Runtime:** Permanece **inactivo** até `binding_ratio >= 0.50` (sem dataset homologado na prática)

---

## Objetivo

Implementar toda a infraestrutura arquitectural para promoção controlada do `ishikawa_native` ao Centro de Comando, consumindo **exclusivamente** o resultado do Signal Loader (GF-017) — **sem recalcular binding**, **sem acesso directo à BD**.

---

## Entregáveis

### Backend (Z.22 / Z.23)

| Artefacto | Path |
|-----------|------|
| Render supervisor | `renderPromotion/ishikawa/ishikawaRenderPromotionSupervisor.js` |
| Widget resolver | `renderPromotion/ishikawa/ishikawaWidgetPromotionResolver.js` |
| Z.22 runtime | `renderPromotion/ishikawa/ishikawaControlledRenderRuntime.js` |
| Consolidation supervisor | `domains/ishikawa/cockpit/ishikawaConsolidationSupervisor.js` |
| Consolidator | `domains/ishikawa/cockpit/ishikawaCockpitConsolidator.js` |
| Z.23 runtime | `domains/ishikawa/runtime/ishikawaCockpitConsolidationRuntime.js` |
| Cognitive centers | `domains/ishikawa/cockpit/ishikawaCenters.js` (10 centers) |
| Promotion logger | `renderPromotion/ishikawa/ishikawaPromotionLogger.js` |
| Pilot Z.19 | `pilot/ishikawaCockpitPilot.js` → `runIshikawaSignalBinding()` |

### Frontend (Centro de Comando)

| Artefacto | Path |
|-----------|------|
| Cockpit registry | `frontend/.../ishikawaNativeCockpitRegistry.js` |
| Promotion component | `frontend/.../IshikawaNativeCockpitPromotion.jsx` |
| Hub adapter | `frontend/.../ishikawaRuntimeHubAdapter.js` |
| Hub shells (10) | `frontend/.../ishikawaHubs.jsx` + `IshikawaHubShell.jsx` |
| CentroComando | mount condicional `resolveIshikawaCockpitRuntime` |

---

## Gate de Promotion (Z.22)

| Parâmetro | Valor |
|-----------|-------|
| Threshold inicial | `binding_ratio >= 0.50` |
| Fonte | `ishikawaPilot.engine_bridge` (passivo) |
| Bloqueio A | `binding_ratio === 0` → `A_NO_DATASET` |
| Bloqueio B | `0 < ratio < 0.50` → `INSUFFICIENT_BINDING` |
| Passagem C | `ratio >= 0.50` → `promotion_applied: true` |

**Z.23:** `binding_ratio >= 0.35` + Z.22 `promotion_applied` + `cockpit_mode: ishikawa_native`

---

## Cognitive Centers (10)

Investigation Overview · Fishbone · Five Why · Corrective Actions · Preventive Actions · Evidence · Approvals · Recurrence · Organizational Learning · Narrative

Inicialmente **estruturais** (mount points vazios até GF-019 com dados operacionais).

---

## Cenários validados

| Cenário | binding_ratio | promotion | consolidation | CC render |
|---------|---------------|-----------|---------------|-----------|
| A — Sem dataset | 0.00 | false | false | oculto |
| B — Parcial | 0.35 | false | false | oculto |
| C — Elegível | 0.50 | true | true* | hubs* |
| D — Completo | 1.00 | true | true | 10 centers |

\*Consolidação requer Z.22 aplicado + flags cockpit ON.

---

## Restrições preservadas

| Restrição | Estado |
|-----------|--------|
| Signal Loader (GF-017) | NO_CHANGE |
| Core Domain (GF-016) | NO_CHANGE |
| Semantics / Workflow | NO_CHANGE |
| APIs / BD / Migrations | NO_CHANGE |
| PPAP / MSA / Quality homologados | NO_CHANGE |
| BASELINE-SYSTEM v1.3 | PRESERVED |
| ARC-001 | PRESERVED (checks aditivos GF-018) |

---

## Critérios obrigatórios

```
ISHIKAWA_PROMOTION_EXISTS            = YES
ISHIKAWA_PROMOTION_GATE_EXISTS       = YES
ISHIKAWA_CONSOLIDATION_EXISTS        = YES
ISHIKAWA_CC_INTEGRATION_EXISTS       = YES
PROMOTION_DEPENDS_ON_BINDING         = YES
PROMOTION_RECALCULATES_BINDING       = NO
SIGNAL_LOADER_MODIFIED               = NO
CORE_DOMAIN_MODIFIED                 = NO
BASELINE_SYSTEM_v1.3                 = PRESERVED
ARC_001_CONFORMANCE                  = PRESERVED
```

---

## Testes executados

| Suite | Resultado |
|-------|-----------|
| `npm run test:ishikawa-promotion` | **11/11** |
| `npm run test:ishikawa-signal-loader` | **10/10** |
| `npm run test:ishikawa-core-domain` | **10/10** |
| `npm run test:ishikawa-runtime-foundation` | **11/11** |
| `npm run test:architecture-conformance` | checks aditivos GF-018 (Ishikawa Z.22/Z.23 + CC registry) |

Cenários determinísticos validados: `binding_ratio` 0.00 · 0.35 · 0.50 · 1.00.

---

## Próxima etapa

**GF-019 — Pilot Enablement:** activação efectiva com dataset Ishikawa representativo (`binding_ratio` homologável).
