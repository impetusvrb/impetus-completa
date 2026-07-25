# INC-026 — Diagnóstico da Promoção do Runtime Quality

**Data:** 2026-07-15  
**Tipo:** diagnóstico read-only (sem implementação)  
**Contexto:** INC-022 OK (superfície); INC-024 declarada mas **não validada visualmente**

---

## Sintoma reportado

```
PROFILE              = manager_quality
SURFACE              = CentroComando
QUALITY_NATIVE       = NOT_RENDERED
GENERIC_LAYOUT       = ACTIVE
```

---

## Resposta directa (critério de encerramento)

> **Por que um Gerente de Qualidade continua vendo o Centro de Comando genérico, mesmo após a INC-024 declarar que o runtime quality_native foi promovido?**

Porque **`/dashboard/me` não entrega `specialized_cockpit_runtime.consolidation_applied=true`** em produção. A cadeia Z.21 → Z.22 → Z.23 **interrompe-se no backend** antes de popular `quality_cognitive_centers`. O frontend INC-024 **está deployado** e **funcionaria** se o payload tivesse consolidação activa; hoje `QualityNativeCockpitPromotion` **não é montado** (`qualityNativeActive=false`).

**Cenário confirmado:** **#1 — backend não activa quality_native no payload** (não é falha de lazy-load/registry).

---

## ROOT_CAUSE

| Campo | Valor |
|-------|-------|
| **ROOT_CAUSE** | `binding_ratio` do engine bridge Z.20 (**~0.375** em tenant real) **inferior** ao mínimo Z.21/Z.22 (**0.5**), bloqueando `promotion_applied` e, em cascata, `consolidation_applied` |
| **BROKEN_STAGE** | **Backend — Z.22 Render Promotion** (gate `insufficient_binding_for_render`) → **Z.23 Consolidation** nunca corre (`z22_render_promotion_required`) |
| **EXPECTED_VALUE** | `specialized_cockpit_runtime.consolidation_applied=true`, `cockpit_mode=quality_native`, `quality_cognitive_centers.length=6`, `cognitive_render_promotion.promotion_applied=true`, `binding_ratio≥0.5` |
| **ACTUAL_VALUE** | `consolidation_applied=false`, `cockpit_mode=off`, `quality_cognitive_centers` ausente/vazio, `promotion_applied=false`, `binding_ratio≈0.375` |
| **FIX_REQUIRED** | YES — ajuste de gate **ou** enriquecimento de dados quality tenant **ou** INC de promoção forçada para piloto `manager_quality` (não feito nesta INC) |
| **RISK** | Baixo se alinhar thresholds Z.22/Z.23; médio se forçar promoção sem dados (hubs vazios) |

---

## Etapa 1 — Payload `/dashboard/me` (valores esperados vs actuais)

**Nota metodológica:** captura HTTP autenticada em tempo real não disponível nesta sessão (sem token de produção). Valores **ACTUAL** inferidos de: (a) telemetria PM2 `manager_quality`, (b) evaluadores Z.21/Z.22/Z.23 no código, (c) teste de consolidação com `binding_ratio:0.375`.

### JSON reconstruído — estado ACTUAL (produção)

```json
{
  "profile_code": "manager_quality",
  "functional_area": "quality",
  "cockpit_mode": "off",
  "specialized_cockpit_runtime": {
    "phase": "Z.23",
    "cockpit_mode": "off",
    "consolidation_applied": false,
    "reason": "z22_render_promotion_required"
  },
  "cognitive_render_promotion": {
    "phase": "Z.22",
    "mode": "controlled",
    "promotion_applied": false,
    "render_active": false,
    "reason": "insufficient_binding_for_render",
    "binding_ratio": 0.375
  },
  "specialized_delivery": {
    "phase": "Z.21",
    "promotion_applied": false,
    "reason": "insufficient_engine_binding",
    "binding_ratio": 0.375
  },
  "widgets_promoted": null,
  "quality_cognitive_centers": null,
  "quality_cockpit_pilot": {
    "pilot_skipped": false,
    "engine_bridge": {
      "blocks_bound": 3,
      "blocks_empty": 5,
      "binding_ratio": 0.375
    }
  }
}
```

