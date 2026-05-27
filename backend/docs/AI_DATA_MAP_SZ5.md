# Mapa de Dados IA (SZ5) — IMPETUS

**PROMPT:** T1.8.1  
**Data:** 2026-05-26  
**Status:** CONCLUÍDO (audit read-only)  
**Código implementado:** NENHUM

---

## 1. Resumo Executivo

O IMPETUS possui **37 tabelas** directa ou indirectamente relacionadas a dados de IA. O ecossistema de memória cognitiva divide-se em 4 camadas:

1. **Embeddings** — Representações vectoriais (pgvector)
2. **Summaries** — Resumos gerados por LLM
3. **Context Memory** — Estado de sessão/conversação
4. **Long-term Memory** — Memória persistente (operacional, estratégica, empresarial)

---

## 2. EMBEDDINGS

### 2.1 Tabelas com vectores

| Tabela | Coluna | Tipo | Dimensão | Provider | Modelo | Rows |
|--------|--------|------|:---:|---------|--------|:---:|
| `manual_chunks` | `embedding` | vector (pgvector) | 1536 | OpenAI | text-embedding-3-small | 34 |

### 2.2 Infraestrutura vectorial

| Componente | Ficheiro | Estado |
|------------|----------|--------|
| Vector Runtime Service | `src/services/vectorRuntimeService.js` | Activo |
| Dashboard Embeddings | `src/dashboardEngineV2/learning/embeddings.js` | Preparação (sem provider) |
| Schema Registry | `VECTOR_SCHEMA_REGISTRY` | 1 tabela registada |
| Rollout State | `STABLE` | Sem migrations pendentes |
| pgvector extension | Instalada | Operacional |

### 2.3 Classificação

| Aspecto | Valor |
|---------|-------|
| **Reversibilidade** | **IRREVERSÍVEL** — embeddings não são decodificáveis para texto original |
| **Tipo de dado** | Representação vectorial numérica (float[1536]) |
| **PII** | Indirecto — o vector em si não contém PII legível, mas deriva de texto que pode conter |
| **DSR erasable** | Sim — pode-se NULL o vector, mas o chunk_text associado é o dado real |
| **Regenerável** | Sim — se o texto fonte existir, o embedding pode ser recriado |

---

## 3. SUMMARIES (Resumos gerados por LLM)

### 3.1 Mapa de colunas summary/resumo

| Tabela | Coluna | Conteúdo | Rows | Gerado por |
|--------|--------|----------|:---:|------------|
| `memoria_usuario` | `perfil_tecnico` | Perfil técnico do utilizador | 6 | LLM (onboarding) |
| `memoria_usuario` | `perfil_comportamental` | Perfil comportamental | 6 | LLM (onboarding) |
| `memoria_usuario` | `resumo_estrategico` | Resumo estratégico pessoal | 6 | LLM (onboarding) |
| `memoria_empresa` | `perfil_estrategico` | Perfil estratégico empresa | 1 | LLM (onboarding) |
| `memoria_empresa` | `resumo_executivo` | Resumo executivo | 1 | LLM |
| `memoria_empresa` | `resumo_operacional` | Resumo operacional | 1 | LLM |
| `memoria_empresa` | `resumo_cultural` | Resumo cultural | 1 | LLM |
| `operational_memory` | `summary` | Resumo de facto operacional | 71 | LLM / Sistema |
| `company_operation_memory` | `resumo` | Resumo de operação | 1 | LLM |
| `ai_decision_logs` | `dossier_summary` | Resumo do dossiê de decisão | 19 | Pipeline IA |
| `shift_handover` | `ai_summary` | Resumo de passagem de turno | — | LLM |
| `intelligent_registrations` | `ai_summary` | Resumo de registo inteligente | — | LLM |
| `knowledge_documents` | `summary_description` | Resumo de documento | — | LLM / Humano |
| `structural_knowledge_documents` | `summary` | Resumo de doc estrutural | — | LLM |

### 3.2 Classificação

