# CERT-VOICE-01 — Refatoração Conceitual do Modo Reunião → Contexto Conversacional Cognitivo

**Data:** 2026-06-27  
**Status:** IMPLEMENTADO (refatoração aditiva)  
**Tipo:** Refatoração Arquitetural  
**Prioridade:** Alta

---

## Declaração

O conceito legado **«Modo Reunião»** (`VITE_REALTIME_MEETING`) deixou de ser o mecanismo principal de comportamento conversacional. Foi substituído pelo **Conversation Context Engine** — camada que classifica cada interação e seleciona um **perfil conversacional** (tom, pausas, verbosidade) sem alterar permissões, governança ou truth enforcement.

A arquitetura de voz (ANAM, Realtime, Voice Engine, SmartPanel) permanece intacta. O OpenAI Realtime passa a ser apenas **transporte de áudio** quando activo, obedecendo ao perfil definido pelo motor cognitivo.

---

## Arquitetura anterior

```
Build (VITE_REALTIME_MEETING=true)
        ↓
Todo o frontend em «modo reunião»
        ↓
openaiRealtimeVoiceSession.js (lógica própria de VAD + instruções)
```

**Problemas:**

- Flag global de compilação — incompatível com SaaS multiutilizador
- CEO em reunião vs supervisor no ManuIA vs operador em inspecção: mesmo preset
- Fragmentação: Modo Reunião, Modo Apresentação, Executive Query, Boardroom, CEO Mode

---

## Arquitetura nova

```
Utilizador (frase / contexto UI)
        ↓
ANAM (interface conversacional principal)  |  OpenAI Realtime (transporte opcional)
        ↓
GET /dashboard/voice-realtime-context
GET /dashboard/conversation-context
        ↓
Conversation Context Engine
  ├── Classificador de Intenção/Contexto
  ├── Executive Conversation Context (meeting, presentation, briefing, boardroom…)
  └── conversationProfileRegistry
        ↓
Perfil conversacional (tom, pausas, verbosidade)
        +
Governança existente (inalterada): Structural AI, Dashboard Access, Truth Enforcement
        ↓
Resposta IA + SmartPanel (quando permitido e solicitado)
```

### Módulos criados

| Módulo | Caminho |
|--------|---------|
| Engine principal | `backend/src/conversationContext/conversationContextEngine.js` |
| Classificador | `backend/src/conversationContext/conversationContextClassifier.js` |
| Executive subcontextos | `backend/src/conversationContext/executiveConversationContext.js` |
| Registro de perfis | `backend/src/conversationContext/conversationProfileRegistry.js` |
| Observabilidade | `backend/src/conversationContext/conversationContextObservability.js` |
| Cliente frontend | `frontend/src/conversationContext/conversationContextClient.js` |

### Integrações aditivas

- `voiceRealtimeContextService.js` — anexa `prompt_append` e `conversation_context` à resposta
- `dashboard.js` — `GET /dashboard/conversation-context`
- `openaiRealtimeVoiceSession.js` — VAD/pausas via perfil (não `VITE_REALTIME_MEETING`)
- `anamPanelBridge.js` — refresh de contexto inclui perfil; lê `modoApresentacao` do dashboard executivo
- `useVoiceEngine.js` — passa `conversation_context` ao Realtime
- `ExecutiveDashboard.jsx` — persiste flag apresentação em `sessionStorage` para voz

---

## Perfis conversacionais

| ID | Uso |
|----|-----|
| `default` | Conversa geral |
| `operational` | Tarefas, OS, máquinas paradas |
| `technical` | ManuIA, diagnóstico, procedimentos |
| `executive` | Utilizador executivo, consultas estratégicas |
| `meeting` | Contexto reunião detectado (ex-substituto do Modo Reunião) |
| `presentation` | Modo apresentação / dados sensíveis ocultos no estilo |
| `executive_briefing` | Briefing do dia |
| `strategic_analysis` | Indicadores, situação agregada |
| `boardroom` | Cockpit executivo / boardroom runtime |

Cada perfil define: `tone`, `verbosity`, `pause_profile`, `detail_level`, `panel_behavior`, `speech_profile`, `context_priority`.

**Não define:** permissões, módulos autorizados, inject operacional, truth rules.

---

## Compatibilidade

| Componente | Estado |
|------------|--------|
| JWT / auth | Inalterado |
| Truth Enforcement | Inalterado |
| Structural Governance | Inalterado |
| Dashboard Access | Inalterado |
| SmartPanel | Inalterado — abre só com governança existente |
| ANAM | Principal; recebe bloco de perfil via `voice-realtime-context` |
| OpenAI Realtime Proxy | Inalterado; cliente usa perfil para VAD |
| `VITE_REALTIME_MEETING` | **Fallback legado** se engine falhar ou estiver off |
| Voice Engine / Wake Word / Overlay | Inalterados |

### Rollback

```env
IMPETUS_CONVERSATION_CONTEXT_ENGINE=off
```

Comportamento: perfil `default`, sem bloco conversacional no prompt.

---

## Observabilidade

Métricas em `observabilityService` (ALLOWED_INCREMENT_METRICS):

- `conversation_context_detected`
- `conversation_profile_selected`
- `conversation_context_switch`
- `executive_context_usage`
- `technical_context_usage`
- `operational_context_usage`
- `meeting_context_usage`

Evento estruturado: `conversation_context_detected` via `logEvent`.

---

## Variáveis de ambiente

| Variável | Default | Descrição |
|----------|---------|-----------|
| `IMPETUS_CONVERSATION_CONTEXT_ENGINE` | `on` | `off` desactiva engine (rollback) |
| `VITE_REALTIME_MEETING` | — | **Deprecado** — fallback build-time |

---

## Critérios de aceite

- [x] Desenvolvimento 100% aditivo
- [x] Nenhuma alteração em permissões / truth / JWT
- [x] ANAM como interface principal (contexto injectado por turno)
- [x] Realtime obedece perfil do engine (não lógica própria de reunião)
- [x] Modo Reunião deixou de ser conceito global de build
- [x] Executive Conversation Context unifica meeting + presentation + briefing + boardroom
- [x] Métricas de observabilidade
- [x] Documentação CERT-VOICE-01
- [x] Teste unitário classificador

---

## Regressões conhecidas / não alteradas

- `POST /dashboard/executive-query` — rota referenciada no frontend mas não implementada em `dashboard.js` (pré-existente; fora do escopo CERT-VOICE-01)
- Produção actual: `VITE_ANAM_PRIMARY=true`, `VITE_VOICE_REALTIME=false` — Realtime inactivo; engine activo via ANAM + API

---

## Testes

```bash
node backend/src/conversationContext/conversationContextClassifier.test.js
```

---

## Encerramento

Com CERT-VOICE-01, a arquitetura conversacional do IMPETUS fica consolidada num **núcleo estável** (Conversation Context Engine). Novos módulos (ERP/MES, Gêmeo Digital, ESG, Energia) devem apenas fornecer **sinais e contextos** ao engine, sem novas arquiteturas de voz — mesma filosofia do Pulse Cognitivo.

**Continuação:** [CERT-VOICE-02](./CERT-VOICE-02.md) — consolidação do Executive Presentation Context.