### JSON esperado — INC-024 validada

```json
{
  "profile_code": "manager_quality",
  "specialized_cockpit_runtime": {
    "phase": "Z.23",
    "cockpit_mode": "quality_native",
    "consolidation_applied": true,
    "specialized_ratio": 1,
    "centers": [ "…6 entries…" ]
  },
  "cognitive_render_promotion": {
    "phase": "Z.22",
    "promotion_applied": true,
    "render_active": true,
    "cockpit_mode": "quality_native"
  },
  "widgets_promoted": [ "…≥4 promoted…" ],
  "quality_cognitive_centers": [
    { "center_id": "quality_operational_nc", "label": "Centro de Não Conformidades" },
    { "center_id": "quality_action_capa", "label": "Centro CAPA" },
    { "center_id": "quality_telemetry_spc", "label": "…" },
    { "center_id": "quality_governance", "label": "…" },
    { "center_id": "quality_narrative", "label": "…" },
    { "center_id": "quality_decision_support", "label": "…" }
  ],
  "pilot_profile": "manager_quality",
  "binding_ratio": 0.85
}
```

### Campos auditados

| Campo | EXPECTED | ACTUAL |
|-------|----------|--------|
| `cockpit_mode` | `quality_native` | `off` |
| `specialized_cockpit_runtime.consolidation_applied` | `true` | **`false`** |
| `runtime` / `runtime_name` | Z.23 quality_native | Z.18 observability only |
| `widgets_promoted` | array ≥4 | **null/ausente** |
| `quality_cognitive_centers` | **6 centers** | **null/ausente** |
| `pilot_profile` | `manager_quality` | `manager_quality` (OK pós INC-024) |
| `promotion_applied` | `true` | **`false`** |
| `binding_ratio` | ≥ **0.5** | **~0.375** |

**Evidência telemetria:** `backend/docs/pm2-live-runtime-audit.md` — amostra tenant real `manager_quality`; logs `SHADOW_COCKPIT_ENRICHED` com `blocks_bound:3`, `binding_ratio:0.375` (facade test run idêntico).

---

## Etapa 2 — Backend identifica `manager_quality` como quality_native?

| Check | Resultado |
|-------|-----------|
| `dashboardProfileResolver` → `manager_quality` | **OK** |
| `isQualityProfile()` | **OK** (`profile_code.includes('quality')`) |
| `PILOT_PROFILES` Z.22/Z.23 inclui `manager_quality` | **OK** (INC-024) |
| Resolve para `command_center` genérico? | **NÃO** — perfil correcto; falha é **runtime gate**, não profile resolver |
| Resolve para `generic_runtime`? | **SIM** — payload final comporta-se como runtime genérico porque Z.23 não consolida |

**Conclusão Etapa 2:** perfil **correcto**; runtime **não promovido**.

---

## Etapa 3 — Onde a cadeia interrompe

| Componente | Estado | Detalhe |
|------------|--------|---------|
| `dashboardProfileResolver` | OK | `manager_quality` |
| `structuralModuleResolver` | OK | `quality_intelligence` permitido |
| `cognitiveRuntimeFacade.applyCognitiveFoundationToDashboard` | **BROKEN** | Z.21/Z.22 skip |
| `applyControlledEnrichment` (Z.21) | **BROKEN** | `insufficient_engine_binding` |
| `applyControlledRenderPromotion` (Z.22) | **BROKEN** | `insufficient_binding_for_render` |
| `applyCognitiveCockpitConsolidation` (Z.23) | **BROKEN** | `z22_render_promotion_required` |
| `dashboardContextAdapter` | OK (fallback) | Usa `personalizado` / `layout_fallback` — widgets genéricos |
| `dashboardPersonalizadoService` | OK | Entrega layout legacy |
| `qualityNativeCockpitRegistry` | OK | Mapa centers→hubs intacto |
| `QualityNativeCockpitPromotion` | **NOT REACHED** | Gate frontend `consolidation_applied` |

### Ficheiros e linhas — gates críticos

**Z.21 — binding mínimo 0.5**

