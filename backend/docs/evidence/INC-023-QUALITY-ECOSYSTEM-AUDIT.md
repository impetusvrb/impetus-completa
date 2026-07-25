# INC-023 — Auditoria do Ecossistema Cognitivo de Qualidade

**Data:** 2026-07-15  
**Tipo:** auditoria read-only (sem implementação)  
**Pré-requisito:** INC-022 (`QUALITY_SURFACE_LOCKED`)

---

## Gate de validação

| Campo | Valor |
|-------|-------|
| **QUALITY_PROFILE** | OK |
| **QUALITY_SURFACE** | OK (CentroComando) |
| **QUALITY_MODULES_REGISTERED** | **YES** (parcial — registry incompleto em paths) |
| **QUALITY_MODULES_AVAILABLE** | **YES** (domínio + APIs + runtime cognitivo Z.23) |
| **QUALITY_MODULES_VISIBLE** | **PARTIAL** (widgets genéricos no CC; workspace em rota separada) |
| **QUALITY_MODULES_FILTERED** | **YES** (audiência, flags, structural resolver) |
| **QUALITY_ECOSYSTEM_AUDITED** | YES |
| **QUALITY_IMPLEMENTATION_STATUS** | DOCUMENTED |
| **READY_FOR_QUALITY_MODULES** | **YES** |

---

## Cadeia de registo mapeada

| Conceito solicitado | Equivalente canónico |
|---------------------|----------------------|
| `commandCenterModules` | `LayoutPorCargo.js` + `CentroComando.jsx` (`WIDGET_COMPONENTS`) + `dashboardPersonalizadoService.gerarConfigPorRegras` |
| `profileModuleResolver` | `dashboardProfileResolver.js` + `structuralModuleResolver.js` + `contextualModules/index.js` |
| `dashboardRegistry` | `dashboardWidgetRegistry.js` |
| `moduleRegistry` | `backend/src/contextualModules/moduleRegistry.js` |
| `visibleModules` | `dashboardProfiles.js` → `/dashboard/me` → `useVisibleModules.js` |
| `dashboardSurfaceCapabilities` | INC-009/022 — **não alterado nesta auditoria** |

### Fluxo Centro de Comando

```
/dashboard/me → engine_v2 | personalizado | LayoutPorCargo (fallback)
              → dashboardContextAdapter.buildDashboardContext()
              → prioridade: executive → environmental → maintenance → production → hr → safety
                → specialized_cockpit (quality_native Z.23) → personalizado → cognitive_promotion → engine_v2
              → CentroComando renderiza widgets por id
```

---

## Respostas obrigatórias

```
QUALITY_MODULES_REGISTERED = YES (quality_intelligence, raw_material_lots, widgets qualidade/rastreabilidade/receitas)
QUALITY_MODULES_AVAILABLE  = YES (78 ficheiros frontend + 8 rotas API backend + 7 cognitive centers Z.23)
QUALITY_MODULES_VISIBLE      = PARTIAL (CC: widgets genéricos; menu: manifesto quality se flags ON)
QUALITY_MODULES_FILTERED     = YES (structuralModuleResolver, audience bands, feature flags)
```

---

## Inventário por módulo

Legenda: **E**=existe · **P**=parcial · **M**=inexistente · **R**=registado · **V**=visível Gerente Qualidade · **A**=API

