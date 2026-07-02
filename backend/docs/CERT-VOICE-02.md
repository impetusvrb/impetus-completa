# CERT-VOICE-02 — Consolidação do Executive Presentation Context

**Data:** 2026-06-27  
**Status:** IMPLEMENTADO (consolidação aditiva)  
**Pré-requisito:** [CERT-VOICE-01](./CERT-VOICE-01.md)

---

## Declaração

O **Modo Apresentação** deixa de ser apenas uma flag de interface (`sessionStorage` + ocultar KPIs) e passa a integrar o **Executive Conversation Context**, administrado pelo **Conversation Context Engine** com sessão server-side por utilizador.

A arquitetura conversacional do IMPETUS considera-se **encerrada** após este certificado.

---

## Arquitetura anterior (pós CERT-VOICE-01)

```
Executive Dashboard → sessionStorage → ANAM lê flag
                   → oculta KPIs na UI
```

Apresentação = característica visual, não domínio cognitivo unificado.

---

## Arquitetura consolidada

```
Executive Dashboard ──POST /presentation-context──┐
ANAM (frase: «iniciar apresentação») ──────────────┤
                                                   ▼
                          Executive Presentation Context
                          (sessão server-side por user/tenant)
                                                   ▼
                          Conversation Context Engine
                                                   ▼
                          Perfil `presentation` + níveis
                                                   ▼
        ┌──────────────┬──────────────┬──────────────┬──────────────┐
        ▼              ▼              ▼              ▼              ▼
      ANAM      Executive Query   SmartPanel    Boardroom      Voice Realtime
```

---

## Objeto `presentation_context`

| Campo | Descrição |
|-------|-----------|
| `enabled` | Apresentação activa |
| `audience` | `external`, `internal`, `board`, `investor` |
| `presentation_level` | `executive`, `internal`, `board`, `investor` |
| `privacy_level` | `high`, `medium`, `normal` |
| `verbosity` | Estilo de resposta |
| `speech_style` | Formalidade |
| `allow_details` | Detalhes operacionais na fala |
| `allow_names` | Nomes de pessoas |
| `allow_values` | Valores numéricos detalhados |
| `allow_drilldown` | Listas / registos individuais |
| `source` | `dashboard`, `voice_phrase`, `engine` |

### Níveis preparados

| Nível | Uso |
|-------|-----|
| `executive` | Institucional — agregados, alta privacidade |
| `internal` | Reunião interna — mais detalhe, governança mantida |
| `board` | Diretoria — integração boardroom |
| `investor` | Estrutura pronta (regras = executive por ora) |

---

## Módulos novos

| Módulo | Caminho |
|--------|---------|
| Executive Presentation Context | `conversationContext/executivePresentationContext.js` |
| Sessão server-side | `conversationContext/presentationContextSessionStore.js` |
| Observabilidade | `conversationContext/presentationContextObservability.js` |
| Cliente frontend | `frontend/src/conversationContext/presentationContextClient.js` |

---

## APIs

| Método | Rota | Função |
|--------|------|--------|
| GET | `/dashboard/presentation-context` | Lê estado activo |
| POST | `/dashboard/presentation-context` | Dashboard informa `presentation requested` |
| POST | `/dashboard/executive-query` | Consulta executiva + `presentation_context` |
| GET | `/dashboard/conversation-context` | Inclui `presentation_context` |
| GET | `/dashboard/voice-realtime-context` | Inclui perfil + apresentação no prompt |

---

## Integrações

### ANAM
- Frases: «iniciar apresentação», «modo apresentação», «vou apresentar indicadores», «preparar reunião»
- `anamPanelBridge` usa `buildVoiceRealtimeParams()` (server-side, não só sessionStorage)

### Executive Dashboard
- Toggle chama `POST /presentation-context`
- Ao montar, `GET /presentation-context` restaura estado
- `sessionStorage` mantido como cache legado

### Executive Query
- `processExecutiveQueryForUser()` injecta `presentation_context` no prompt
- Sem novos filtros de permissão

### SmartPanel
- `applyPresentationPanelHints()` — prioriza chart/KPI; evita chat/table extensos
- Activado quando `presentation_context.enabled`

### Boardroom
- Nível `board` + flag `executiveBoardroom` → sinal `executive:boardroom_presentation`
- Subcontexto unificado no domínio executivo (sem duplicidade)

---

## Observabilidade

Métricas adicionadas:

- `presentation_context_enabled`
- `presentation_context_disabled`
- `presentation_context_usage`
- `presentation_profile_selected`
- `presentation_sensitive_data_hidden`
- `presentation_boardroom_usage`

---

## Compatibilidade

| Item | Estado |
|------|--------|
| JWT / RBAC / Truth / Structural Governance | Inalterados |
| CERT-VOICE-01 engine | Estendido, não substituído |
| UI Executive Dashboard (ocultar KPIs) | Preservada |
| `modoApresentacao` legado em APIs | Mantido como alias |
| `sessionStorage` | Cache; servidor é fonte de verdade |

### Rollback

```env
IMPETUS_CONVERSATION_CONTEXT_ENGINE=off
```

Apresentação volta ao comportamento mínimo (sem bloco cognitivo server-side).

---

## Critérios de aceite

- [x] 100% aditivo
- [x] Sem alteração de permissões / truth
- [x] Modo Apresentação integrado ao Executive Conversation Context
- [x] Estado administrado pelo engine (sessão server)
- [x] ANAM, Dashboard, Executive Query, SmartPanel, Boardroom partilham contexto
- [x] Sem mecanismos paralelos novos
- [x] Níveis executive/internal/board/investor preparados
- [x] Documentação CERT-VOICE-02
- [x] Testes automatizados

---

## Testes

```bash
node backend/src/conversationContext/conversationContextClassifier.test.js
node backend/src/conversationContext/executivePresentationContext.test.js
```

---

## Encerramento

Com CERT-VOICE-02, novas capacidades conversacionais devem surgir apenas como **novos perfis e sinais** no Conversation Context Engine — mesma filosofia do Pulse Cognitivo: núcleo estável, evolução pelo ecossistema.
