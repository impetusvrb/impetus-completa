# Auditoria Enterprise — Visibilidade do Dashboard por Nível vs. Governança Contextual / IA

**Data:** 2026-05-19  
**Modo:** investigação read-only (código + documentação interna; sem alteração de runtime)  
**Questão central:** manter, expandir, simplificar, transformar em override, ou remover o mecanismo administrativo de “Visibilidade do Dashboard por Nível” em favor de inferência exclusiva por IA?

---

## [DECISÃO FINAL]

### **C) EVOLUIR PARA MODELO HÍBRIDO** — com convergência planeada para **E) POLICY ENGINE unificado**

| Opção avaliada | Verdict |
|---|---|
| A) Remover completamente | **Rejeitada** — risco operacional, normativo e de bypass cognitivo inaceitável |
| B) Manter como está | **Rejeitada** — mecanismo fragmentado, rota ausente, bypass no chat |
| C) Modelo híbrido | **Recomendada** |
| D) Expandir para todo o software | **Prematura** — exige policy engine e context budget primeiro |
| E) Policy engine | **Alvo de médio prazo** — `dashboardPolicyEngine` já existe parcialmente |
| F) Apenas fallback | **Insuficiente** — enterprise exige controlo explícito auditável |
| G) Outro | **Sub-variante de C:** “IA propõe, policy decide, admin override” |

**Síntese:** A IA **não** pode ser a autoridade final única da exposição cognitiva. O mecanismo explícito **não** deve ser removido, mas **não** pode permanecer como está: precisa unificar-se com domain authority, policy engine, guards de chat e hierarquia de dados.

---

## 1. [CRÍTICO] — Evidências que mudam a decisão

### 1.1 Rota `/dashboard/visibility` ausente — fail-open no frontend

- O frontend chama `GET /api/dashboard/visibility` (`frontend/src/services/api.js`).
- **Não existe** `router.get('/visibility')` em `backend/src/routes/dashboard.js` (inventário completo de rotas `router.get` confirmado).
- `useDashboardVisibility.js` em erro faz `setSections(ALL_TRUE)` — **todas as seções ligadas**.

```javascript
// frontend/src/hooks/useDashboardVisibility.js — fallback em falha
.catch(() => {
  if (isMountedRef.current) setSections(ALL_TRUE);
})
```

- `DashboardInteligente.jsx` usa `sections` **apenas** de `useDashboardVisibility`, **ignorando** `dashboardPayload.sections` de `/dashboard/me` (onde a governança DB é aplicada).

**Impacto:** a configuração administrativa em `CompanyAdminSettings` pode **não surtir efeito** no Dashboard Inteligente principal, dependendo do comportamento HTTP do cliente.

**Severidade:** CRÍTICO (governança aparente vs. efetiva).

### 1.2 Bypass cognitivo indireto via chat

- `POST /dashboard/chat` injeta `retrieveContextualData({ intent: 'operational_overview' })` **sem** consultar `dashboardVisibility.getVisibilityForUser`.
- `secureContextBuilder` filtra por `VIEW_FINANCIAL`, `VIEW_HR`, `VIEW_STRATEGIC` — **não** por seções de visibilidade (`kpi_request`, `plc_alerts`, etc.).
- `dataRetrievalService` **não** referencia `hierarchy_level` nem `sections`.

**Resposta ao exemplo obrigatório:**  
Se um supervisor tiver `kpi_request: false` e `plc_alerts: false` na UI, **ainda pode** obter eficiência de linha, KPIs e alertas via:
- chat (`operational_overview`);
- `GET /dashboard/kpis` (filtrado por perfil + `getAllowedKpis`, não por sections);
- `GET /dashboard/smart-summary` (perfil + empresa, sem sections);
- live dashboard (`/api/live-dashboard/state`) — governado por `canOrchestrate` + domain-safe copy, não por sections.

**Severidade:** CRÍTICO (least privilege quebrado entre UI e canais cognitivos).

### 1.3 Autoridade final é **plural**, não única

Não existe um único “dono” da exposição. A cadeia real é:

