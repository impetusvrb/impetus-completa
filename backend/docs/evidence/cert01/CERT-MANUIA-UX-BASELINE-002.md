# CERT-MANUIA-UX-BASELINE-002 — Protocolo Oficial de Validação e Regressão Visual

**Data:** 2026-07-01  
**Tipo:** Governança / documentação (sem alteração de interface, comportamento, backend ou funcionalidades)

---

## Entregáveis

| Artefacto | Alteração |
|---|---|
| `frontend/docs/MANUIA_UX_BASELINE.md` | Secção **11 — Testes Obrigatórios de Regressão Visual da ManuIA** |
| `.cursor/rules/manuia-ux-baseline.mdc` | Regra obrigatória de execução do protocolo antes de concluir tarefas |
| Este ficheiro | Evidência inicial da aplicação do protocolo |

---

## Viewports obrigatórios (institucionalizados)

| Cenário | Resolução |
|---|---|
| Mobile pequeno | 360 × 800 |
| Mobile padrão | 390 × 844 |
| Tablet | 768 × 1024 |
| Desktop | ≥ 1366 px |

+ orientações: mobile/tablet retrato e paisagem; desktop largura mínima e ampla.

---

## Evidência inicial — auditoria estática (baseline atual)

**Data da auditoria:** 2026-07-01  
**Rota:** `/app/manutencao/manuia`  
**Alteração de código nesta tarefa:** nenhuma (apenas documentação)

### Estrutura (auditoria de código-fonte)

| Item | Resultado | Evidência |
|---|---|---|
| Ordem oficial preservada | ✅ | `ManuIA.jsx`: header → ActionCenter → KpiStrip → nav → conteúdo |
| Cognitive Core posição Layout | ✅ | `Layout.jsx` L1202 `variant={isManuiaRoute ? 'manuia' : 'default'}` |
| Centro de Ação posição | ✅ | `ManuIA.jsx` L365 após header |
| Runtime compacto | ✅ | `ManuIA.jsx` L373; `ManuiaOperationalKpiStrip` default recolhido mobile |
| Ferramentas abaixo Runtime | ✅ | `ManuIA.jsx` L378 após KpiStrip |
| Conteúdo abaixo ferramentas | ✅ | `activeTab` branches L423+ |
| Atalhos após resultados | ✅ | `isPrimaryTab` block L590+ |

### Navegação (auditoria de código-fonte)

| Item | Resultado | Evidência |
|---|---|---|
| Uma navegação principal | ✅ | `isMobileNav ? manuia-tools-stack : manuia-tabs` (L379–411) |
| Sem componentes duplicados no DOM | ✅ | ramos mutuamente exclusivos (ternário) |
| Sem menus redundantes tipo «Mais» | ✅ | ausente em `ManuIA.jsx` |
| Handlers não duplicados | ✅ | mobile: goSearch/goLive/setActiveTab; desktop: setActiveTab |
| Desktop tabs | ✅ | ramo `else` L397 |
| Mobile stack vertical | ✅ | ramo `if` L380, `MODULE_TABS` ordem fixa |

### Funcionalidade

| Acesso | Handler / componente | Auditoria estática |
|---|---|---|
| Pesquisa | `goSearch`, tile ActionCenter | ✅ presente |
| Assistência ao Vivo | `goLive`, `LiveTechnicalAssistanceModule` | ✅ presente |
| Gestão de Ativos | `AssetManagementModule` | ✅ presente |
| Análise Foto/Vídeo | `TechnicalFieldAnalysisModule` | ✅ presente |
| Gêmeo Digital | `DigitalTwinAppliedModule` | ✅ presente |
| Upload | `goUpload` | ✅ presente |
| Código / QR | `handleQrSearch`, modal ActionCenter | ✅ presente |

**Validação interativa em dispositivo:** pendente por tarefa futura que altere UI; obrigatória conforme secção 11 do baseline.

### Interface e responsividade

| Item | Auditoria estática | Validação visual dispositivo |
|---|---|---|
| Runtime recolhido mobile | ✅ `useMobileCollapsedDefault` + `setExpanded(false)` | Pendente capturas |
| Cognitive compacto | ✅ `cognitiveCompactPresence.css --manuia` | Pendente capturas |
| Centro de Ação 4 tiles | ✅ `ManuiaActionCenter.jsx` | Pendente capturas |
| Overflow horizontal | — | Obrigatório em 360/390/768/≥1366 |
| Scroll inicial reduzido | — | Obrigatório em capturas |

### Checklist executado (esta tarefa)

- [x] Documentação baseline atualizada (secção 11)
- [x] Regra Cursor atualizada
- [x] Evidência inicial criada
- [x] Auditoria estática estrutura + navegação + handlers
- [ ] Capturas 360×800, 390×844 (não aplicável — tarefa sem mudança visual; próxima alteração ManuIA deve anexar)

---

## Resultado

| Critério | Estado |
|---|---|
| Documentação atualizada | ✅ |
| Protocolo incorporado à baseline | ✅ |
| Regra Cursor exige execução | ✅ |
| Evidência inicial | ✅ (este documento) |
| Código ManuIA alterado | ❌ (conforme especificação) |

**Resultado geral da tarefa MANUIA-UX-BASELINE-002:** **APROVADO**

---

## Regressões encontradas

Nenhuma (tarefa exclusivamente documental).

---

## Correções aplicadas

Nenhuma alteração funcional ou visual.

---

## Referência

Protocolo permanente: `frontend/docs/MANUIA_UX_BASELINE.md` — secção 11.