| Módulo / capacidade | Status | Registo | Visível CC | API | Notas |
|---------------------|--------|---------|------------|-----|-------|
| Não Conformidades (NCR) | E | R | P | A | `QualityGovernanceHub`, `NcrCapaPanel`, `/nc-capa-summary`, center `quality_operational_nc` |
| CAPA / Ações corretivas | E | R | P | A | Workflows `quality-universal`, flags CAPA intelligence |
| Ações preventivas | P | — | P | P | Implícito em CAPA; sem módulo autónomo |
| Plano de Ação | P | — | P | P | Cards `corrective_overdue`; sem workspace dedicado |
| Inspeções | E | R | — | A | `/app/quality/operational/inspection`, `QualityInspectionRuntime` |
| Auditorias | P | R (`audit`) | — | A | `GET /quality-governance/audit/explore`; sem hub Interna/Externa |
| Auditorias Internas/Externas | M | — | — | — | Não implementado como módulos separados |
| Indicadores da Qualidade / KPIs | P | R | P | A | `WidgetKpiCards` genérico + `/quality-intelligence/indicators` |
| SPC / CEP | E | R | — | A | `SpcPanel`, `qualityControlChartEngine`; view `?view=governance` |
| FMEA | P | R | — | A | `POST /fmea/rank` — **sem UI dedicada** |
| MSA | M | — | — | — | **QUALITY_MODULE_NOT_IMPLEMENTED** |
| PPAP | M | — | — | — | **QUALITY_MODULE_NOT_IMPLEMENTED** |
| Ishikawa | P | P | — | P | `qualityRootCauseEngine.buildIshikawaTemplate()` — **MISSING_COMPONENT** `IshikawaCanvas` |
| 5 Porquês | M | — | — | — | **MISSING_COMPONENT** |
| RNC (registo) | E | R | P | A | Alias NCR no workspace governance |
| Rastreabilidade | E | R | V | A | `WidgetRastreabilidade`, `raw_material_lots` |
| Desvios | P | R | P | P | Cards `deviation_recurrence`; sem workspace |
| Documentação / ISO | M | — | — | — | **MISSING_MODULE** |
| Gestão de Fornecedores | E | R | — | A | `QualitySupplierIntelligence`, supplier scorecard API |
| Telemetria industrial | E | R | — | A | `QualityTelemetryHub`, ingest APIs |
| Inteligência cognitiva | E | R | P | A | `CognitiveQualityHub`, `/quality-cognitive/insights/run` |
| Rollout enterprise | E | R | — | A | `QualityRolloutHub` |
| Offline / Kiosk / Scanner | E | R | — | A | Runtimes operacionais completos |
| Widget Centro de Qualidade (CC) | P | R | V | P | **MISSING_DATASET** — usa `dashboard.getSummary()` genérico, não `/quality-intelligence/dashboard` |
| Cockpit quality_native (Z.23) | E | R | P | A | 7 centers backend; promoção depende `widgets_promoted` + gates Z.22 |

---

## GAPs de integração (causa dos placeholders)

1. **CentroComando mostra Motor A genérico** — `WidgetQualidade` + KPI/alertas/IA transversais, não os hubs de `domains/quality/`.
2. **Cockpit cognitivo Z.23 existe mas não substitui placeholders** — requer `specializedCockpitRuntime.consolidation_applied` + `widgets_promoted`; genéricos colapsados por `collapseGenericWidgets`.
3. **Workspace quality completo em rota separada** — `/app/quality/operational` (+ views governance/telemetry/cognitive); **não embedado** no grid do CentroComando.
4. **Cards perfil apontam `/app/quality`** — rota **inexistente** em `App.jsx` (canónica: `/app/quality/operational`).
5. **`moduleRegistry.paths` vazio** para `quality_intelligence` — depende de `qualityNavigationManifest.js`.

---

## Filtros activos (`QUALITY_MODULES_FILTERED`)

| Filtro | Efeito |
|--------|--------|
| `structuralModuleResolver` | `quality_intelligence` exige `eixo_qualidade` primário ou resp. qualidade |
| `qualityAudienceNavigation` | Governance/cognitive/rollout filtrados por banda (`director` vs `operator`) |
| Feature flags Vite | `.env.production` — **flags quality ON** |
| Feature flags backend | `IMPETUS_QUALITY_COGNITIVE_RUNTIME_ENABLED=true`, `IMPETUS_SPECIALIZED_COCKPIT_RUNTIME=quality_native` |
| `quality_widgets_only` | Banda `production` — perfis quality normais não veem |

---

## APIs disponíveis (`QUALITY_APIS_AVAILABLE = YES`)