| Camada | Autoridade sobre | Ficheiro(s) |
|---|---|---|
| Perfil + área | Módulos base, widgets de perfil, KPIs por perfil | `dashboardProfileResolver.js`, `dashboardProfiles.js` |
| Domain Authority | `visible_modules` governados, pipelines, AI contexts | `domainAuthorityResolver.js`, `domainIsolationGuard.js` |
| Module inheritance | Herança / bloqueio de módulos | `moduleInheritanceGuard.js` |
| RBAC / permissions | Módulos, KPIs sensíveis, profundidade IA | `dashboardAccessService.js` |
| Hierarquia de dados | Scope SQL (comunicações, etc.) | `hierarchicalFilter.js` |
| Visibilidade por nível | Flags de **seção UI** (níveis 2–5) | `dashboardVisibility.js` |
| Policy engine (V2) | Widgets allow/deny por identidade | `dashboardPolicyEngine.js`, `policyCatalog.js` |
| Contextual modules | Enriquecimento / replace de módulos (flagged) | `contextualModules/index.js` |
| Publication guards | Menu ambiental vs SST | `ehsPublicationGuard.js` |
| Chat / IA | Context pack + egress + narrativa | `dataRetrievalService`, `secureContextBuilder`, `aiEgressGuardService`, `forbiddenNarrativeAuditor` |
| Pipeline authority | Routing cognitivo (default **shadow**) | `eventPipelineAuthorityService.js` |

**Conclusão:** remover só `dashboardVisibility` **não** centraliza decisão na IA — apenas remove uma camada fraca e deixa as outras inconsistentes.

---

## 2. [CRÍTICO] — Auditoria de governança contextual (cadeia completa)

### 2.1 Como o dashboard decide o que exibir

```
JWT → requireAuth
  → dashboardProfileResolver.getDashboardConfigForUser(user)
       → functionalAxisResolver / semanticDomainResolver (se IMPETUS_DOMAIN_AUTHORITY)
       → applyGovernanceToDashboardConfig (domainIsolation + moduleInheritance)
  → dashboardAccessService.getAllowedModules(user)
  → hierarchicalFilter.resolveHierarchyScope(user)
  → dashboardVisibility.getVisibilityForUser(hierarchyLevel, companyId)  ← só em /dashboard/me
  → dashboardKPIs + composer + contextualModules (flag) + engine V2 (flag)
  → resposta /dashboard/me { sections, visible_modules, kpis, ... }

Frontend:
  → useVisibleModules (menu) — backend canónico
  → useDashboardVisibility → GET /visibility (AUSENTE) → fail-open
  → DashboardInteligente → gates UI por sections do hook (não por /me)
  → LiveDashboardUnifiedPanel → personalization do liveDashboardService
```

### 2.2 Como a IA escolhe insights / módulos / resumos

| Canal | Seleção contextual | Usa visibility sections? |
|---|---|---|
| Live dashboard summary | `buildIntelligentSummary` + `domainSafeAlerts` | Não |
| Smart summary | `smartSummary.buildSmartSummary` + perfil | Não |
| Insights route | `personalizedInsightsService` | Não |
| Dashboard chat | `retrieveContextualData` + orchestrator/council | Não |
| Contextual modules | `moduleOrchestrator` + registry | Não (usa identity/axis) |
| Engine V2 assistente | `compositionEngine` + policies | Parcial (widgets policy) |

### 2.3 Mecanismo “Visibilidade por Nível” — comportamento real

```javascript
// backend/src/services/dashboardVisibility.js
// CEO (0) e Diretor (1): DEFAULT_SECTIONS completas — sem config admin
// Níveis 2–5: merge DB dashboard_visibility_config
// Sem linha DB: DEFAULT_SECTIONS (maioria true)
```

**Secções controladas:** `operational_interactions`, `ai_insights`, `monitored_points`, `proposals`, `trend_chart`, `points_chart`, `insights_list`, `recent_interactions`, `smart_summary`, `plc_alerts`, `kpi_request`, `communication_panel`.

**Admin UI:** `CompanyAdminSettings.jsx` → `PUT /api/admin/settings/dashboard-visibility/:level`.

**Limitação estrutural:** governa **blocos de UI**, não **dados** nem **chat**.

---

## 3. [ALTO] — Auditoria de risco operacional

