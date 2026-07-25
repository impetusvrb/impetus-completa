# GF-006 — PPAP Runtime Homologation & Baseline v1.0

**Data:** 2026-07-16  
**Tipo:** homologação controlada · congelamento domínio  
**Pré-requisitos:** [GF-005-PPAP-PILOT-ENABLEMENT.md](GF-005-PPAP-PILOT-ENABLEMENT.md) · [GF-004-PPAP-PROMOTION.md](GF-004-PPAP-PROMOTION.md) · [PPAP-ARCHITECTURE-v1.0.md](PPAP-ARCHITECTURE-v1.0.md)  
**Baseline gerado:** [BASELINE-PPAP-v1.0.md](BASELINE-PPAP-v1.0.md)

---

## Objetivo

Homologar oficialmente o runtime **`ppap_native`**, validando a cadeia **Z.19 → Z.23** com dados reais do piloto GF-005 e estabelecer **BASELINE-PPAP-v1.0** como referência congelada do domínio.

Disciplina adicional acordada: validar **dois modos de operação** — não apenas a promoção bem-sucedida.

| Modo | Condição | Comportamento esperado |
|------|----------|------------------------|
| **Runtime OFF** | Tenant sem dados PPAP ou `binding_ratio < threshold` | `inactive=true` · `promotion_applied=false` · sem bypass |
| **Runtime ON** | `binding_ratio ≥ threshold` + flags homologadas | Promoção **automática** Z.22→Z.23 · sem `force_*` |

---

## Gate de validação final

| Flag | Valor |
|------|-------|
| `PPAP_PROMOTION_APPLIED` | **YES** |
| `PPAP_CONSOLIDATION_APPLIED` | **YES** |
| `PPAP_RUNTIME_ACTIVE` | **YES** (tenant piloto, flags ON) |
| `PPAP_BINDING_RATIO >= THRESHOLD` | **YES** (`1.0` ≥ `0.5`) |
| `PPAP_SIGNAL_READINESS` | **READY** |
| `NO_RUNTIME_REGRESSION` | **YES** |
| `NO_CROSS_DOMAIN_REGRESSION` | **YES** |
| `BASELINE_SYSTEM_v1.1` | **PRESERVED** (não alterado nesta GF) |
| `QUALITY_BASELINE_v1.1` | **PRESERVED** |
| `LOGISTICS_BASELINE_v1.1` | **PRESERVED** |
| `PPAP_BASELINE_v1.0` | **LOCKED** |

---

## Pré-condições registadas (pré-activação)

Evidência capturada **com flags PPAP OFF** no tenant piloto:

| Métrica | Valor observado |
|---------|-----------------|
| `binding_ratio` | `1.0` (≥ `0.5`) |
| `signal_readiness` | `ready` |
| `promotion_applied` | `false` |
| `consolidation_applied` | `false` |
| `inactive` | `true` |

Conclusão: gate objectivamente satisfeito **antes** de activar flags de runtime — promoção posterior provou ser consequência natural dos critérios, não intervenção manual.

---

## Fase 1 — Validação do Gate

Recálculo exclusivo via **Signal Loader** (`runPpapSignalBinding`):

| Execução | `binding_ratio` | `bound_blocks` | `missing_blocks` | `signal_readiness` |
|----------|-----------------|----------------|------------------|-------------------|
| A | `1.0` | 12 | `[]` | `ready` |
| B | `1.0` | 12 | `[]` | `ready` |

**Idempotência:** `binding_ratio_A === binding_ratio_B` — nenhum valor alterado manualmente.

---

## Fase 2 — Promotion (cadeia natural)

Flags activadas (sem bypass):

```
IMPETUS_PPAP_COGNITIVE_RUNTIME_ENABLED=on
IMPETUS_PPAP_RENDER_PROMOTION=controlled
IMPETUS_PPAP_NATIVE_COCKPIT=on
IMPETUS_PPAP_RUNTIME_FOUNDATION=true
```

Cadeia homologada:

```
Z.19  runPpapCockpitPilot
  ↓
Z.20  ppap_signal_loader (observador passivo)
  ↓
Z.22  applyPpapControlledRenderPromotion
  ↓
Z.23  applyPpapCockpitConsolidation
  ↓
Foundation attach (preserva estado promovido)
```

| Campo | Valor pós-promoção |
|-------|-------------------|
| `z22_gate` | `C_GATE_PASS` |
| `cockpit_mode` | `ppap_native` |
| `promotion_applied` | `true` |
| `consolidation_applied` | `true` |
| `inactive` | `false` |
| `bound_blocks` | 12/12 |

**Sem** `force_ppap_render` · **sem** `force_ppap_consolidation` · **sem** alteração de thresholds.

---

## Fase 3 — Consolidação

| Superfície | Validação |
|------------|-----------|
| `ppap_cognitive_runtime` | `runtime_id=ppap_native` · `gf=GF-006` |
| `ppap_cognitive_centers` | **6 centers** homologados |
| Registries frontend | `PPAP_HUB_REGISTRY` · 6 hubs |
| Cockpit resolver | `resolvePpapCockpitRuntime` · `shouldSuppressPpapPlaceholderWidgets=true` |
| Payload `/dashboard/me` | Paridade report ↔ payload |

