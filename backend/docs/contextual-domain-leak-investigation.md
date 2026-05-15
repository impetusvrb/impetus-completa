# Investigação — Domain leak V2 (contextualização / inferência cross-domain)

Data de conclusão da auditoria técnica: 2026-05-10.  
Âmbito: personalização do dashboard vivo, resolução de perfil, inferência de área funcional e texto de resumo cognitivo — **sem** alterações a governance runtime, policy engine, CSI, replay, backbone, semantic search ou migrações.

---

## 1. Causa raiz

O painel unificado (`LiveDashboardUnifiedPanel`) exibia `personalization.profile_label` e `personalization.functional_area_label` produzidos no backend. A cadeia **inferia “operações” por defeito** para liderança (`ceo` / `diretor`) quando não havia sinal explícito de área: `resolveFunctionalArea` devolvia `operations` como fallback; `ROLE_AREA_TO_PROFILE.diretor._default` mapeava para `director_operations` (“Diretor de Operações”); `inferAreaFromFreeText` tratava padrões amplos (ex.: contexto com “diretoria”) como operações; `JOB_TITLE_TO_AREA` continha heurísticas genéricas que empurravam “diretor” para operações. Em paralelo, o **resumo inteligente** e a **orquestração** usavam linguagem e capacidades operacionais para perfis que não eram de domínio operacional (finance, RH, direção não atribuída).

---

## 2. Motor responsável

| Motor | Ficheiro | Papel |
|--------|-----------|--------|
| Resolução de área e perfil de dashboard | `backend/src/services/dashboardProfileResolver.js` | `resolveFunctionalArea`, `resolveDashboardProfile`, `getDashboardConfigForUser`, inferência por departamento/cargo/texto |
| Matriz de perfis e mapeamentos | `backend/src/config/dashboardProfiles.js` | `ROLE_AREA_TO_PROFILE`, `JOB_TITLE_TO_AREA`, perfil `director_unassigned`, labels (`DASHBOARD_PROFILES`) |
| Composição do estado do dashboard vivo | `backend/src/services/liveDashboardService.js` | `buildLiveStateForUser`, `buildIntelligentSummary`, `canOrchestrate`, `personalization.*` |
| KPIs por perfil | `backend/src/services/dashboardKPIs.js` | Ramo para `director_unassigned` alinhado a diretoria sem área fechada |

---

## 3. Payloads afectados

- Resposta agregada do **dashboard vivo** (`buildLiveStateForUser`): especialmente `personalization.profile_code`, `personalization.profile_label`, `personalization.functional_area`, `personalization.functional_area_label`, `intelligent_summary`, `capabilities.task_orchestration`, `orchestration` / `orchestration_stash_key`.
- Qualquer consumidor que reutilize `getDashboardConfigForUser` para decisões de UI (rótulos e área inferida).

---

## 4. Inferências indevidas (antes da correcção)

- Tratar **liderança sem área** como `operations` / `director_operations`.
- **“Diretoria”** em texto livre (departamento) desviar para operações em vez de permanecer neutro ou seguir sinais finance/RH.
- **Cargo genérico “Diretor”** sem qualificação mapear para perfil operacional.
- **Resumo** com “alertas operacionais” para utilizadores finance/RH.
- **Orquestração** activável só pelo código de perfil executivo, ignorando domínio finance/RH ou ausência de área operacional segura.

---

## 5. Contextualização insegura (padrão identificado)

- **Fallback universal operacional** para roles de topo.
- **Enriquecimento implícito** (executivo ⇒ operações) em vez de **deny-by-default** até existir sinal explícito ou override administrativo válido.
- **Copy cognitiva** não filtrada por domínio no resumo em Markdown.

---

## 6. Correcções aplicadas

- Perfil **`director_unassigned`** (“Direção”) com `_default` de `diretor` a apontar para ele em vez de `director_operations`.
- **`resolveFunctionalArea`**: para `ceo` / `diretor` / `gerente` / `coordenador` / `supervisor` sem inferência segura → `null` (não forçar `operations`); remoção do uso de “diretoria” isolado como proxy de operações em `inferAreaFromFreeText`.
- **`resolveDashboardProfile`**: priorizar `dashboard_profile` persistido válido quando a área é `null`/vazia ou quando o contexto cadastral é fraco.
- **`liveDashboardService`**: `functional_area` sem default artificial `production` para labels; `functional_area_label` apenas quando há área conhecida; **`canOrchestrate`** com lista de perfis/áreas não operacionais; **`buildIntelligentSummary`** com ramo **domain-safe** para finance/RH.
- **`JOB_TITLE_TO_AREA` / CFO / finanças**: entradas mais específicas; remoção do mapeamento genérico perigoso para “diretor” → operações.
- **`dashboardKPIs`**: inclusão de `director_unassigned` no conjunto de KPIs de diretoria.

---

## 7. Testes executados

| Comando | Resultado |
|---------|-----------|
| `npm run test:contextual-domain-isolation` | `backend/src/tests/contextualDomainIsolationScenarios.js` — cenários de perfil, área, resumo e orquestração |
| `npm run test:domain-isolation` | Matriz de módulos / identidade contextual (regressão) |
| `npm run test:live-dashboard-contextual` | Camada contextual do motor de dashboard (regressão) |

---

## 8. Validação pós-correcção

- Utilizador **financeiro** recebe `finance_management`, área `finance`, rótulo alinhado a finanças, **sem** “Diretor de Operações” nem “Setor funcional: Operações” por inferência por defeito.
- **Diretor ambíguo** recebe `director_unassigned` / “Direção”, **sem** `functional_area_label` operacional até o cadastro ou override clarificar o domínio.
- **Resumos** para finance/RH **não** contêm a frase “alertas operacionais”; perfis operacionais explícitos mantêm a linguagem operacional.
- **Orquestração** desactivada para `finance_management`, `hr_management`, `director_unassigned` e para área `finance` mesmo com código de perfil ambíguo.

---

## 9. Riscos mitigados

- **Vazamento semântico** de contexto organizacional (rótulos e setor) para utilizadores fora do domínio operacional.
- **Inflação de capacidade** (orquestração operacional) por hierarquia ou título genérico.
- **Confiança indevida** em heurísticas de texto livre (“diretoria”, “executivo”) como proxy de operações.

---

## 10. Estado final

**Contextual domain leakage (V2) eliminado** na camada auditada: inferência de área e perfil, personalização do payload do dashboard vivo, resumo cognitivo domain-safe e gating de orquestração alinhados a **RBAC / isolamento funcional** e a **overrides explícitos**, sem remover personalização legítima para perfis operacionais nem IA operacional onde o domínio é autorizado.
