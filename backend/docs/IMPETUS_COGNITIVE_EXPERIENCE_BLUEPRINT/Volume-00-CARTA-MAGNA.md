# Volume 0 — Carta Magna
## IMPETUS Cognitive Experience Blueprint · Enterprise Edition v1.0

---

## 1. Propósito deste documento

O **IMPETUS Cognitive Experience Blueprint (ICEB)** é a **Constituição** da plataforma IMPETUS: define como o software **pensa**, **decide**, **adapta-se ao cargo**, **expõe experiência** e **integra** domínios industriais.

Não é um prompt, um pitch nem um manual de instalação. É o contrato técnico-experiencial entre:

- **Produto** (o que o utilizador deve sentir e ver)
- **Engenharia** (o que o código deve implementar)
- **Certificação** (o que pode ser auditado como VERDE)
- **Evolução** (o que fica no roadmap sem ambiguidade)

---

## 2. O que é o IMPETUS

**AB** — O IMPETUS é uma plataforma de **inteligência operacional industrial** multi-tenant, com:

- **Base Estrutural** como fonte de identidade organizacional (`company_roles`, departamentos, setores, linhas, ativos)
- **Dashboard vivo** personalizado por cargo e domínio funcional
- **Motores cognitivos** que agregam alertas, tarefas, telemetria, documentos e contexto estrutural
- **Canais de IA** (chat, painéis Claude, voz, assistência visual ManuIA)
- **Domínios nativos** (RH, Qualidade, SST, Ambiente, Logística, Manutenção, Financeiro, AIOI, etc.)

**N** — O IMPETUS aspira a ser um **Gêmeo Digital Cognitivo** da empresa: modelo vivo que representa fábrica, pessoas, processos e riscos em tempo quase real.

**R** — World Model unificado, ingestão RTSP/SCADA/MES em produção contínua, simulação what-if espacial — ver Volume X.

---

## 3. Filosofia do software

### 3.1 Identidade antes de inferência

Nenhum menu, dashboard ou resposta de IA deve contradizer o **cargo formal** cadastrado na Base Estrutural. A inferência por texto livre ou role genérico é **subordinada** ao cadastro.

**Evidência AB:** `moduleAccessGovernanceEngine.js`, `structuralCadastroModuleResolver.js`, `organizationalIdentityEngine.js`.

### 3.2 Domínio exclusivo

Módulos de domínio (ex.: ManuIA = manutenção, Quality Intelligence = qualidade) **não** aparecem fora do eixo funcional do utilizador, salvo permissão estrutural explícita.

**Evidência AB:** `domainRegistry.js`, `moduleInheritanceGuard`, governança modular.

### 3.3 Fail-closed com humanidade

Cadastro estrutural incompleto → menu reduzido (universais), aviso no dashboard, **não** menu vazio nem superconjunto de domínios errados.

**Evidência AB:** `MSG_INCOMPLETE` em `moduleAccessGovernanceEngine.js`; bypass executivo limitado ao núcleo + cadastro.

### 3.4 Verdade operacional

Gráficos e KPIs usam dados reais; proibido `Math.random()` e fallbacks fictícios em produção (regra DS/charts).

**Evidência AB:** `.cursor/rules/charts-real-data-industrial.mdc`, `dashboardChartDataService.js`.

### 3.5 Transparência cognitiva

Quando métricas são **enriquecidas** (oscilação, seed) para evitar UI vazia, isso deve ser **documentado** e eventualmente rotulado — não confundir com telemetria.

**Evidência AB:** `cognitiveLivingEnrichment.js` — comentário: *"quando dados reais são escassos"*.

### 3.6 Ecossistema cognitivo universal por cargo

O **Ecossistema Cognitivo Vivo** não é privilégio de um utilizador nem de um domínio (ex.: RH). É **obrigatório para todos os cargos** cadastrados na Base Estrutural, com **conteúdo filtrado** pelo eixo funcional, hint de cargo e hierarquia — nunca um menu ou pulso genérico partilhado.

