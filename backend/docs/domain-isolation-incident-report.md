# Relatório — incidente de isolamento por domínio funcional

**Classificação:** Critical authorization leak / cross-domain data exposure (menu, `visible_modules`, Motor B).  
**Data (relatório):** 2026-05-10  
**Estado final:** `domain isolation restored successfully`

---

## 1. Causa raiz

1. **`dashboardAccessService.getAllowedModules`** — a função `withUniversalModules` (agora `withBaselineModules`) unia a **todos** os perfis, após interseção com permissões, as chaves `operational`, `proaction`, `ai`, `chat` e `settings`, independentemente do domínio do perfil. Isto inflava `visible_modules` para utilizadores que o perfil de dashboard não deveria alargar.

2. **`capabilitiesDeriver` (IMPLICIT_BY_FUNCTION_AREA)** — para `decisao_estrategica` + área `finance` eram concedidas implicitamente capabilities de **manutenção** e **RH** (`view:maintenance`, `view:hr`, etc.), alimentando o Motor B e o orquestrador contextual com privilégios cruzados.

3. **`moduleCapabilities.deriveModuleCapabilities`** — o bloco que adicionava automaticamente `view:module:*` para todos os módulos marcados como `universal` no registry fazia **inflação artificial** de capabilities no `capsSet` do orquestrador.

4. **`moduleOrchestrator._isEligible`** — (a) `universal: true` fazia bypass **antes** de validar `required_capabilities`; (b) quando `compatible_areas` estava vazio, o código assumia alinhamento (`aligned = true`), permitindo módulos HR (ex.: Pulse) a utilizadores fora do domínio.

5. **Frontend `useVisibleModules`** — com `visible_modules` vazio, o menu e `canAccessPath` tratavam como **acesso total**; itens `_contextual` e rotas sem mapeamento em `PATH_TO_MODULE` eram demasiado permissivos.

---

## 2. Módulos afectados

- Chaves de menu: `operational`, `proaction`, `ai`, `chat`, `manuia`, `hr_intelligence`, `pulse_rh` (via `menu_key` `operational`), módulos contextualizados derivados do registry Phase 6.

---

## 3. Perfis afectados

- Diretoria e liderança com áreas distintas (financeiro vs manutenção vs operacional vs RH) quando `IMPETUS_CONTEXTUAL_MODULES` em `enrich`/`replace` ou quando permissões JWT estavam vazias (ramo de compatibilidade de liderança).
- Qualquer perfil sujeito à união universal no Motor A.

---

## 4. Endpoints afectados

- **`GET /dashboard/me`** — campo `visible_modules` e, com flags activas, `contextual_modules` / `contextual_modules_meta`.
- Consumidores downstream: composição de dashboard, contexto de voz, serviços que chamam `getAllowedModules`.

---

## 5. Origem do vazamento

- **Principal:** Motor A (`dashboardAccessService`) + derivação de capabilities (`capabilitiesDeriver`) + orquestrador (`moduleOrchestrator` / `moduleCapabilities` / registry `pulse_rh`).
- **Secundário (agravante):** frontend com fallbacks permissivos quando a lista de módulos estava vazia ou contextual.

---

## 6. Correcções aplicadas

| Área | Ficheiro | Alteração |
|------|-----------|-----------|
| Motor A | `backend/src/services/dashboardAccessService.js` | Baseline apenas `dashboard`; wildcard `*` também para `internal_admin`; fim da união universal agressiva. |
| Capabilities | `backend/src/dashboardEngineV2/axes/capabilitiesDeriver.js` | Matriz `finance` sem caps de manutenção/RH; área `hr` com `view:operational` onde necessário ao menu; `internal_admin` com superset como CEO/admin. |
| Phase 6 | `backend/src/contextualModules/moduleCapabilities.js` | Remoção da injecção automática por `universal`; regra finance sem `manuia` / `hr_intelligence`. |
| Phase 6 | `backend/src/contextualModules/moduleOrchestrator.js` | `_isEligible`: ordem capabilities → universal; alinhamento sem “área vazia = tudo permitido”. |
| Registry | `backend/src/contextualModules/moduleRegistry.js` | `pulse_rh` com `view:hr` + `compatible_areas: ['hr']`; remoção de `universal` indevido em `ai`/`operational`/`proaction`; correcção de export duplicado. |
| Frontend | `frontend/src/hooks/useVisibleModules.js` | Deny-by-default com lista vazia; rotas não mapeadas negadas (excepto admin estrito); contextual e standalone operacionais condicionados a `visible_modules` / regras RH/liderança. |
| Referência | `backend/src/security/domainAccessMatrix.js` | Matriz declarativa para testes e documentação. |

---

## 7. Testes executados

- `npm run test:contextual-modules` — 265 cenários Phase 6 (actualizados para a nova política de segregação).
- `npm run test:domain-isolation` — `backend/src/tests/domainIsolationScenarios.js` (Motor A, capabilities, orquestrador, enrich, matriz, RH).

---

## 8. Validação pós-correcção

- CFO em `enrich`: `visible_modules` **sem** `manuia` nem `hr_intelligence`; mantém extensões alinhadas (ex.: `anomaly_detection`, `audit` quando elegíveis).
- Identidade financeira **sem** `view:maintenance` implícito; identidade de manutenção **sem** `view:financial` implícito.
- RH em função `analise` continua com `view:operational` para suportar chave de menu `operational` legítima.

---

## 9. Riscos mitigados

- Vazamento de menus e rotas entre diretorias.
- Inflação de capabilities no Motor B por universais e regras financeiras demasiado largas.
- Falso “acesso total” no cliente quando `visible_modules` estava vazio ou incompleto.

---

## 10. Estado final

**Isolamento por domínio restaurado:** Motor A como limite mínimo de módulos, capabilities alinhadas à área, orquestrador sem bypass inseguro de `universal`, frontend em deny-by-default alinhado ao contrato do servidor.

**Não alterado (conforme pedido):** prompts IA, governance runtime, council, CSI, drift, calibration, event backbone, replay.