| Risco | Severidade | Evidência | Mitigação recomendada |
|---|---|---|---|
| Remover governança explícita | CRÍTICO | Bypass chat; enterprise exige controlo auditável | Manter camada explícita unificada |
| IA 100% autônoma na exposição | CRÍTICO | V1/V2 leaks corrigidos mas residuais; council path parcial | Híbrido: IA dentro de policy envelope |
| Vazamento cross-domain | ALTO | Histórico `contextual-domain-leak-investigation.md`; testes 208 passed | Manter domain authority + não regredir |
| Inferência incorreta de área | ALTO | `inferAreaFromFreeText` heurístico; `director_unassigned` mitigado | Override admin + cadastro forte |
| Bypass cognitivo indireto | CRÍTICO | Chat ≠ sections | Unificar `ContentExposurePolicy` em todos os canais |
| Privilégio cognitivo excessivo | ALTO | `getIADataDepth` por hierarchy; não por section | Ligar depth a policy + sections |
| Descoberta indireta | MÉDIO | Pergunta natural no chat | Intent classifier + deny list por role |
| Fail-open frontend visibility | CRÍTICO | Rota ausente + ALL_TRUE | Implementar rota ou usar só `/me.sections` |
| CEO/Diretor ignoram config 2–5 | INFO | By design | Documentar; ABAC por área se necessário |

### 3.1 Matriz “ocultou módulo, IA revela?”

| Superfície | Ocultar KPI/eficiência na UI impede IA? |
|---|---|
| Dashboard Inteligente (sections) | **Não** (se hook fail-open; dados ainda em /kpis) |
| Menu / módulo | **Parcial** (domain authority + modules) |
| Chat | **Não** (operational_overview) |
| Smart summary | **Não** |
| Live dashboard | **Parcial** (copy domain-safe, mas KPIs no payload) |
| Voice / panel command | **Parcial** (rate limit + permissions) |

---

## 4. [ALTO] — Auditoria ISO/IEC 42001:2023

> **Nota metodológica:** a norma completa é paga; a análise abaixo baseia-se na estrutura oficial (Cláusulas 4–10 + Anexo A, 38 controlos) e mapeamentos públicos auditados (ex.: ISMS.online, Mindset Cyber, Sprinto). **Não substitui consulta ao texto normativo integral.**

### 4.1 A ISO exige UI manual de visibilidade?

**Não.** A ISO/IEC 42001:2023 **não exige** um painel administrativo com checkboxes por nível hierárquico.

### 4.2 O que a ISO exige / recomenda (implicações práticas)

| Referência | Requisito / intenção | Implicação para o Impetus |
|---|---|---|
| **Cláusula 6** (Planeamento) | Avaliação de riscos e impactos de IA, objetivos | Exposição cognitiva deve ser **planeada**, não emergente |
| **Cláusula 8** (Operação) | Desenvolvimento, implantação, monitorização, resposta a incidentes | Controles de operação em produção, incluindo limites de uso |
| **Cláusula 9** (Avaliação de desempenho) | Monitorizar desempenho, viés, conformidade ética | Métricas de divergência contextual (já parcial em Engine V2) |
| **Anexo A — A.3.2** | Papéis e responsabilidades explícitos (oversight, data quality, etc.) | Admin/auditor deve poder **definir e provar** quem vê o quê |
| **Anexo A — A.5.3** | Registos de impact assessment (uso pretendido, oversight humano) | Traçabilidade de decisões de exposição |
| **Anexo A — A.6.1.3** | Processos de design com **human oversight** embutido | Oversight não pode ser só “confiar na IA” |
| **Anexo A — A.8.2** | Documentação para utilizadores (limites, falhas, opções de oversight) | UX deve refletir limites reais (não só ocultar botões) |
| **Anexo A — A.9.2** | Processos de uso responsável (oversight, escalation, pause/stop) | Override administrativo + kill switch alinhados |
| **Anexo A — A.9.3** | Objetivos de uso responsável (HITL, fairness) | Métricas e políticas mensuráveis |
| **Anexo A — A.9.4** | **Uso pretendido** — evitar scope creep sem reavaliação | Inferência automática que expande escopo = risco de não conformidade |

### 4.3 Respostas explícitas

| Pergunta | Resposta |
|---|---|
| Exige mecanismo explícito? | Exige **governança explícita e demonstrável** — não necessariamente este UI |
| Recomenda? | **Sim** — oversight humano proporcional ao risco |
| Aceita IA autônoma? | Apenas para **baixo impacto** com evidência; industrial enterprise = híbrido |
| Aceita modelo híbrido? | **Sim — é o modelo esperado** (HITL / HOTL conforme risco) |
| Aceita inferência sem override admin? | **Não como único controlo** em sistemas de alto impacto operacional |