| Camada | Comportamento | Evidência AB |
|--------|---------------|--------------|
| **Backend** | `resolveCognitiveAudienceFromStructural` → `applyAudienceToPulse` | `cognitiveAudienceResolver.js`, `cognitivePulseService.js` |
| **Centro de Comando** (`/app`) | Shell completo: ambiente, omni-presence, ecossistema colapsável | `CognitivePresenceShell`, `CentroComando.jsx` |
| **Dashboards especializados** | Operador e manutenção recebem o mesmo shell cognitivo | `DashboardOperador.jsx`, `DashboardMecanico.jsx` |
| **Demais telas** | Faixa compacta com identidade estrutural + link ao ecossistema | `Layout.jsx`, `CognitiveCompactPresence.jsx` |
| **Menu / módulos** | Mesma cadeia de autoridade que o pulso | `moduleAccessGovernanceEngine.js` |

**N** — Nenhuma tela autenticada fica sem presença cognitiva mínima. **R** — Twin industrial espacial e telemetria contínua em todas as personas.

---

## 4. Como o sistema pensa (modelo mental)

```
┌─────────────────────────────────────────────────────────────────┐
│  CAMADA 0 — MUNDO FÍSICO / ERP / PLC / CÂMERA / DOCUMENTOS    │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  CAMADA 1 — INGESTÃO (edge, PLC, outbox, uploads, chat)        │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  CAMADA 2 — BASE ESTRUTURAL + TENANT + RBAC                     │
│  company_roles · users · domain axis · permissions              │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  CAMADA 3 — MOTORES DE CONTEXTO E DECISÃO                       │
│  contexto org · eixo funcional · governança modular · decisão    │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  CAMADA 4 — COGNIÇÃO (pulse, council, painéis, chat grounding)  │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  CAMADA 5 — EXPOSIÇÃO (dashboard, menu, SSE, notificações)     │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  CAMADA 6 — EXPERIÊNCIA (UX Industrial 4.0, animação, voz)      │
└─────────────────────────────────────────────────────────────────┘
```

**AB** — Este fluxo está implementado de forma **fragmentada** (múltiplos motores, runtime-z, enrich). **N** — Unificação num orquestrador cognitivo único com contrato estável.

---

## 5. Como a IA aprende

| Mecanismo | Estado | Evidência |
|-----------|--------|-----------|
| Memória conversacional (SZ5) | AB | `z_conversation_message_index` |
| Memória cognitiva JSON/PG | AB | `cognitivePersistenceService`, `cognitiveDbPersistenceService` |
| HITL / feedback conselho | AB | `cognitive_hitl_feedback` |
| Aprendizado supervisionado | AB parcial | `supervisedLearningService`, `learningMemoryService` |
| Loop fechado máquina→modelo | R | não implementado em produção contínua |

A IA **não** re-treina modelos foundation no tenant; **aprende** via contexto, memória, políticas e feedback humano.

---

## 6. Como a IA decide

Ordem canónica de autoridade (do mais forte ao mais fraco):

1. **Política / compliance** — `aiSecurityGateway`, `promptFirewall`, LGPD
2. **Base Estrutural + RBAC** — cargo, domínio, `visible_modules`
3. **Motor de decisão unificado** — `unifiedDecisionEngine.js`, `decisionFacadeService.js`
4. **Conselho cognitivo** — `cognitiveOrchestrator.runCognitiveCouncil`
5. **Resposta LLM** — Claude/Gemini com grounding (`secureContextBuilder`, `plcChatGroundingService`)
6. **Enriquecimento vivo** — apenas preenchimento de UI, não decisão de acesso

---

## 7. Como a IA explica decisões

| Canal | Função | AB |
|-------|--------|-----|
| Painel Claude | Visualização estruturada (chart/table/kpi) | `claudePanelService.js` |
| Smart Panel | Comando em linguagem natural → painel | `smartPanelCommandService.js` |
| Truth closure | Fecho de verdade antes de expor | `cognitiveTruthClosureService.js` |
| Explicação operacional PLC | Narrativa sobre anomalias | `operationalExplanationService.js` |
| Consultor no Ecossistema Vivo | Resumo executivo + acção sugerida | `CognitiveAssistantStrip.jsx` + pulse |