| Prefixo | Estado |
|---------|--------|
| `/api/quality-intelligence` | Ativo |
| `/api/quality-operational` | Ativo (flag runtime) |
| `/api/quality-governance` | Ativo (flag runtime) |
| `/api/quality-telemetry` | Ativo |
| `/api/quality-cognitive` | Ativo |
| `/api/quality-navigation` | Ativo |
| `/api/quality-rollout` | Ativo |
| `/api/internal/quality-universal` | Interno (NCR/CAPA workflows) |

---

## Dados (`QUALITY_DATA_AVAILABLE = PARTIAL`)

- APIs existem; widgets do CentroComando **não consomem** endpoints quality-specific na maioria.
- Cockpit Z.23 depende de `bindings` / `signalBundle` do pipeline cognitivo.
- KPI cards usam summary/dashboard genérico multi-domínio.

---

## Comparação com outros eixos (padrão arquitectural)

| Eixo | Widget CC dedicado | Cockpit native (Z) | Workspace `/app/{domain}/operational` | Menu publication |
|------|-------------------|---------------------|--------------------------------------|------------------|
| Qualidade | `WidgetQualidade` | `quality_native` (Z.23) | ✅ 78 ficheiros | ✅ manifesto |
| Manutenção | `WidgetManutencao` | `maintenance_native` | ✅ ManuIA | ✅ |
| Produção | `WidgetOperacoes` | `production_native` | ✅ | ✅ |
| Segurança | — (KPI genérico) | `safety_native` | ✅ | ✅ |
| Meio Ambiente | — (`WidgetOperacoes`) | `environmental_native` | ✅ | ✅ |
| RH | — (`WidgetGraficoClimaEquipe`) | `hr_native` | ✅ Pulse RH | ✅ |

**Qualidade tem mais código de domínio que RH/Ambiente no workspace, mas integração CC igual ou inferior a Manutenção/Produção.**

---

## `QUALITY_MODULES_MISSING` (consolidado)

```
MISSING_MODULE:     PPAP, MSA, 5 Porquês, Auditorias Internas/Externas, Documentação ISO
MISSING_COMPONENT:  IshikawaCanvas (shell referenciado, ficheiro 0)
MISSING_WIDGET:     WidgetQualidade → quality-intelligence/dashboard (desacoplado)
MISSING_API:        PPAP, MSA
MISSING_DATASET:    WidgetQualidade (summary genérico)
MISSING_ENGINE:     —
QUALITY_MODULE_NOT_IMPLEMENTED: PPAP, MSA, 5 Porquês, ISO docs hub
```

---

## Prioridade de implementação (`NEXT_IMPLEMENTATION_PRIORITY`)

1. **Activar promoção cockpit quality_native (Z.22/Z.23)** para `manager_quality` — substituir placeholders genéricos por centers reais (NCR, CAPA, SPC, telemetria, narrativas).
2. **Ligar `WidgetQualidade` a `/api/quality-intelligence/dashboard`** (ou enrich via `qualitySummaryAdapter` já existente).
3. **Corrigir rota cards** `/app/quality` → `/app/quality/operational`.
4. **Embutir ou deep-link cognitivo** — padrão Safety/Environment: centers Z.23 → `render_slot` nos widgets CC.
5. **Implementar `IshikawaCanvas`** shell referenciado em `qualityGovernanceUiEngine.js`.
6. **Painel FMEA** consumindo API existente.
7. **PPAP / MSA** — greenfield (não existe no codebase).

---

## Baseline pós-auditoria

```
INC-023
QUALITY_ECOSYSTEM_AUDITED = YES
QUALITY_IMPLEMENTATION_STATUS = DOCUMENTED
READY_FOR_QUALITY_MODULES = YES
```

**Conclusão:** o ecossistema de Qualidade **já existe** em grande escala (domínio enterprise + APIs + runtime cognitivo Z.23). O problema actual é de **completude de integração** no Centro de Comando — placeholders genéricos em vez de módulos cognitivos quality-native promovidos — **não** de roteamento (INC-022) nem de ausência total de código.
