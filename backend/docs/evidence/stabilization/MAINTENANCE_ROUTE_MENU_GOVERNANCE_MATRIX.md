# MAINTENANCE ROUTE × MENU × GOVERNANCE MATRIX — FIX-005

**Data:** 2026-07-13  
**Baseline:** MANUIA_UX_BASELINE.md + Volume-03 ARQUITETURA-POR-CARGO

---

## Rotas Manutenção / ManuIA

| Route | Component | Menu source | Required role | Required capability | Guard | Visible module | Status |
|-------|-----------|-------------|---------------|---------------------|-------|----------------|--------|
| `/app/manutencao/manuia` | `ManuIA.jsx` | MENU_MANUTENCAO_TECNICO ou injeção MENU_MANUTENCAO_MODULOS | Perfil manutenção | `manuia` (perfil) | PrivateRoute + SetupGuard + ColaboradorRouteGuard (técnico) | `manuia` / STANDALONE_MANUIA | **ACTIVE** |
| `/app/manutencao/manuia-app` | `ManuIAExtensionApp` | Idem | Idem | Idem | Idem | Idem | **ACTIVE** |
| `/diagnostic` | `Diagnostic.jsx` | MENU_MANUTENCAO_TECNICO | Técnico manutenção | operational | CEORouteGuard + ColaboradorRouteGuard | operational | **ACTIVE** |
| `/app` (dashboard) | Dashboard contextual | Menu por role | Variável | dashboard | SetupGuard | dashboard | **ACTIVE** |

**Não órfãs.** Não duplicadas. Não legadas.

---

## Mecanismos de menu

| Mecanismo | Uso manutenção |
|-----------|----------------|
| `MENU_MANUTENCAO_TECNICO` | Técnico (`colaborador` + perfil manutenção) |
| `MENU_MANUTENCAO_MODULOS` | Injeção pós-dashboard para liderança manutenção |
| `MENUS[gerente\|supervisor\|coordenador\|diretor]` | Base liderança |
| `filterMenuByModules` | `STANDALONE_MANUIA_PATHS` preserva ManuIA para `isMaint` |
| `maintenanceFromProfile` | `/dashboard/me` profile_code / functional_area / eixo_manutencao |
| `shouldInjectManuiaMenuModules` | **FIX-005** — injeção alinhada a route access |

---

## Perfil × visibilidade (pós FIX-005)

| Perfil | SHOULD_SEE_MAINTENANCE_MENU | CAN_ACCESS_ROUTE | EXPECTED_LANDING | CONTEXTUAL_DASHBOARD |
|--------|----------------------------|------------------|------------------|----------------------|
| `technician_maintenance` | Sim (MENU_MANUTENCAO_TECNICO) | Sim | `/app` → ManuIA no menu | DashboardMecanico |
| `manager_maintenance` | Sim (liderança + ManuIA injetado) | Sim | `/app` | CentroComando / manutenção |
| `supervisor_maintenance` | Sim | Sim | `/app` | Idem |
| `coordinator_maintenance` | Sim | Sim | `/app` | Idem |
| `operator_floor` | Não (sem perfil maint.) | Não ManuIA | `/app` | DashboardOperador |
| `ceo_executive` | Não ManuIA | Negado manuia | `/app` | CentroComando |
| `admin` (portal) | ManuIA suprimido | Suprimido menu | `/app/admin/*` | Admin |

---

## Desalinhamentos corrigidos

| Tipo | Pré-fix | Pós-fix |
|------|---------|---------|
| MENU_VISIBLE=FALSE, ROUTE_ACCESS=TRUE | Liderança maint. sem `manuia` em visible_modules | Injeção por perfil manutenção |
| MENU após reconciliação | ManuIA sumia do sidebar | `shouldInjectManuiaMenuModules` + STANDALONE paths |
| Detecção perfil | Sem eixo estrutural em maintenanceFromProfile | `eixo_manutencao` incluído |

---

## Classificação de rotas auxiliares ManuIA (conteúdo)

| Ferramenta (`activeTab`) | Label baseline | Classificação |
|--------------------------|----------------|---------------|
| `search` | Pesquisa | ACTIVE |
| `vision3d` | Assistência Técnica ao Vivo | ACTIVE |
| `asset-management` | Gestão de Ativos | ACTIVE |
| `field-analysis` | Análise Foto/Vídeo | ACTIVE |
| `digital-twin` | Gêmeo Digital | ACTIVE |
| `technical-library` | Biblioteca técnica (admin desktop) | CONTEXTUAL_ENTRY |

---

*Matriz estática — validação E2E autenticada recomendada em ambiente operacional.*