### Hubs activos

`SubmissionGovernanceHub` · `SupplierApprovalHub` · `DimensionalHub` · `CapabilityHub` · `EngineeringHub` · `CognitivePpapHub`

---

## Fase 4 — Regressão cruzada

Com **PPAP flags ON**, perfis homologados no tenant referência (`511f4819-…`) — PPAP permanece **inactivo**; domínios preservam `cockpit_mode` baseline:

| Domínio | Perfil | `cockpit_mode` | PPAP |
|---------|--------|----------------|------|
| Executive | `ceo_executive` | `executive_boardroom` | inactivo |
| Production | `manager_production` | `production_native` | inactivo |
| Maintenance | `manager_maintenance` | `maintenance_native` | inactivo |
| Quality | `manager_quality` | `quality_native` | inactivo* |
| Logistics | `manager_logistics` | `logistics_native` | inactivo |
| Environment | `manager_environmental` | `environmental_native` | inactivo |
| HR | `manager_hr` | `hr_native` | inactivo |
| SST | `manager_safety` | `safety_native` | inactivo |

\* Tenant referência sem massa PPAP — comportamento OFF correcto.

**Coexistência Quality + PPAP** (tenant piloto GF-005):

- `specialized_cockpit_runtime.cockpit_mode = quality_native` — baseline Quality **preservado**
- `ppap_cognitive_runtime.inactive = false` — PPAP activo em paralelo no mesmo perfil `manager_quality`

Suites de regressão executadas: Quality · Logistics · Production · Maintenance · Environment · HR · SST · Executive + promotion chain PPAP.

---

## Modo OFF — tenant vazio

| Campo | Valor |
|-------|-------|
| `company_id` | `00000000-0000-4000-8000-000000000099` |
| `binding_ratio` | `0` |
| `promotion_applied` | `false` |
| `consolidation_applied` | `false` |
| `inactive` | `true` |
| `reason` | `insufficient_binding_no_dataset` |

---

## Modo ON — tenant piloto

| Campo | Valor |
|-------|-------|
| `binding_ratio` | `1.0` |
| `signal_readiness` | `ready` |
| `promotion_applied` | `true` |
| `consolidation_applied` | `true` |
| `inactive` | `false` |
| `cockpit_mode` | `ppap_native` |
| `centers_count` | `6` |

---

## Thresholds homologados

| Fase | Threshold | Fonte |
|------|-----------|-------|
| Z.22 render promotion | `≥ 0.5` | `phaseZ22FeatureFlags.minBindingRatioForRender()` |
| Z.23 consolidation | `≥ 0.35` | `Z23_MIN_BINDING_RATIO` |

Z.23 PPAP exige promoção específica: `cognitive_render_promotion.cockpit_mode === 'ppap_native'` (evita confusão com Quality no perfil `manager_quality`).

---

## Alterações técnicas GF-006

| Ficheiro | Alteração |
|----------|-----------|
| `ppapConsolidationSupervisor.js` | Gate Z.23 exige `cockpit_mode=ppap_native` |
| `ppapFoundationAttachment.js` | Preserva estado promovido pós-consolidação (`gf: GF-006`) |
| `cognitiveRuntimeFacade.js` | `ppap_render_promoted` derivado de report ou `cockpit_mode` |
| `tests/ppap/runPpapRuntimeHomologationTests.js` | Homologação OFF/ON + cross-domain |
| `package.json` | `test:ppap-runtime-homologation` |

---

## Testes

```bash
npm run test:ppap-runtime-homologation   # 9/9
npm run test:ppap-promotion-chain        # 7/7
npm run test:ppap-signal-loader          # 9/9
npm run test:ppap-pilot-enablement       # 7/7
```

---

## Baseline entregue

**[BASELINE-PPAP-v1.0.md](BASELINE-PPAP-v1.0.md)** — arquitectura final, block pack, thresholds, hubs, payload oficial, critérios de promoção e evidências.

---

## Índice mestre — INC-045 (concluída)

A recomendação de registo sistémico foi executada em **[INC-045-PPAP-REGISTRATION.md](INC-045-PPAP-REGISTRATION.md)**:

- **`ppap_native`** registado no catálogo oficial  
- **[BASELINE-SYSTEM-v1.2.md](BASELINE-SYSTEM-v1.2.md)** publicado  
- **[EVOLUTION-TAXONOMY-v1.0.md](EVOLUTION-TAXONOMY-v1.0.md)** — taxonomia INC/GF/EV oficial  

---

## Trilha Greenfield PPAP (concluída)

| GF | Estado |
|----|--------|
| GF-000 Discovery | ✅ |
| GF-001 Runtime Foundation | ✅ |
| GF-002 Core Domain | ✅ |
| GF-003 Signal Loader | ✅ |
| GF-004 Promotion + CC | ✅ |
| GF-005 Pilot Enablement | ✅ |
| **GF-006 Homologation** | **✅ LOCKED** |

**Registo sistémico:** **INC-045** ✅ — [BASELINE-SYSTEM-v1.2.md](BASELINE-SYSTEM-v1.2.md)