| Aspecto | Valor |
|---------|-------|
| **Reversibilidade** | **REVERSÍVEL (parcial)** — resumos podem ser regenerados se os dados fonte existirem |
| **Tipo de dado** | Texto natural gerado por LLM |
| **PII** | Sim (perfis de utilizador contêm descrições pessoais derivadas) |
| **DSR erasable** | Sim — `memoria_usuario` purge completo no DSR Erase |
| **Regenerável** | Condicional — depende da existência dos dados fonte (respostas_raw, conversas) |

---

## 4. CONTEXT MEMORY (Memória de Sessão/Conversação)

### 4.1 Tabelas de contexto

| Tabela | Descrição | Rows | Escopo | TTL |
|--------|-----------|:---:|--------|:---:|
| `session_context` | Intents, entities, meta contextual | 3 | user+company | 30d |
| `cognitive_event_backbone` | Pipeline cognitivo (trace/context_hash) | 0 | company | 90d |
| `ai_knowledge_exchange` | Troca inter-IA (payloads) | 0 | company | 365d |
| `cognitive_hitl_feedback` | Feedback humano em decisões IA | 0 | user | ∞ (audit) |
| `cognitive_safety_events` | Eventos de segurança cognitiva | 0 | company | ∞ |
| `cognitive_stability_events` | Estabilidade do runtime cognitivo | 0 | company | ∞ |

### 4.2 Classificação

| Aspecto | Valor |
|---------|-------|
| **Reversibilidade** | **REVERSÍVEL** — dados voláteis de sessão, purgáveis |
| **Tipo de dado** | JSONB (intents, entities, meta, payloads) |
| **PII** | Indirecto — pode conter intents pessoais ou inputs do utilizador |
| **DSR erasable** | Sim — `session_context` incluso no DSR Erase |
| **Regenerável** | Não necessário — dados transitórios que se reconstroem naturalmente |

---

## 5. LONG-TERM MEMORY (Memória Persistente)

### 5.1 Memória do Utilizador (PII)

| Tabela | Descrição | Rows | Persistência | PII |
|--------|-----------|:---:|:---:|:---:|
| `memoria_usuario` | Perfil cognitivo completo (raw + summaries) | 6 | Indefinida | **ALTO** |
| `strategic_user_behavior` | Padrões de comportamento | var | 365d | Médio |
| `ai_proactive_consent` | Consentimentos IA proactiva | 0 | Indefinida | Baixo |

### 5.2 Memória da Empresa (Operacional)

| Tabela | Descrição | Rows | Persistência | PII |
|--------|-----------|:---:|:---:|:---:|
| `memoria_empresa` | Perfil estratégico corporativo | 1 | Indefinida | Não |
| `operational_memory` | Factos operacionais (com summary) | 71 | 365d | Não |
| `company_operation_memory` | Memória de operação upload | 1 | Indefinida | Não |
| `enterprise_ai_memory` | Memória enterprise IA | 0 | Indefinida | Não |
| `industry_intelligence_memory` | Inteligência industrial | 0 | Indefinida | Não |
| `knowledge_memory` | Base de conhecimento factual | 2 | Indefinida | Não |

### 5.3 Aprendizado Estatístico

| Tabela | Descrição | Rows | Persistência | PII |
|--------|-----------|:---:|:---:|:---:|
| `strategic_learning` | Métricas de aprendizado (intent, score, fallback) | 212 | Indefinida | Não |
| `operational_learning` | Aprendizado de máquinas (success_rate) | 0 | Indefinida | Não |

### 5.4 Classificação

| Aspecto | Memória Utilizador | Memória Empresa | Aprendizado |
|---------|-------------------|-----------------|-------------|
| **Reversibilidade** | **REVERSÍVEL** (purge via DSR) | **IRREVERSÍVEL** (base operacional) | **ESTATÍSTICO** (agregado) |
| **Tipo de dado** | JSONB + Text (perfis) | Text + JSONB | Numérico (scores) |
| **PII** | Sim (directo) | Não | Não |
| **DSR erasable** | Sim | Não | Não |
| **Regenerável** | Parcial (requer onboarding) | Não (acumulação contínua) | Sim (re-calcular) |

---

## 6. TRACES & DECISION LOGS (Auditoria IA)