**N** — Toda decisão automática com impacto operacional deve citar **fonte** (tabela, sensor, documento, cargo).

---

## 8. Consciência organizacional

**Definição ICEB:** capacidade do sistema de manter um **retrato situacional** da organização (quem, onde, tensão, alertas, tarefas) e apresentá-lo de forma contínua — **não** necessariamente um world model espacial completo.

**AB — componentes:**
- `cognitivePulseService.buildCognitivePulse` — poll `/api/dashboard/cognitive-pulse` (audiência estrutural)
- `cognitiveAudienceResolver` — filtro por cargo em previsões, agentes, domínios
- `organizationalIntelligenceEngine.composeOrganizationalIntelligence` — core, twin organizacional, agentes
- `cognitiveLivingEnrichment` — densidade visual quando dados escassos
- UI: `Layout` + `CognitivePulseProvider` (global), `CognitivePresenceShell` (`/app`), `CognitiveCompactPresence` (demais rotas)

**Distinção crítica (N normativo):**
- **Twin organizacional** (setores, RH, tensão) ≠ **Twin industrial** (máquinas, layout, PLC)
- Label "Digital Twin Sync" na UI **não** implica sincronização com chão de fábrica até ligação `AB` com telemetria

---

## 9. Glossário canónico

| Termo | Definição |
|-------|-----------|
| **Base Estrutural** | Cadastro master: cargos, setores, linhas, ativos, governança de módulos |
| **menu_key** | Chave canónica de módulo no menu (`operational`, `manuia`, …) |
| **dashboard_profile** | Perfil de dashboard (`ceo_executive`, `hr_management`, …) |
| **functional_axis / area** | Eixo de domínio (`executive`, `hr`, `maintenance`, …) |
| **Ecossistema Cognitivo Vivo** | Camada UI+API de presença cognitiva contínua (pulso), universal por cargo — shell em `/app`, faixa compacta nas demais rotas |
| **Cognitive Core** | Objeto de estado do motor organizacional (v2.0) |
| **IMPETUS Cognitive Core** | Nome de produto do hub central no ecossistema |
| **VERDE** | Estado certificado com 6 evidências |
| **Congelamento** | CERT-04: só FIX/CERT/SEC/OPS sem aprovação |

---

## 10. Audiência e uso

| Audiência | Usa o ICEB para |
|-----------|-----------------|
| Arquitectura | Decisões de integração, motores, freeze |
| Produto | UX por cargo, jornadas, copy IA |
| Backend/Frontend | Contrato de API, governança, menus |
| CERT/Auditoria | Matriz AB/N/R, VERDE, lacunas |
| Cliente enterprise | Compreensão do valor cognitivo (Volumes I, III, V resumidos) |

---

## 11. Regras de manutenção do blueprint

1. Nenhuma página entra sem classificação **AB**, **N** ou **R**.
2. Alteração de comportamento em código → actualizar secção `AB` ou abrir divergência `N`.
3. Novo módulo FEAT (pós-freeze) → Volume VI + VIII + matriz funcional.
4. Regenerar `INVENTORY.md` e `FUNCTIONAL_MATRIX.md` em cada release minor.
5. Versão semver do ICEB alinhada a marcos CERT (v1.0 = pós-auditoria twin + governança modular).

---

## 12. Compromisso de completude

Os Volumes I–X especificarão, sem resumo indevido:

- Comportamento, IA, UX, motores, regras, exceções, integração
- Cada tela (Vol. VIII), cada dashboard (Vol. VII), cada cargo (Vol. III)
- Cada motor relevante catalogado (Vol. IV) — ~335 engines/facades no repositório, taxonomia em tiers

**Meta:** 120–180 páginas · qualidade IECP · documento mais importante já produzido para o IMPETUS.

---

*Fim do Volume 0 · ICEB v1.0 · 2026-06-27*
