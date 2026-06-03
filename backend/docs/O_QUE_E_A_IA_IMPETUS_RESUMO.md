# O que é a IA IMPETUS — resumo de capacidades

**Data:** 2026-06-03  
**Público:** gestão, curso, operação, parceiros  
**Ambiente de referência:** produção `http://72.61.221.152:3000`  
**Nota:** este texto descreve o **produto real** auditado no código e no servidor — não marketing de “superinteligência” nem IAG com consciência.

---

## 1. Em uma frase

A **IA IMPETUS** é um conjunto de **assistentes especializados** (texto, voz, visão, painéis) ligados aos **dados da fábrica** no sistema IMPETUS (PLC, qualidade, manutenção, RH, ambiente, etc.), com **regras para não inventar métricas** quando não há evidência — não é uma mente única que sabe tudo nem uma superinteligência geral.

---

## 2. O que ela **não** é

| Mito (curso / marketing genérico) | Realidade IMPETUS |
|----------------------------------|-------------------|
| Superinteligência em qualquer tarefa | **Não** — vários modelos (OpenAI, Gemini, Claude) **orquestrados** com limites |
| Consciência ou “saber que existe” | **Não** — há logs, auditoria, HITL; não há módulo de consciência |
| Aprende sozinha como um humano em tudo | **Não** — aprende no sentido de **usar contexto + memória + dados do tenant**; não retreina um cérebro IMPETUS único por fábrica por defeito |
| Substitui ERP, PLC ou decisão humana crítica | **Não** — **assiste**; acções críticas passam por governança, aprovação e dados reais |

---

## 3. O que ela **é** (arquitectura em linguagem simples)

```text
Operador / gestor (app web)
        │
        ▼
┌───────────────────────────────────────┐
│  IMPETUS — dashboards, cockpits, chat │
└───────────────────────────────────────┘
        │
        ├── Dados reais (PostgreSQL, PLC, eventos, NC, manutenção…)
        ├── Identidade (cargo, setor, permissões)
        └── IA (vários canais abaixo)
                │
                ▼
        Prompt + contexto da fábrica
                │
                ▼
        Modelos externos (GPT, Gemini*, Claude*)
                │
                ▼
        Verdade operacional (Truth) + detecção de alucinação
                │
                ▼
        Resposta (texto, voz, gráfico no painel, sugestão)
```

\* Gemini depende de chave API válida no servidor (hoje frequentemente **indisponível**).

**Classificação interna do projeto:** *runtime cognitivo híbrido* — mais do que “ERP com chatbot”, menos do que “sistema operativo cognitivo enterprise” totalmente unificado.

---

## 4. Canais — o que o utilizador pode usar

| Canal | O que faz | Quem usa típico |
|-------|-----------|-----------------|
| **Dashboard + chat** | Perguntas sobre KPIs, produção, alertas; respostas com contexto do tenant | CEO, gerente, coordenador |
| **IA em texto (chatbot admin)** | Conversa longa, apoio administrativo | Admin |
| **Voz Anam (avatar)** | Diálogo ao vivo, comandos de voz, painel inteligente à direita | Liderança, operação (opt-in) |
| **OpenAI Realtime** | Alternativa de voz (quando configurada) | Piloto / fallback |
| **Smart Panel** | Gera painel visual (KPIs, gráficos, export PDF/Excel) a partir da conversa | Quem usa voz ou chat com painel |
| **Conselho cognitivo (triade)** | Perguntas complexas: várias camadas de IA + políticas | Chat quando escala (“cognitive escalation”) |
| **Chat interno @ImpetusIA** | Mensagens entre colaboradores com IA na thread | Toda a empresa |
| **ManuIA** | Manutenção: assistência ao vivo, visão em máquina (quando Gemini ok) | Técnicos manutenção |
| **Cadastrar com IA / Registro inteligente** | Ler documento/imagem e ajudar cadastro | Admin, RH |
| **Pró-Ação** | Sugestões ligadas a ações operacionais | Operação |
| **Cockpits por domínio** | Quality, Production, Safety, Environment, Maintenance, Executive, RH — blocos cognitivos + KPIs | Por perfil |
| **Alertas inteligentes** | Agregação e priorização (SQL + regras, não “magia”) | Supervisão |

---

## 5. Domínios em que a IA é **mais capaz**

Quando há **dados no tenant** (PLC, ordens, NC, comunicações, etc.):

| Domínio | Exemplos do que consegue |
|---------|---------------------------|
| **Produção** | Explicar OEE, paradas, tendências; resumir turno (com dados reais) |
| **Qualidade** | NC, CAPA, indicadores quality cockpit |
| **Manutenção** | Ordens de trabalho, assistência ManuIA, dossiê técnico |
| **Segurança / Meio ambiente** | Cockpits e fluxos (muitos ainda em **shadow** — ver secção 7) |
| **RH / Executive** | Narrativas e painéis executivos (rollout parcial) |
| **Gestão** | Dashboard vivo, centro de comando, exportações |

Quando o **banco está vazio** ou sem PLC na unidade, a IA **deve** dizer que não há dados — e, na voz Anam (desde 03/06), **corrige** se tiver inventado um número.

---

## 6. Capacidades técnicas (o que está ligado em 03/06/2026)