| Tabela | Descrição | Rows | Classificação | Mutável |
|--------|-----------|:---:|:---:|:---:|
| `ai_interaction_traces` | Input/output de cada chamada LLM | 858 | PII_AI_DERIVED | Anonymize via DSR |
| `ai_decision_logs` | Pipeline decisório completo | 19 | AUDIT_IMMUTABLE | **NUNCA** |
| `ai_legal_audit_logs` | Auditoria legal de decisões IA | var | AUDIT_IMMUTABLE | **NUNCA** |
| `ai_audit_logs` | Auditoria genérica IA | var | AUDIT_IMMUTABLE | **NUNCA** |
| `ai_outbound_audit` | Auditoria de saída (comunicações IA) | var | AUDIT_IMMUTABLE | **NUNCA** |
| `ai_diagnostics` | Diagnósticos internos | var | OPERATIONAL | Purge (180d) |
| `ai_incidents` | Incidentes de IA | var | OPERATIONAL | Retain (365d) |

---

## 7. CLASSIFICAÇÃO CONSOLIDADA

### 7.1 Por Reversibilidade

| Classificação | Tabelas | Descrição |
|:---:|---------|-----------|
| **REVERSÍVEL** | `session_context`, `memoria_usuario`, `strategic_user_behavior`, `ai_proactive_consent`, `operational_memory` (content), `notifications`, `sessions` | Dados purgáveis/regeneráveis sem perda de capacidade do sistema |
| **IRREVERSÍVEL** | `manual_chunks.embedding`, `memoria_empresa`, `enterprise_ai_memory`, `industry_intelligence_memory`, `knowledge_memory`, `company_operation_memory` | Embeddings não decodificáveis; memória acumulada não recriável trivialmente |
| **ESTATÍSTICO** | `strategic_learning`, `operational_learning`, `ai_decision_logs` (scores/confidence), `cognitive_stability_events` | Agregados numéricos sem PII, usados para métricas de qualidade |

### 7.2 Por Risco LGPD

| Risco | Tabelas | Acção |
|:---:|---------|-------|
| **CRÍTICO** | `memoria_usuario` (perfis gerados por IA), `ai_interaction_traces` (input/output LLM) | DSR erasable, anonymize obrigatório |
| **ALTO** | `session_context`, `strategic_user_behavior`, `cognitive_hitl_feedback` | Purge por TTL ou DSR |
| **MÉDIO** | `operational_memory` (pode conter nomes em content) | Anonymize por TTL |
| **BAIXO** | `strategic_learning`, `operational_learning`, `empresa/*`, embeddings | Sem PII directo |
| **IMUTÁVEL** | `ai_decision_logs`, `ai_legal_audit_logs`, `ai_audit_logs` | Art. 37 — NUNCA eliminar |

---

