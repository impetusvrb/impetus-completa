# Validação do Governance Dashboard (frontend) — IMPETUS

**Data (UTC):** 2026-05-12T17:40Z  
**Ficheiro principal:** `frontend/src/pages/admin/CognitiveGovernanceDashboard.jsx`  
**API:** `adminCognitiveGovernance` em `frontend/src/services/api.js`

## 1. Objectivo

Garantir que o painel de governança cognitiva:

- Consome `GET /api/admin/learning/dashboard`.
- Renderiza cards sem crash quando `ok: true` e `dashboard` presente.
- Trata correctamente `403` + `DASHBOARD_DISABLED`.
- Inclui cards para policy phases recentes (incl. **Policy Governance Diff** e **Policy Governance Evolution**).

## 2. Verificação estática (código)

| Requisito | Evidência |
|-----------|-----------|
| Fetch do dashboard | `adminCognitiveGovernance.getDashboard()` em `load()` |
| Erro desactivado | ramo `error === 'disabled'` com mensagem `IMPETUS_COGNITIVE_DASHBOARD_ENABLED` |
| Destructuring de `policy_governance_diff` e `policy_governance_evolution` | Presente junto às demais chaves do `dashboard` |
| Cards com métricas e hints ENV | Padrão consistente com outros cards (Policy Sandbox, Simulation, etc.) |
| Estilos | `CognitiveGovernanceDashboard.css` importado |

## 3. Endpoints auxiliares (cliente)

Em `api.js`, métodos `getPolicyGovernanceDiff` e `getPolicyGovernanceEvolution` apontam para:

- `/admin/learning/policy-diff`
- `/admin/learning/policy-evolution`

Úteis para debugging manual com token admin; o card principal usa o agregado do `dashboard`.

## 4. Estados de loading

- Estado inicial `loading: true` com UI de *screen-header* "A carregar…".
- Evita crash antes da primeira resposta.

## 5. Validação runtime com browser

**Não executada neste relatório** (sem sessão autenticada de tenant admin no ambiente de auditoria).

Checklist manual recomendado:

1. Autenticar como admin com acesso a `/admin/...` governança.
2. Confirmar HTTP 200 em `/api/admin/learning/dashboard`.
3. Percorrer cards: Unified Orchestration, Policy Discovery … **Policy Governance Diff**, **Policy Governance Evolution**, Context Integrity, Event Backbone, etc.
4. Com `IMPETUS_POLICY_*` desligados, confirmar mensagens de hint e ausência de crash.

## 6. Regressões visuais (Design System)

- O painel usa classes existentes (`impetus-card`, `screen-header`, `cgov-*`) alinhadas ao DS Industrial 4.0; não foram introduzidos fundos claros nem fontes proibidas nesta verificação estática.

## 7. Conclusão

**Validação estrutural e de contrato API-cliente: OK.**  
**Validação E2E UI:** pendente de sessão real (checklist acima).

---

*Documento para equipa de QA / operações.*