**Conclusão normativa:** remover o mecanismo **não viola** a ISO por si; manter **governança determinística auditável** **facilita** conformidade. Confiar 100% na IA **dificulta** A.6.1.3, A.9.2, A.9.3, A.9.4.

---

## 5. [ALTO] — Auditoria de maturidade da IA contextual

### 5.1 Evidências positivas (maturidade parcial real)

| Evidência | Fonte |
|---|---|
| 74 testes dashboard governance | `dashboard-governance-audit.md` |
| 22 testes isolamento contextual | `final-contextual-governance-runtime-validation.md` |
| 112 testes live dashboard contextual | idem |
| Correções V1/V2 domain leak | `contextual-domain-leak-investigation.md` |
| `canOrchestrate` deny-by-default | `liveDashboardService.js` |
| Domain authority + isolation guards | `domainAuthorityResolver.js` |
| Hardening multi-tenant recente | `ENTERPRISE_HARDENING_REMEDIATION_REPORT.md` |

### 5.2 Limitações que impedem “100% sem erro contextual”

| Limitação | Por quê |
|---|---|
| Heurísticas de texto (`inferAreaFromFreeText`) | Ambiguidade estrutural (“diretoria”, cargos genéricos) |
| Múltiplos entrypoints cognitivos | `dashboard/chat` GPT vs Conselho vs unified engine — políticas não uniformes |
| Bifurcação de fluxo | Conselho pode contornar auditor global em alguns caminhos (estado documentado em auditorias prévias) |
| Context pack sem visibility | `operational_overview` amplo |
| Métricas/observabilidade em memória | Dificulta prova contínua em produção |
| DEFAULT_SECTIONS permissivo | Sem config DB = quase tudo visível |
| Frontend fail-open | Rota `/visibility` ausente |

### 5.3 Resposta direta

> **Hoje existe condição REAL de garantir “100% sem erro contextual”?**  
> **NÃO.**

**Risco de remover governança explícita:** aumenta dependência das camadas **menos determinísticas** (IA + inferência) precisely onde os testes mostram que o sistema **já falhou no passado** (domain leak V2).

---

## 6. [MÉDIO] — Mercado / UX / Enterprise

| Critério | Avaliação |
|---|---|
| Governança explícita para enterprise | **Desejável / obrigatória** em compras formais (compliance, auditoria interna, sindicatos, ISO) |
| IA totalmente autônoma | **Rejeitada** em RFPs industriais — “caixa preta” |
| IA governada + override | **Padrão de mercado** (SAP, Siemens, Azure AI, Databricks — human oversight + policy) |
| Sensação de controle | Admin precisa ver **o que cada nível vê** — checkboxes atendem isso |
| Multi-tenant | Cada empresa com políticas diferentes — override por tenant essencial |
| Explicabilidade | Enterprise paga por **“porque vi isto?”** — policy audit trail > inferência opaca |

**Veredito comercial:** modelo híbrido é **vantagem competitiva**, não débito.

---

## 7. [MÉDIO] — Casos reais / imagens

**Nota:** nesta sessão **não foram anexados** screenshots dos painéis. A análise baseia-se em:

- `dashboard-governance-audit.md` (matriz 7 perfis)
- `contextual-domain-leak-investigation.md` (casos finance/RH/diretor ambíguo)
- `final-contextual-governance-runtime-validation.md` (pós-correção)

### 7.1 Padrões observados nos casos documentados

| Caso | Correto após fix? | Falha raiz original |
|---|---|---|
| CFO vê “Diretor de Operações” | Corrigido | `dashboardProfileResolver` + fallback operacional |
| RH com “alertas operacionais” | Corrigido | `buildIntelligentSummary` sem domain-safe |
| Diretor sem área → operações | Corrigido | `director_unassigned` + fallback `operations` |
| Admin tenant com módulos operacionais | Suprimido via portal scope | `tenantAdminPortalScope` |

### 7.2 Poluição / ruído cognitivo residual

| Achado | Severidade | Origem provável |
|---|---|---|
| CEO vê `plc_alerts` mesmo sendo executivo | MÉDIO | `DEFAULT_SECTIONS` + hierarchy ≤1 bypass |
| Smart summary sem filtro domain-safe completo | MÉDIO | `smartSummary.js` (recomendação prévia no governance audit) |
| Config admin possivelmente ineficaz no Dashboard Inteligente | CRÍTICO | Rota `/visibility` + hook fail-open |