```31:38:backend/src/cognitiveRuntime/domainAdapters/runtime/enrichPromotionSupervisor.js
  if (bindingRatio < minRatio && mode === 'enrich' && !ctx.force_specialized_enrich) {
    return {
      allowed: false,
      mode,
      reason: 'insufficient_engine_binding',
      binding_ratio: bindingRatio,
      min_required: minRatio
    };
  }
```

**Z.22 — binding mínimo 0.5 + exige Z.21**

```33:54:backend/src/cognitiveRuntime/renderPromotion/runtime/renderPromotionSupervisor.js
  if (bindingRatio < minRatio && mode === 'controlled' && !ctx.force_render_promotion) {
    return {
      allowed: false,
      mode,
      reason: 'insufficient_binding_for_render',
      binding_ratio: bindingRatio,
      min_required: minRatio
    };
  }
  // ...
  if (!z21Enrich && mode === 'controlled' && !ctx.force_render_promotion) {
    return { allowed: false, mode, reason: 'z21_enrich_required_first' };
  }
```

**Z.23 — exige Z.22**

```26:33:backend/src/cognitiveRuntime/cockpitConsolidation/runtime/cognitiveCockpitConsolidator.js
  const needsZ22 =
    payload.cognitive_render_promotion?.promotion_applied === true ||
    ctx.z22_render_promoted === true ||
    ctx.force_cockpit_consolidation === true ||
    ctx.force_render_promotion === true;
  if (!needsZ22) {
    return { allowed: false, reason: 'z22_render_promotion_required' };
  }
```

**Env produção:** `IMPETUS_Z21_MIN_BINDING_RATIO=0.5`, `IMPETUS_Z22_MIN_BINDING_RATIO=0.5` (`.env` L481–488, L861–868).

**Inconsistência documental INC-024:** consolidator Z.23 aceita `binding_ratio ≥ 0.35` (L34–36), mas **nunca é atingido** porque Z.22 bloqueia a 0.5.

---

## Etapa 4 — `quality_cognitive_centers`

| Campo | Esperado | Actual |
|-------|----------|--------|
| Count | **6** | **0** (campo não populado) |
| Onde deixa de ser preenchido | — | `applyCognitiveCockpitConsolidation` retorna early (`evaluateConsolidationEligibility.allowed=false`) → `consolidateQualityCockpit()` **nunca executado** |

Centers só são atribuídos em:

```87:87:backend/src/cognitiveRuntime/cockpitConsolidation/runtime/cognitiveCockpitConsolidator.js
    enriched.quality_cognitive_centers = consolidated.centers;
```

---

## Etapa 5 — `QualityNativeCockpitPromotion` montado?

| Registro | Valor |
|----------|-------|
| **render** | **NO** |
| **lazy loaded** | N/A (componente não montado) |
| **returned null** | N/A |

**Condição de montagem:**

```172:172:frontend/src/features/dashboard/centroComando/CentroComando.jsx
  const qualityNativeActive = shouldSuppressPlaceholderWidgets(qualityNativeCockpit?.runtime);
```

```352:360:frontend/src/features/dashboard/centroComando/CentroComando.jsx
              {qualityNativeActive ? (
                <ModuleErrorBoundary moduleName="Qualidade Z.23">
                  <QualityNativeCockpitPromotion
                    centers={qualityNativeCockpit?.centers || []}
                    companyId={user?.company_id}
                    runtime={qualityNativeCockpit?.runtime}
                  />
```

`qualityNativeActive` exige `consolidation_applied=true` **e** `cockpit_mode=quality_native`:

```69:73:frontend/src/cognitiveRuntime/cockpit/qualityNativeCockpitRegistry.js
export function shouldSuppressPlaceholderWidgets(specializedRuntime) {
  return (
    specializedRuntime?.consolidation_applied === true &&
    specializedRuntime?.cockpit_mode === 'quality_native'
  );
}
```

**Resolver frontend retorna null:**

```5:7:frontend/src/cognitiveRuntime/cockpit/specializedCockpitResolver.js
export function resolveSpecializedCockpitRuntime(meData = {}) {
  const runtime = meData?.specialized_cockpit_runtime;
  if (!runtime?.consolidation_applied) return null;
```

---

## Etapa 6 — Se montado, por que hubs não apareceriam?

**N/A nesta produção** — componente não montado.

