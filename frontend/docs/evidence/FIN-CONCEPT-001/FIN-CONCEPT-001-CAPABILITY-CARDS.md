# FIN-CONCEPT-001 — Capability Cards

Fichas resumidas. Detalhe programático: `finConcept001AssessmentCatalog.js`.

---

## 1. Smart Costing (Custo Unitário Dinâmico)

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Custo unitário dinâmico por produto/linha/evento |
| **Valor** | Margem e pricing operacional sem ERP contábil |
| **Existe / Parcial** | Parcial — `industrialCostService` + impact + by-origin |
| **Reutiliza** | industrialCost*, unifiedCostControl, CentroCustosExecutivo, `/costs/*` |
| **Inexistente** | ABC multi-driver, standard vs actual, SKU unit cost, BOM rollup |
| **Impacto Baseline** | Baixo |
| **OPM/CPL/EOX** | Eventos OPM como drivers; EOX Finance; contratos CPL aditivos |
| **Prioridade** | P1 |
| **Recomendação** | Evoluir cost services — **não** engine paralelo |

---

## 2. Manutenção Preditiva Financeira

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | PdM → impacto $ (parada, ROI preventivo) |
| **Valor** | Priorizar OS/CAPEX manutenção pelo $ evitado |
| **Existe / Parcial** | Parcial — ManuIA, Twin, forecasting, cost impact, economic proxies |
| **Reutiliza** | digitalTwin*, ManuIA, operationalForecasting, industrialCostImpact, economic engines |
| **Inexistente** | ROI preventivo estruturado, WO cost model, deep-link Twin→Finance |
| **Impacto Baseline** | Médio (maintenance domain = greenfield no ARCH-PLAN) |
| **Prioridade** | P1 |
| **Recomendação** | Composição Twin/ManuIA + custos — **não** simulador PdM-$ novo |

---

## 3. Planejamento de Cenários (What-if)

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Cenários $ operacionais sem side-effects |
| **Valor** | Decisão executiva com hipóteses controladas |
| **Existe / Parcial** | Parcial — CPL ScenarioProvider, OPM-008 what-if, CentroPrevisão, AIOI scenarios |
| **Reutiliza** | CPL, OPM-008, forecasting, Digital Twin state, AIOI scenario* |
| **Inexistente** | Motor what-if financeiro (budget/cashflow/margem), UI Finance |
| **Prioridade** | P1 |
| **Recomendação** | Estender ScenarioProvider + forecasting — base do Financial Digital Twin |

---

## 4. Otimização Financeira de Estoque

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Inventário por carrying cost / capital / ruptura $ |
| **Valor** | Capital de giro + risco de stockout monetizado |
| **Existe / Parcial** | Parcial — WMS inventory qty; Supply budget; recommendations |
| **Reutiliza** | logistics-operational/inventory, BudgetReference, AIOI recommendations, leakage patterns |
| **Inexistente** | Valuation, carrying cost, EOQ financeiro |
| **Impacto Baseline** | Médio — WMS é `maintenance_only`; só adapters |
| **Prioridade** | P2 |
| **Recomendação** | Adapter Finance↔WMS — **não** tocar inventário certificado |

---

## 5. Dashboards por papel

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | KPIs financeiros por role/profile |
| **Existe / Parcial** | Parcial — dashboardProfiles, finance_management, CC, hub 001A |
| **Reutiliza** | Profiles, Centro Comando, ExecutiveDashboard, metadata Finance |
| **Inexistente** | KPI pack formal CEO vs CFO |
| **Prioridade** | **P0** |
| **Classe** | **Reutilização imediata** |
| **Recomendação** | Curadoria + deep-links — zero engine |

---

## 6. Análise em linguagem natural

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Perguntas NL sobre custos/leakage/projeções |
| **Existe / Parcial** | Parcial — chat, ANAM, smartPanel |
| **Reutiliza** | chat, anam, smartPanelCommandService, financePublicContracts |
| **Inexistente** | Intent pack Finance, tool-calling em contratos, guardrails VIEW_FINANCIAL |
| **Prioridade** | P2 |
| **Recomendação** | Grounding no chat/panel existente |

---

## 7. Alertas financeiros inteligentes

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Alertas custo/leakage/impacto + recomendações |
| **Existe / Parcial** | Parcial — leakage alerts, forecasting alerts, recommendations |
| **Reutiliza** | financial-leakage/*, forecasting alerts, AIOI recommendations, widgets CC |
| **Inexistente** | Taxonomia unificada, policy UI, correlação cross-domain |
| **Prioridade** | **P0** |
| **Classe** | **Reutilização imediata** |
| **Recomendação** | Superfície unificada no hub Finance |

---

## 8. Indicadores financeiros executivos

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | KPIs executivos de custo, perda, pressão económica, billing |
| **Existe / Parcial** | Parcial — costs, leakage, economic engines, ImpetusChart |
| **Inexistente** | Dicionário KPI formal; margem/EBITDA contábil; multi-planta |
| **Prioridade** | **P0** |
| **Classe** | **Reutilização imediata** |
| **Recomendação** | Curar no workspace Finance com dados reais |

---

## 9. Gestão de investimentos (CAPEX/OPEX)

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Portfolio CAPEX/OPEX + ROI |
| **Existe / Parcial** | **Ausente** (só limite CAPEX vestigial no Supply) |
| **Novo módulo** | **Sim** |
| **Prioridade** | P3 |
| **Estratégia** | greenfield (Fase C finance_native) |
| **Recomendação** | **Adiar** (backlog FIN-PLAN-001) + evidência pós-STAB |

---

## 10. Performance económica

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Score/índice de performance económica operacional |
| **Existe / Parcial** | Parcial — economicPressureIndex + operationalEconomicImpact |
| **Reutiliza** | Engines económicos + costs/leakage/forecasting |
| **Prioridade** | P1 |
| **Recomendação** | Expor no domínio Finance — compose |

---

## 11. Consolidação gerencial

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Consolidação multi-centro/multi-planta |
| **Existe / Parcial** | **Ausente** |
| **Novo módulo** | **Sim** |
| **Prioridade** | P3 |
| **Recomendação** | Fora de escopo próximo (ERP-class) |

---

## 12. Financial Digital Twin (oportunidade estratégica)

| Campo | Conteúdo |
|-------|----------|
| **Objetivo** | Twin existente + projeções/impacto financeiro |
| **Valor** | **very_high** — diferencial; alinhado integrate_then_develop |
| **Existe / Parcial** | Parcial — twin operacional + custos + leakage + forecast + CPL |
| **Reutiliza** | digitalTwin*, Applied, org twin, DigitalTwinPanel, costs, leakage, forecasting, ScenarioProvider |
| **Inexistente** | Camada de projecção $, map máquina→cost driver, vista EOX, overlay what-if $ |
| **Prioridade** | **P1** |
| **Recomendação** | **Prioridade estratégica** — estender twin; proibido simulador paralelo |

Ver também: `FIN-CONCEPT-001-DIGITAL-TWIN-OPPORTUNITY.md`
