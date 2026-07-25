# BASELINE_ENVIRONMENT_DASHBOARD_V1

**Incidente origem:** INC-ENVIRONMENT-DASHBOARD-CROSS-PROFILE-CONTAMINATION-009  
**Congelamento:** INC-010 — 2026-07-15  
**Status:** `VALIDATED_IN_REAL_BROWSER`  
**Perfil referência:** Marcos Vinícius Almeida — `coordinator_environmental`

---

## 1. Identidade estrutural esperada

| Campo | Valor canónico |
|---|---|
| `profile_code` | `coordinator_environmental` |
| `functional_area` | `environmental` |
| `eixo_primario` | `eixo_ambiental` |
| `role` | `coordenador` |
| Cargo | Coordenador de Meio Ambiente |
| Setor / departamento | Meio Ambiente |

**Nota:** `structural_profile.eixos` pode incluir eixos secundários (`eixo_manutencao`, `eixo_operacional`, …) derivados de keywords na descrição do cargo. **Isso não autoriza superfície de manutenção.**

---

## 2. Contrato computacional

| Campo runtime (`/dashboard/me`) | Esperado |
|---|---|
| `profile_code` | `coordinator_environmental` |
| `functional_area` | `environmental` |
| `structural_profile.eixo_primario` | `eixo_ambiental` |
| `hasMaintenanceProfileContext` (frontend) | `false` |
| `resolveDashboardSurfaceCapabilities().maintenance` | `false` |
| `resolveDashboardSurfaceCapabilities().environmental` | `true` |
| `maintenanceFromProfile` | `false` |

---

## 3. Roteamento

```
Perfil ambiental primário
  → Dashboard.jsx: hasMaintenanceProfileContext = false
  → CentroComando (NUNCA DashboardMecanico)
  → Menu ambiental via environmentNavigationManifest / publication engine
```

Rotas ambientais canónicas: `/app/environment/operational` (+ views `?view=water|emissions|waste|…`).

---

## 4. Superfície — ALLOW

- Dashboard integrado (`/app`) via **CentroComando** compatível com perfil ambiental
- Métricas / widgets ambientais no grid contextual
- Módulos de menu explicitamente autorizados: Água, ETA/ETE, Emissões, Resíduos, Campo, Inteligência Ambiental, ESG, etc.
- Identidade organizacional ambiental (`StructuralIdentityBanner`)
- Módulos compartilhados autorizados por `visible_modules` / governança (ex.: `operational`, `chat`) — **module access ≠ maintenance surface**

---

## 5. Superfície — DENY (invariantes)

- `DashboardMecanico` como superfície principal
- Textos exclusivos de manutenção:
  - «Painel de manutenção — visão operacional do seu turno»
  - «Minhas Tarefas de Hoje» (variante OS/técnico)
  - «Máquinas em Atenção» (variante manutenção)
- Roteamento para manutenção por **eixo secundário** (`eixos.includes('eixo_manutencao')`)
- Fallback operacional genérico → componentes de `technician_maintenance`

---

## 6. Arquivos protegidos (política de segregação)

| Artefacto | Papel |
|---|---|
| `frontend/src/utils/dashboardSurfaceCapabilities.js` | Política central de superfície (INC-009) |
| `frontend/src/utils/roleUtils.js` | `hasMaintenanceProfileContext` delegado à política |
| `frontend/src/hooks/useVisibleModules.js` | `resolveMaintenanceFromDashboardMe` |
| `frontend/src/tests/dashboard-surface-segregation/` | Testes de regressão tripla |

**Baseline manutenção congelada (não alterar salvo regressão comprovada):**

- `frontend/src/features/dashboard/DashboardMecanico.jsx`
- `frontend/src/features/dashboard/DashboardMecanico.css`

**Qualquer alteração em ficheiros compartilhados exige:**

```
NO_MAINTENANCE_REGRESSION
NO_ENVIRONMENT_REGRESSION
NO_CEO_REGRESSION
```

Comando de teste mínimo:

```bash
cd frontend && npm run test:dashboard-surface-segregation
```

---

## 7. Apresentação global — NÃO congelada

Este baseline congela **segregação funcional e composição de superfície**, não a arquitetura visual final do dashboard integrado.

A camada superior do Impetus Cognitive Core / status cognitivo total permanece em investigação (**INC-010**). Ver `backend/docs/evidence/INC-010-COGNITIVE-LAYER-FORENSIC-AUDIT.md`.

---

## 8. Testes mínimos

| # | Teste | Artefacto |
|---|---|---|
| 1 | environmental primário → maintenance denied | `dashboardSurfaceSegregationScenarios.mjs` |
| 2 | coordinator_environmental → CentroComando | `Dashboard.jsx` + capabilities |
| 3 | maintenanceFromProfile false com eixo secundário | `resolveMaintenanceFromDashboardMe` |
| 4 | Lima technician_maintenance → maintenance allowed | idem |
| 5 | CEO → maintenance denied | idem |
| 6 | Browser: zero textos DashboardMecanico | validação manual 2026-07-15 |

---

## 9. Evidência browser

```
ENVIRONMENT_SURFACE_BROWSER_VALIDATED
MAINTENANCE_CONTAMINATION_REMOVED
user: Marcos Vinícius Almeida (87ee740c-5c45-4185-8ef3-70234195bebf)
```

---

## 10. Política de alteração

```
BASELINE_ENVIRONMENT_DASHBOARD_V1 = FROZEN
ENVIRONMENT_CHANGE_POLICY = PROTECTED
GLOBAL_DASHBOARD_PRESENTATION = NOT_FINAL
CEO_SURFACE_STATUS = PROVISIONAL_STABLE (investigação separada)
MAINTENANCE_BASELINE_STATUS = VALIDATED (FROZEN_PROTECTED)
```