---

## 8. [RECOMENDAÇÃO] — Modelo alvo (híbrido)

### 8.1 Princípio: “Determinístico define o envelope; IA opera dentro”

```
┌─────────────────────────────────────────────────────────┐
│  CAMADA 1 — Policy determinística (autoridade final)     │
│  RBAC + ABAC + domain authority + visibility + hierarchy │
│  + dashboardPolicyEngine (widgets)                       │
└───────────────────────────┬─────────────────────────────┘
                            │ envelope permitido
┌───────────────────────────▼─────────────────────────────┐
│  CAMADA 2 — Inferência contextual (IA / resolvers)       │
│  semantic axis, contextual modules, personalização       │
│  NUNCA expande além do envelope                          │
└───────────────────────────┬─────────────────────────────┘
                            │ conteúdo dentro do envelope
┌───────────────────────────▼─────────────────────────────┐
│  CAMADA 3 — Apresentação adaptativa (UX)                 │
│  ordem, ênfase, linguagem — sem novos dados sensíveis    │
└─────────────────────────────────────────────────────────┘
```

### 8.2 Ações recomendadas (planeamento — não implementadas nesta auditoria)

| Prioridade | Ação |
|---|---|
| P0 | Unificar fonte de `sections`: `/dashboard/me` ou implementar `GET /dashboard/visibility` |
| P0 | Eliminar fail-open `ALL_TRUE` — fail-closed com sections mínimas seguras |
| P0 | Aplicar mesma policy a **chat**, **smart-summary**, **kpis**, **live-dashboard** |
| P1 | Fundir `dashboardVisibility` em `dashboardPolicyEngine` (widgets + sections + capabilities) |
| P1 | Audit log: quem alterou visibilidade + diff |
| P2 | Modo “IA sugere configuração” (draft) — admin aprova (HITL para governance) |
| P2 | Explicabilidade: “visto porque policy X + perfil Y” no payload |

### 8.3 O que fazer com o mecanismo atual

| Aspecto | Decisão |
|---|---|
| Remover? | **Não** |
| Manter checkboxes? | **Sim**, como **override administrativo** até policy engine absorver |
| Expandir a todo software? | **Só após** unificação de policy (senão fragmenta mais) |
| IA autônoma? | **Nunca** como única camada em produção industrial |

---

## 9. Justificativa multidimensional da decisão **C + E**

| Dimensão | Justificativa |
|---|---|
| **Técnica** | Autoridade plural; visibility é camada fraca mas determinística; IA não cobre todos os canais |
| **Operacional** | Bypass chat provado; fail-open frontend; remover aumenta incidentes |
| **Cognitiva** | Resolvers melhoraram mas bifurcação e heurísticas impedem 100% |
| **Normativa** | ISO 42001 pede oversight e uso pretendido — híbrido alinha; autonomia total não |
| **Comercial** | Enterprise compra controlo + IA, não IA sem rede de segurança |
| **Arquitetural** | `dashboardPolicyEngine` + `domainAuthority` são o lugar certo para convergir |

---

## 10. Classificação de achados

| ID | Achado | Nível |
|---|---|---|
| G1 | Rota `/dashboard/visibility` inexistente; fail-open ALL_TRUE | CRÍTICO |
| G2 | Chat ignora `dashboardVisibility` | CRÍTICO |
| G3 | `DashboardInteligente` não usa `sections` de `/dashboard/me` | CRÍTICO |
| G4 | Múltiplas autoridades sem policy unificada | ALTO |
| G5 | CEO/Diretor bypass config níveis 2–5 | MÉDIO (by design) |
| G6 | DEFAULT_SECTIONS permissivo sem DB | MÉDIO |
| G7 | Maturidade IA insuficiente para autonomia total | ALTO |
| G8 | Domain leak V2 corrigido — regressão possível se remover guards | ALTO |
| G9 | ISO não exige UI manual mas exige governança demonstrável | INFO |
| G10 | Enterprise market prefere híbrido | INFO |

---

## 11. Frase-guia

> **“A IA personaliza dentro do envelope; a governança explícita define o envelope; o administrador pode estreitar o envelope quando o risco o exige.”**

Remover o mecanismo sem substituir por policy engine unificada **não liberta** a IA — **desprotege** o utilizador e o cliente.
