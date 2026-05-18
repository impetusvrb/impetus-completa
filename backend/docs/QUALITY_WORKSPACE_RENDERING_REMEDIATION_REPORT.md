# QUALITY — Relatório de Remediação de Renderização / Workspaces

**Data:** 2026-05-18  
**Tipo:** Investigação enterprise + correção additive-only  
**Decisão operacional:** **GO** — deploy via `pm2 reload` (sem delete/restart pesado)

---

## 1. Causa raiz real

Combinação de três factores (não um único bug de rota):

| # | Causa | Impacto |
|---|--------|---------|
| 1 | **Fallback operacional por defeito** — `QualityOperationalWorkspace` renderizava `QualityOperationalDiagnostics` + `QualityInspectionRuntime` na rota base `/app/quality/operational`, em vez de um **hub enterprise** (padrão já usado em SAFETY/ENVIRONMENT). | Utilizador via “debug + inspeção mínima” e interpretava como “workspace não montou”. |
| 2 | **Painéis JSON de flags em primeiro plano** nos hubs Governança/Telemetria/Cognitivo (`Flags runtime`, `Estado runtime`) **antes** dos painéis de negócio. | UX parecia “só runtime/debug”, mesmo com APIs e lazy hubs activos. |
| 3 | **Desalinhamento publication vs runtime** (potencial) — menu usa `*_VISIBILITY_*`; workspace usava apenas `*_RUNTIME_*` sem ponte de coexistência. | Em builds com publicação ON e runtime OFF no Vite, vista bloqueada com cartão “runtime desligado”. |
| 4 | **Remount frágil em `?view=`** — mesma rota index sem `key` no page wrapper; em alguns fluxos de navegação lateral o workspace podia não trocar de ramo. | Clique em item com query não actualizava o conteúdo. |

**Não era:** falha do `App.jsx`, remoção do publication pipeline, nem Outlet vazio (Outlet + `QualityOperationalShell` estavam correctos).

---

## 2. Módulos afetados

| Domínio | Afectação | Acção |
|---------|-----------|--------|
| **QUALITY** | Primário | Correcção completa |
| **SAFETY** | Preventiva | `SafetyOperationalWorkspacePage` com `key` pathname+search |
| **LOGISTICS** | Validação | Já usa hub por defeito; sem alteração estrutural |
| **ENVIRONMENT** | Validação | `EnvironmentOperationalViewRouter` + hub — referência mantida |

---

## 3. Impacto operacional

- Menu lateral e publicação **mantidos**.
- Shadow / pilot / rollout **inalterados** (sem auto-promotion).
- Diagnósticos movidos para `?view=diagnostics` (não na rota base).
- Status bar deixa de expor dump `op/off/rt` excepto em modo diagnóstico.

---

## 4. Correções aplicadas (additive-only)

### Resolução centralizada

- `qualityRuntimeModuleBridge.js` — ponte visibility + publication → runtime efectivo; aliases `ncr`/`capa`/`spc` → `governance`, `executive` → `cognitive`.
- `qualityWorkspaceViewResolver.js` — mapa canónico `view` → hub | workspace | diagnostics | disabled.
- `QualityOperationalHub.jsx` — centro operacional por defeito.
- `QualityOperationalWorkspace.jsx` — refactor para resolver + lazy hubs; inspeção só em `?view=inspection` ou `/inspection`.
- `QualityOperationalWorkspacePage.jsx` — `key={pathname+search}` para remount seguro.

### UX enterprise (sem alterar design system)

- `QualityRuntimeSnapshotPanel.jsx` — JSON de flags **colapsável**, não intercepta workspace.
- `QualityGovernanceHub` / `QualityTelemetryHub` / `CognitiveQualityHub` — painéis de negócio primeiro; snapshot colapsável; cognitivo carrega pacote demo ao montar.
- `QualityRealtimeStatusBar` — flags técnicas só com diagnóstico activo.
- `qualityOperationalFeatureFlags` — diagnósticos **não** activados automaticamente por shadow mode.

### Navegação

- Manifest NCR: `?view=ncr` (alias normalizado para governança).

---

## 5. Validações executadas

| Teste | Resultado |
|-------|-----------|
| `npm run test:quality-workspace-resolution` (FE) | ✅ 10/10 |
| `npm run test:quality-navigation-stabilization` | ✅ |
| `npm run test:quality-publication-runtime` (FE+BE) | ✅ |
| `npm run test:enterprise-runtime-validation` (FE+BE) | ✅ 16+14 |
| `npm run build` (frontend) | ✅ chunks `QualityOperationalWorkspace`, `QualityGovernanceHub`, `CognitiveQualityHub`, etc. |
| `pm2 reload impetus-frontend --update-env` | ✅ |
| `pm2 reload impetus-backend --update-env` | ✅ |

---

## 6. Comportamento esperado pós-correcção

| Menu / clique | Resultado |
|---------------|-----------|
| Quality Operacional | Hub com atalhos enterprise |
| Inspeções | `/app/quality/operational/inspection` ou `?view=inspection` |
| NCR & CAPA / SPC | `?view=governance` ou `?view=ncr` → `QualityGovernanceHub` + SPC |
| Telemetria | `?view=telemetry` → hub + demo ingestão |
| Inteligência contextual | `?view=cognitive` → painéis cognitivos auto-carregados |
| Diagnósticos | `?view=diagnostics` (apenas se flag explícita) |

---

## 7. Estratégia rollback-safe

1. Reverter ficheiros em `frontend/src/domains/quality/operational-runtime/` e `navigation/qualityRuntimeModuleBridge.js`.
2. `pm2 reload impetus-frontend` — sem migrations, sem `pm2 delete`.
3. Flags Vite existentes continuam válidas; nenhuma flag nova obrigatória.

---

## 8. Decisão operacional final

**GO para operação shadow/pilot** com workspaces QUALITY renderizando hubs e módulos reais. Recomenda-se smoke manual: login → menu Quality → cada item com `?view=` → confirmar ausência de JSON de flags em ecrã principal.

**Não executado:** `pm2 delete`, restart pesado, alteração `App.jsx`, alteração design system.