| Capacidade | Estado | Efeito para o utilizador |
|------------|--------|---------------------------|
| **Truth enforcement** (`enforce`) | Ligado | Texto validado contra snapshots/KPIs reais |
| **Hallucination block** | Ligado | Respostas de alto risco podem ser bloqueadas/substituídas |
| **Eventos sintéticos C2** | Desligado | Não “inventa” eventos de fábrica para preencher vazio |
| **Correcção oral Anam** | Ligado | Se falar OEE/produção sem base, corrige em voz |
| **Triade / decisão unificada** | Ligado | Chat complexo pode ir ao conselho cognitivo |
| **Safety cognitivo** | Ligado (flag) | Camada extra em respostas de chat |
| **OpenAI (GPT + TTS)** | Operacional | Chat e voz principais |
| **Gemini** | Bloqueado se chave inválida | Visão/percepção multimodal limitada |
| **Memória operacional / binding** | Activo no chat | Continuidade de contexto na conversa |

---

## 7. O que ainda é **parcial** ou em **shadow**

| Área | Situação | Impacto |
|------|----------|---------|
| Cockpits Safety, Environment, HR, Maintenance, Executive | Muitos em **shadow/preview** | IA de domínio existe no código; UI pode não ser “full” em todos |
| Runtime cognitivo Z.18–Z.29 “master” | Híbrido / flags heterogéneas | Nem tudo converge num único cérebro |
| Claude Panel (pós-voz) | Truth fraco vs dashboard | Risco de gráfico “bonito” sem dado |
| ManuIA live | Truth parcial | Manutenção avançada depende de Fase 2 |
| Certificação “0% inventado” | Não provada | Falta stress 100 perguntas + tempo em produção |
| Safety publication | Shadow em PM2 | Critério “Safety governado” do piloto pleno ainda não |
| Estabilidade servidor | Muitos restarts PM2 históricos | Confiabilidade 24/7 a monitorizar |

---

## 8. Comparar com “IA sobre-humana numa tarefa”

| Tarefa | Pode parecer “melhor que humano” porque… | Limite importante |
|--------|------------------------------------------|-------------------|
| Resumir muito texto / relatório | Lê rápido, sintetiza | Pode errar factos sem Truth |
| Sugerir plano de painel | Estrutura JSON, layout | Gráfico pode ficar vazio ou genérico |
| Responder em voz natural | TTS + persona Anam | Falava antes da validação; agora **corrige depois** |
| Classificar imagem (ManuIA) | Modelo visão | Precisa Gemini/credenciais |
| Decisão com risco de vida | — | **Humano + procedimento** continuam obrigatórios |

Definição honesta para apresentação:

> *“IA industrial especializada: supera humanos em **velocidade de análise e redação** quando os dados existem no IMPETUS; não supera humanos em **responsabilidade, contexto físico da linha nem julgamento ético**.”*

---

## 9. Fluxo típico — CEO no dashboard

1. Login → **dashboard** (voz **não** abre sozinha).  
2. Pergunta no chat ou abre **microfone** (Anam).  
3. Sistema injeta KPIs/snapshot do tenant.  
4. Modelo responde.  
5. **Truth** valida texto; se inventou métrica → substitui ou, na voz, **corrige oralmente**.  
6. Opcional: **Smart Panel** mostra gráfico com dados hidratados (quando o plano do painel é válido).

**Teste de confiança (15 min):** “Qual o OEE hoje?” sem dados na unidade → deve ouvir/ver mensagem de **sem dados verificados**, não “87%”.

---

## 10. Métricas de observabilidade (snapshot 03/06)

| Indicador | Valor aproximado |
|-----------|------------------|
| Avaliações anti-alucinação (total) | ~255 |
| Traces de interação IA (30 dias) | ~955 |
| Traces com metadado `industrial_truth` | ~202 (~21%) |
| Validações voz shadow (7 dias) | 4 |
| PLC leituras (tenant ref., 7 dias) | ~60k |

Detalhe: `COGNITIVE_OBSERVABILITY_REPORT.md`.

---

## 11. Documentos relacionados

| Tema | Ficheiro |
|------|----------|
| CEO / activação Truth | `RELATORIO_EXECUTIVO_WELLIGTON_TRUTH_2026-06-03.md` |
| Gaps e canais | `TRUTH_GAP_REPORT.md` |
| Fontes de dados IA | `TRUTH_SOURCE_INVENTORY.md` |
| Voz Anam | `ANAM_REALTIME_TRUTH_AUDIT.md` |
| QA fábrica + Truth | `INDUSTRIAL_READINESS_QA_REPORT.md` (Anexo A) |
| Observabilidade | `COGNITIVE_OBSERVABILITY_REPORT.md` |

---

## 12. Conclusão — como explicar a IA IMPETUS

**É:** plataforma industrial com **múltiplas IAs**, dados reais, voz, painéis e **governança de verdade** em evolução.  
**Não é:** superinteligência, consciência ou substituto do chão de fábrica.  
**Capaz hoje:** acelerar gestão e operação **com dados**; negar ou corrigir inventos **cada vez mais**; pilotar CEO e equipas com chat/voz/painel.  
**Próximo passo:** chave Gemini válida, teste de campo, Fase 2 (Claude Panel + ManuIA), estabilidade PM2.

---

*Versão 1.0 — 2026-06-03. Pode ser partilhado com Welligton, curso ou equipa sem misturar com narrativa AGI.*