## 8. MAPA VISUAL

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CAMADA DE DADOS IA (SZ5)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────┐  ┌──────────────────────┐                      │
│  │    EMBEDDINGS        │  │    SUMMARIES          │                      │
│  │  (IRREVERSÍVEL)      │  │  (REVERSÍVEL parcial) │                      │
│  ├─────────────────────┤  ├──────────────────────┤                      │
│  │ manual_chunks        │  │ memoria_usuario.*     │                      │
│  │  .embedding (1536d)  │  │ memoria_empresa.*     │                      │
│  │  pgvector/OpenAI     │  │ operational_memory    │                      │
│  │                      │  │  .summary             │                      │
│  │ [future]             │  │ ai_decision_logs      │                      │
│  │  user embeddings     │  │  .dossier_summary     │                      │
│  │  widget embeddings   │  │ shift_handover        │                      │
│  └─────────────────────┘  │  .ai_summary           │                      │
│                            └──────────────────────┘                      │
│                                                                          │
│  ┌─────────────────────┐  ┌──────────────────────┐                      │
│  │  CONTEXT MEMORY      │  │  LONG-TERM MEMORY     │                      │
│  │  (REVERSÍVEL)        │  │  (MISTO)              │                      │
│  ├─────────────────────┤  ├──────────────────────┤                      │
│  │ session_context      │  │ memoria_usuario (PII) │ ← DSR ERASABLE      │
│  │ cognitive_event_*    │  │ memoria_empresa       │ ← IRREVERSÍVEL      │
│  │ ai_knowledge_xchg    │  │ operational_memory    │ ← TTL 365d          │
│  │ cognitive_hitl_*     │  │ enterprise_ai_memory  │ ← IRREVERSÍVEL      │
│  │                      │  │ knowledge_memory      │ ← IRREVERSÍVEL      │
│  │ TTL: 30–365d         │  │ strategic_learning    │ ← ESTATÍSTICO       │
│  └─────────────────────┘  │ operational_learning   │ ← ESTATÍSTICO       │
│                            └──────────────────────┘                      │
│                                                                          │
│  ┌──────────────────────────────────────────────────┐                    │
│  │           AUDIT TRAIL IA (IMUTÁVEL)                │                    │
│  ├──────────────────────────────────────────────────┤                    │
│  │ ai_interaction_traces (858 rows) — input/output   │ ← ANONYMIZE (DSR)  │
│  │ ai_decision_logs (19 rows) — pipeline completo    │ ← NUNCA ELIMINAR   │
│  │ ai_legal_audit_logs — auditoria legal             │ ← NUNCA ELIMINAR   │
│  │ ai_audit_logs — auditoria genérica                │ ← NUNCA ELIMINAR   │
│  │ ai_outbound_audit — saída/comunicação             │ ← NUNCA ELIMINAR   │
│  └──────────────────────────────────────────────────┘                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 9. MODELO DE DADOS DETALHADO — PROVIDER & PIPELINE

### 9.1 Providers de IA identificados

| Provider | Modelo | Uso | Tabela de trace |
|----------|--------|-----|-----------------|
| OpenAI | gpt-4o-mini | Smart summary, chat | `ai_interaction_traces` |
| OpenAI | text-embedding-3-small | Embeddings de manuais | `manual_chunks` |
| Anthropic | claude-* | Cognitive council | `ai_decision_logs` |
| Sistema | — | Pipeline decisório | `ai_decision_logs` |

### 9.2 Fluxo de dados IA

```
User Input → [LLM Call] → ai_interaction_traces (input_payload + output_response)
                ↓
         [Decision Pipeline] → ai_decision_logs (dossier, stages, output)
                ↓
         [Memory Update] → operational_memory / memoria_usuario
                ↓
         [Learning] → strategic_learning (scores estatísticos)
```

---

## 10. IMPACTO DSR POR CAMADA

| Camada | DSR Export | DSR Erase | Retenção |
|--------|:---:|:---:|:---:|
| Embeddings | ✗ (não exportável como texto) | ✓ (NULL vector) | Indefinida |
| Summaries (user) | ✓ (texto exportável) | ✓ (purge completo) | Com user |
| Summaries (empresa) | ✗ (não pessoal) | ✗ | Indefinida |
| Context Memory | ✓ | ✓ (purge) | TTL 30d |
| Long-term (user) | ✓ | ✓ (purge) | Com user |
| Long-term (empresa) | ✗ | ✗ | Indefinida |
| Aprendizado estatístico | ✗ (agregado) | ✗ | Indefinida |
| Traces IA | ✓ (input/output) | ✓ (anonymize payload) | 365d |
| Decision Logs | ✓ (explicabilidade Art. 20) | ✗ (Art. 37 imutável) | ∞ |

---

## 11. RECOMENDAÇÕES (sem implementação)

1. **Embedding lifecycle**: Definir TTL para embeddings órfãos (manual deletado)
2. **Summary regeneration**: Pipeline para re-gerar summaries após anonymize
3. **Context expiry**: Enforcement do TTL 30d em `session_context`
4. **Trace retention**: Anonymize `input_payload`/`output_response` após 365d (hoje apenas via DSR)
5. **Statistical aggregation**: Mover `strategic_learning` > 1 ano para cold/aggregate
6. **User embedding pipeline**: Definir governance antes de activar embeddings de utilizadores
7. **Modelo de explicabilidade**: Garantir que `ai_decision_logs.explanation_layer` é suficiente para Art. 20 LGPD
