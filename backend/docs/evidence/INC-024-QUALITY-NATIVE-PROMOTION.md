# INC-024 — Promoção do Runtime Cognitivo Quality (Z.23)

**Data:** 2026-07-15  
**Tipo:** promoção de runtime existente (sem novos widgets/APIs/hubs)  
**Pré-requisitos:** INC-022 (superfície), INC-023 (auditoria)

---

## Objetivo

Promover o cockpit `quality_native` já implementado para o **Centro de Comando** do perfil **Gerente de Qualidade**, reutilizando integralmente a infraestrutura Z.22/Z.23 e os hubs em `frontend/src/domains/quality/`.

---

## Auditoria inicial

| Campo | Valor |
|-------|-------|
| **IMPETUS_SPECIALIZED_COCKPIT_RUNTIME** | `quality_native` (`.env` / PM2+dotenv) |
| **quality_native** | Backend Z.23 `cognitiveCockpitConsolidator` + frontend `QualityNativeCockpitPromotion` |
| **widgets_promoted** | Payload `/dashboard/me` via Z.22 `controlledRenderPromotion` |
| **consolidation_applied** | Gate Z.23 após Z.22 + `binding_ratio ≥ 0.35` |
| **dashboardContextAdapter** | `_buildFromSpecializedCockpit` quando `consolidation_applied` |
| **dashboardPersonalizadoService** | Inalterado (fallback legacy) |
| **LayoutPorCargo** | Inalterado; placeholders suprimidos no render |

### Respostas obrigatórias

```
QUALITY_RUNTIME_READY    = YES  (~78 ficheiros domínio + 7 centers Z.23 + APIs quality-*)
QUALITY_RUNTIME_PROMOTED = YES  (INC-024: pilot manager_quality + render no CentroComando)
PROMOTION_BLOCKER        = PARTIAL — ver tabela abaixo
```

---

## Alterações (INC-024)

### Backend

| Ficheiro | Mudança |
|----------|---------|
| `phaseZ22FeatureFlags.js` | `PILOT_PROFILES` inclui `manager_quality`, `supervisor_quality` |
| `phaseZ23FeatureFlags.js` | Idem |
| `dashboardProfiles.js` | Rotas `quality_dashboard` → `/app/quality/operational` |
| `qualityKpiAdapter.js` | KPIs especializados → `/app/quality/operational` |

### Frontend

| Ficheiro | Mudança |
|----------|---------|
| `qualityNativeCockpitRegistry.js` | Mapa `center_id` → hubs existentes + supressão placeholders |
| `QualityNativeCockpitPromotion.jsx` | Lazy-load `QualityGovernanceHub`, `QualityTelemetryHub`, `CognitiveQualityHub` |
| `CentroComando.jsx` | Se `quality_native` + `consolidation_applied`: suprime widgets genéricos, renderiza hubs |

---

## Integração Centro de Comando

**Antes:**

```
CentroComando → dashboardPersonalizadoService / LayoutPorCargo → WidgetQualidade (summary genérico)
```

**Depois (quality_native activo):**

```
/dashboard/me → Z.22 widgets_promoted + Z.23 quality_cognitive_centers
CentroComando → resolveSpecializedCockpitRuntime → QualityNativeCockpitPromotion
  → QualityGovernanceHub   (NC/CAPA/SPC)
  → QualityTelemetryHub    (telemetria industrial)
  → CognitiveQualityHub    (drift, risco, supplier intelligence, narrativa)
```

Widgets genéricos suprimidos: `qualidade`, `kpi_cards`, `rastreabilidade`, `receitas`, `grafico_tendencia`, `operacoes`, `manutencao`.

---

## Módulos e promoção

| Capacidade | Hub / componente | Promovido CC | Notas |
|------------|------------------|--------------|-------|
| NC / CAPA | `QualityGovernanceHub` | **YES** | Centers `quality_operational_nc`, `quality_action_capa`, `quality_governance` |
| SPC | `QualityGovernanceHub` (`SpcPanel`) | **YES** | Center `quality_telemetry_spc` → hub telemetria; SPC também no governance |
| Telemetria | `QualityTelemetryHub` | **YES** | Center `quality_telemetry_spc` |
| Inteligência contextual | `CognitiveQualityHub` | **YES** | Centers `quality_narrative`, `quality_decision_support` |
| Supplier Intelligence | `CognitiveQualityHub` | **YES** | Embutido no hub cognitivo (não hub separado) |
| Inspeções | `QualityInspectionRuntime` | **NO** | Sem `center_id` Z.23 — workspace `/app/quality/operational/inspection` |
| Rollout | `QualityRolloutHub` | **NO** | Sem `center_id` Z.23 — flag rollout separada |
| Rastreabilidade | `WidgetRastreabilidade` | **NO** | Sem hub dedicado; widget genérico suprimido |

### Bloqueadores documentados (sem versão alternativa)

| PROMOTION_BLOCKER | DEPENDENCY | REASON |
|-------------------|------------|--------|
| `quality_inspection_center` | Z.23 center registry | Nenhum `center_id` mapeado; componente existe fora do consolidator |
| `quality_rollout_center` | Z.23 center registry | Rollout não entra no bundle de 6 centers |
| `quality_traceability_hub` | UI domínio | Apenas widget genérico; sem hub em `domains/quality/` |

---

## Gates runtime (produção)

Consolidação Z.23 exige:

1. `IMPETUS_SPECIALIZED_COCKPIT_RUNTIME=quality_native`
2. `IMPETUS_QUALITY_NATIVE_COCKPIT=on|pilot|quality_native`
3. `IMPETUS_COGNITIVE_RENDER_PROMOTION=controlled`
4. Perfil em `PILOT_PROFILES` (**manager_quality** após INC-024)
5. `cognitive_render_promotion.promotion_applied=true`
6. `qualityPilot.engine_bridge.binding_ratio ≥ 0.35`

Se algum gate falhar, `consolidation_applied=false` e o CC mantém fallback legacy (documentar `PROMOTION_BLOCKER` no payload).

---

## Resultado esperado

```
QUALITY_NATIVE_PROMOTED     = YES
GENERIC_WIDGETS_REPLACED    = YES (supressão + hubs Z.23)
QUALITY_RUNTIME_ACTIVE      = YES (quando gates Z.22/Z.23 passam)
PLACEHOLDERS_REMAINING      = 0 (com quality_native activo)
```

---

## Não alterado (baseline congelado)

INC-014 → INC-023, CSS, grelhas, Onipresença, Whisper, RBAC, resolvedor de superfícies (INC-022).

---

## Testes

```bash
# Frontend
cd frontend && npm run test:quality-native-cockpit-promotion

# Backend (consolidação Z.23 existente)
cd backend && npm run test:quality-native-cockpit
```

---

## Deploy

Após merge:

1. `npm run build` (frontend)
2. `pm2 restart impetus-frontend`
3. `pm2 restart impetus-backend --update-env` (flags Z.22/Z.23 + pilot profiles)

Validar com utilizador `manager_quality`: `/dashboard/me` → `specialized_cockpit_runtime.consolidation_applied=true` e Centro de Comando com 3 hubs nativos.