Se `consolidation_applied=true` com centers vazios: `resolvePromotedQualityHubs([])` → `return null` (L29 QualityNativeCockpitPromotion.jsx). Não é o caso actual.

**Frontend deploy INC-024:** confirmado — string `quality_native` presente em `frontend/dist/assets/ops-core-XLAWDQf-.js` (bundle pós-build).

---

## Etapa 7 — Cadeia completa

```
Login                          OK
  ↓
GET /dashboard/me              OK (responde)
  ↓
Profile Resolver               OK → manager_quality
  ↓
Z.19 Quality Cockpit Pilot     OK → shadow cockpit composto
  ↓
Z.20 Engine Bridge             PARTIAL → binding_ratio ≈ 0.375 (3/8 blocks)
  ↓
Z.21 Specialized Delivery      BROKEN → insufficient_engine_binding
  ↓
Z.22 Render Promotion          BROKEN → insufficient_binding_for_render
  ↓
Z.23 Cockpit Consolidation     BROKEN → z22_render_promotion_required
  ↓
Payload quality_cognitive_centers   BROKEN → null/0
  ↓
useDashboardContext (mePayload)     OK → repassa payload sem centers
  ↓
resolveSpecializedCockpitRuntime    BROKEN → null (consolidation_applied false)
  ↓
CentroComando qualityNativeActive   BROKEN → false
  ↓
QualityNativeCockpitPromotion       NOT MOUNTED
  ↓
Hubs (Governance/Telemetry/Cognitive) NOT RENDERED
  ↓
LayoutPorCargo / personalizado      ACTIVE → widgets genéricos visíveis
```

---

## Cenário #2 (frontend) — descartado como causa primária

| Hipótese | Verdict |
|----------|---------|
| Frontend não consome promoção | **Secundário** — consumo depende de `mePayload.specialized_cockpit_runtime`; campo chega sem consolidação |
| Registry/hub/lazy import | **Não testado em runtime** — código deployado; gate impede montagem |
| `dashboardContextAdapter` prioriza personalizado | **Afecta widgets genéricos**, não impede hubs se `qualityNativeActive=true` |

Referência: `pm2-live-runtime-audit.md` §7 — adapter prefere personalizado para **widgets**, mas INC-024 lê **`mePayload` directamente** para hubs.

---

## INC-024 vs produção — gap

| INC-024 assumiu | Produção real |
|-----------------|---------------|
| `manager_quality` em PILOT_PROFILES | OK após restart |
| Z.23 `consolidation_applied=true` | **FALHA** — gate Z.22 |
| Hubs renderizados no CC | **FALHA** — gate backend |
| Testes 14/14 passam | Usam `force_cockpit_consolidation` / `binding_ratio:0.85` — **não reproduzem tenant real** |

---

## IMPLEMENTATION_PLAN (fora INC-026 — não executado)

1. **Confirmar em browser:** DevTools → Network → `/dashboard/me` → verificar `specialized_cockpit_runtime.reason` e `binding_ratio` (validação humana 30s).
2. **Opção A — alinhar gates:** `IMPETUS_Z22_MIN_BINDING_RATIO=0.35` (alinhar Z.22 ao Z.23) + restart backend.
3. **Opção B — dados tenant:** garantir ≥5/8 quality blocks bound (inspeções NC, CAPA, SPC com dados reais).
4. **Opção C — INC promoção piloto:** bypass controlado `manager_quality` quando `binding_ratio≥0.35` (código Z.22 supervisor).
5. **Re-validar:** `consolidation_applied=true` → hubs visíveis → `PLACEHOLDERS_REMAINING=0`.

---

## Critérios INC-026

| Critério | Status |
|----------|--------|
| Resposta objectiva à pergunta de encerramento | **YES** |
| Cadeia documentada OK/BROKEN | **YES** |
| Sem alteração de código | **YES** |
| ROOT_CAUSE identificada | **YES — binding_ratio gate Z.21/Z.22** |

```
INC-026_STATUS           = CLOSED (diagnóstico)
INC-024_STATUS           = NOT VALIDATED (bloqueada por backend gate)
QUALITY_NATIVE_RENDERED  = NO (causa upstream)
FIX_IMPLEMENTATION       = REQUIRES NEW INC (027+)
```
