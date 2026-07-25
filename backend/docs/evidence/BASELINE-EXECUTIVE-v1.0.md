# BASELINE — Executivo v1.0

**INC:** INC-025  
**Data homologação:** 2026-07-15  
**Estado:** `EXECUTIVE_BASELINE_LOCKED = YES` (com pendências documentadas)

---

## Eixo

| Campo | Valor |
|-------|-------|
| **PRIMARY_AXIS** | `eixo_executivo` |
| **FUNCTIONAL_AREA** | `executive`, `operations`, `finance` (multi-domínio) |
| **DEPARTMENT** | Direção / C-level |

---

## Perfis homologados

| PROFILE_CODE | DASHBOARD_PROFILE | DASHBOARD_SURFACE | SPECIALIZED_RUNTIME |
|--------------|-------------------|-------------------|---------------------|
| `ceo_executive` | CEO / Executivo | CentroComando | `executive_boardroom` (Z27) |
| `director_operations` | Diretor de Operações | CentroComando | `executive_boardroom` (parcial) |
| `director_unassigned` | Direção genérica | CentroComando | fallback genérico |
| `director_industrial` | Diretor Industrial | CentroComando | `executive_boardroom` + `production_native` |
| `director_hr` | Diretor RH | CentroComando | `hr_native` (Z26) |
| `director_safety` | Diretor SST | CentroComando | `safety_native` (Z25) |
| `director_financial` | Diretor Financeiro | CentroComando | none |
| `admin_system` | Admin sistema | Redirect `/app/chatbot` | N/A |

---

## Cadeia arquitectural

```
Perfil (ROLE_AREA_TO_PROFILE / structural_profile)
  → dashboardProfileResolver.getProfile()
  → /dashboard/me → cognitiveRuntimeFacade (Z27 executive_boardroom)
  → dashboardContextAdapter._buildFromExecutiveCockpit (prioridade 1)
  → CentroComando (widgets AIOI + executivos)
```

---

## Runtime

| Gate | Valor |
|------|-------|
| **runtime_ready** | YES — `backend/.../executiveCockpitConsolidator.js`, Z27 flags |
| **runtime_promoted** | PARTIAL — adapter consolida widgets; sem hub promotion dedicado no CC |
| **consolidation_applied** | Condicional — `IMPETUS_EXECUTIVE_BOARDROOM=on` |
| **widgets_promoted** | YES quando Z27 passa |
| **native_runtime** | `executive_boardroom` |

**Env produção:** `IMPETUS_EXECUTIVE_BOARDROOM=on`, `IMPETUS_EXECUTIVE_RENDER_PROMOTION=on`

---

## Visible modules (canónico)

`dashboard`, `operational`, `proaction`, `chat`, `biblioteca`, `ai`, `hr_intelligence`, `anomaly_detection`, `audit`, `settings`

---

## Widgets Centro de Comando

`aioi_queue`, `aioi_runtime`, `aioi_governance`, `aioi_scale`, `indicadores_executivos`, `resumo_executivo`, `grafico_producao_demanda`, `grafico_custos_setor`, `centro_custos`, `performance`, `centro_previsao`, `diagrama_industrial`

---

## Segregação

| Campo | Valor |
|-------|-------|
| **FOREIGN_MODULES** | `manuia`, `quality_intelligence`, `environment_intelligence` — bloqueados por eixo salvo bypass |
| **PLACEHOLDERS** | Widgets genéricos KPI/resumo quando Z27 off |
| **CROSS_SURFACE_CONTAMINATION** | **LOW** — executivo nunca vai para DashboardMecanico (`isExecutiveSurface` fail-closed) |

---

## Pendências homologadas (não bloqueiam lock v1.0)

| ID | Tipo | Descrição |
|----|------|-----------|
| P-EXEC-001 | Resolver | `diretor` + `quality/maintenance/environmental/lab` → `director_industrial` (colapso multi-domínio) |
| P-EXEC-002 | Layout | `LayoutPorCargo`: qualquer `diretor` recebe layout industrial fixo |
| P-EXEC-003 | RBAC | CEO/diretor bypass filtro estrutural de módulos (`structuralModuleResolver._shouldBypassFilter`) |
| P-EXEC-004 | Promoção | Sem `ExecutiveNativeCockpitPromotion` equivalente a INC-024 quality |

---

## Gates baseline

```
EXECUTIVE_PROFILE_OK    = YES
EXECUTIVE_SURFACE_OK    = YES
EXECUTIVE_RUNTIME_OK    = PARTIAL (backend YES, frontend hub promotion NO)
EXECUTIVE_MODULES_OK    = PARTIAL (bypass diretor documentado)
EXECUTIVE_BASELINE_LOCKED = YES
```

---

## Dependências

- INC-014 → INC-021 (Baseline UI v1.0)
- Z27 executive boardroom runtime
- `dashboardContextAdapter` prioridade executivo

## Itens futuros (fora v1.0)

- Promoção frontend de centers executivos (padrão INC-024)
- Desagregação `director_industrial` por domínio real
