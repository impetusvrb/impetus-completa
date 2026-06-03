# RELATÓRIO EXECUTIVO — IMPETUS  
## Plano Operacional de Verdade (Truth) + Experiência de Entrada

**Para:** Welligton Freitas Machado (CEO)  
**De:** Equipa técnica IMPETUS / Operações  
**Data:** 03 de junho de 2026  
**Ambiente:** Produção — `http://72.61.221.152:3000` (app) · API backend porta 4000 (PM2 `impetus-backend`, `impetus-frontend`)  
**Referência:** Plano original de certificação industrial (Etapas 1–10) e pedido de activação das funções críticas desligadas.

---

## 1. Resumo executivo

Foi executada uma **activação controlada** das capacidades de **verdade operacional** (truth enforcement), **segurança cognitiva** e **correcção oral da Anam**, alinhada ao plano das 10 etapas. O objectivo é **reduzir respostas inventadas** (OEE, produção, KPIs sem base em dados IMPETUS) sem bloquear a operação diária.

**Resultado em uma frase:** as funções **mais importantes para integridade de dados e voz** estão **ligadas em produção**; a percepção Gemini e alguns ramos de chat ainda dependem de **chave API válida** e de uma **segunda fase de código** (conselho cognitivo).

| Indicador | Antes | Depois (03/06/2026) |
|-----------|--------|----------------------|
| Modo truth industrial | Parcial / shadow | **enforce** |
| Bloqueio de alucinação | OFF | **ON** |
| Eventos sintéticos como reais (C2) | ON | **OFF** |
| Anam Realtime — correcção após fala inventada | Só auditoria (shadow) | **Enforcement oral activo** |
| Motor de decisão unificado + triade | Desligado | **Ligado** |
| Safety cognitivo | OFF | **ON** |
| AI Gateway + ingress Gemini (flags) | Parcial | **Ligado** (Gemini aguarda chave) |

**Deploy:** build do frontend concluído; processos PM2 reiniciados com `--update-env`.

---

## 2. Contexto do pedido

Com base no checklist enviado (Etapas 1–10 — *Status Real do Plano Original*), a prioridade foi:

1. **Ligar** o que estava desligado e é **crítico para confiança industrial** (dados reais, não narrativa fictícia).
2. **Não** activar de imediato modos que **cortam áudio ou chat de forma agressiva** em toda a plataforma.
3. Manter **entrada no dashboard** após login (CEO/liderança) e **IA em texto** para administradores, sem abrir voz Anam automaticamente no login.

---

## 3. Estado das 10 etapas (plano original)

| Etapa | Descrição | Status anterior | Status actual |
|-------|-----------|-----------------|---------------|
| **1** | Mapeamento dos fluxos | Parcial | **Parcial** — documentação existente; não é activação por switch |
| **2** | Truth Enforcement Coverage | Parcial | **Ligado** — `IMPETUS_INDUSTRIAL_TRUTH_MODE=enforce`, `IMPETUS_HALLUCINATION_BLOCK=on` |
| **3** | Auditoria de geração de dados | Quase concluída | **Reforçado** — eventos sintéticos quando BD vazia: **desligados** |
| **4** | Auditoria Anam Realtime | Pendente (vermelho) | **Ligado** — validação pós-fala + **correcção oral** se inventar métrica |
| **5** | Truth Source Inventory | Parcial | **Parcial → ligado** — AI Gateway; inventário completo em evolução |
| **6** | Observabilidade cognitiva | Parcial | **Ligado** — safety cognitivo + gateway |
| **7** | Stress test de verdade | Não certificado | **Auditado** — script phase37 com modo **enforce** e bloqueio activo |
| **8** | Gap Report | Não existia / desatualizado | **Actualizado** — `backend/docs/TRUTH_GAP_REPORT.md` |
| **9** | Plano final de correção | Não iniciado formalmente | **Iniciado** — bloco de flags + código voz; GAPs de chat em fase 2 |
| **10** | Certificação industrial | Parcial | **Reforçado** — readiness já ON + triade unificada |

**Legenda visual sugerida para follow-up:** 🟢 Ligado · 🟡 Parcial · 🔴 Pendente manual/código

---

## 4. O que foi activado (detalhe técnico resumido)

### 4.1 Verdade e alucinação (texto e métricas)

- **Enforcement industrial:** respostas de IA passam por validação contra dados operacionais quando o modo está em `enforce`.
- **Bloqueio de alucinação:** activado — respostas de alto risco podem ser substituídas ou bloqueadas conforme política IMPETUS.
- **C2 synthetic events:** desligado — evita que o sistema **preencha lacunas** com eventos fictícios tratados como reais.

### 4.2 Voz Anam (Etapa 4 — principal gap das imagens)

**Comportamento novo para o utilizador:**

1. Utilizador fala com a Anam (microfone / overlay de voz).
2. Após a resposta da persona, o backend **valida** o texto contra contexto operacional.
3. Se detectar **invenção de KPI** (ex.: OEE sem snapshot), a Anam **interrompe e corrige oralmente**, com mensagem do tipo:  
   *«Não tenho dados operacionais verificados no IMPETUS para afirmar isso com segurança…»*

**Flag:** `IMPETUS_VOICE_TRUTH_ORAL_ENFORCE=true`  
**Código:** `frontend/src/services/anamPanelBridge.js` + `POST /api/dashboard/voice-truth-shadow-validate`

### 4.3 Decisão unificada e triade cognitiva

- `UNIFIED_DECISION_ENGINE=true`
- `UNIFIED_DECISION_USE_TRIADE=true`  

Escalonamento para **conselho cognitivo** quando a decisão unificada o exigir, com safety ligado.

### 4.4 AI Gateway e Gemini

- Gateway e realtime gateway: **ligados por configuração**.
- Ingress Gemini: **ligado por flag**, mas **ping falha** — chave API no servidor **inválida ou placeholder**.  
  **Acção CEO/ops:** inserir `GEMINI_API_KEY` válida (Google AI Studio) e reiniciar backend.

### 4.5 O que foi deixado de fora de propósito

| Capacidade | Motivo |
|------------|--------|
| `AI_GATEWAY_REALTIME_ENFORCE` global | Risco de cortar áudio em massa antes de validação em campo |
| Orquestrador unificado em **todo** o chat | Mudança ampla; fase 2 após validação com Welligton |

---

## 5. Experiência de utilizador (complementar ao plano Truth)

Alterações já em produção alinhadas aos pedidos anteriores:

| Perfil | Após login |
|--------|------------|
| **CEO / liderança** | Entrada em **`/app`** (dashboard inteligente), **sem** abrir overlay de voz automaticamente |
| **Administrador** | Entrada em **`/app/chatbot`** (IA em texto) |
| **Voz Anam** | Só inicia quando o utilizador **pede** (microfone, atalho, «Ok Impetus», etc.) |

Isto reduz «delírio» percebido ao entrar na app e mantém a voz como canal **opt-in**.

---

## 6. Evidências de auditoria (03/06/2026)

### 6.1 Stress test (Phase 37 — fábrica real)

- Tenant de referência com dados PLC: **~59 408** leituras PLC (7 dias) — base real para validação.
- **Hallucination detection:** modo **`enforce`**, **`block_enabled: true`**
- Avaliações registadas: **231** (confiança média ~0,81; fila de revisão pendente: 5)

### 6.2 Gemini readiness

- Chave configurada no ficheiro de ambiente: **sim**
- Ping live: **falhou** — «API key not valid»
- **Impacto:** módulos de percepção/ingress Gemini **não operacionais** até correcção da chave

### 6.3 Saúde do serviço

- Backend: **`/api/health`** — OK  
- OpenAI (chat/TTS): **disponível**  
- Google Vertex/Gemini texto: **indisponível** até chave válida

---

## 7. Lacunas ainda abertas (transparência)

Documentadas em `TRUTH_GAP_REPORT.md`:

| ID | Descrição | Severidade | Mitigação actual |
|----|-----------|------------|------------------|
| **GAP-01** | Conselho cognitivo — alguns ramos sem `enforceTextResponse` antes do JSON | CRITICAL | Triade + safety ON; **correcção de código recomendada (Fase 2)** |
| **GAP-03** | Chat interno @ImpetusIA — pipeline diferente do dashboard | HIGH | Parcialmente mitigado por flags; alinhar pipeline na Fase 2 |
| **Gemini** | Chave inválida | HIGH | **Acção manual** Welligton/IT |

---

## 8. Acções recomendadas (próximos 7 dias)

### Para Welligton / gestão

1. **Validar em campo (15 min):** login CEO → dashboard → abrir voz → perguntar «Qual o OEE hoje?» sem dados na unidade; **esperar correcção oral** da Anam.
2. **Aprovar Fase 2:** enforce de texto no **conselho cognitivo** e chat @ImpetusIA (GAP-01/03).
3. **Fornecer ou autorizar** nova **GEMINI_API_KEY** (Google AI Studio) para activar percepção multimodal.

### Para equipa técnica

1. Substituir chave Gemini → `pm2 restart impetus-backend --update-env` → `node scripts/gemini-readiness-audit.js` (confirmar `live_ping.ok=true`).
2. Implementar `enforceTextResponse` em todos os `res.json` de texto IA do conselho (`dashboard.js`).
3. Monitorizar taxa `would_replace` em voz (meta: &lt; 10% em tenants com dados reais).

---

## 9. Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Anam corrige em voz com frequência alta (tenant sem dados) | Média | Esperado até haver PLC/KPIs; mensagem educativa ao utilizador |
| Chat conselho ainda inventar em casos extremos | Baixa–média | Fase 2 código GAP-01 |
| Gemini off | Alta (hoje) | Chave válida + restart |
| Falsos positivos no bloqueio de alucinação | Baixa | Fila de revisão (5 pendentes); ajuste threshold se necessário |

---

## 10. Conclusão para decisão

O IMPETUS passou de um modo em que a **voz podia narrar métricas sem validação** para um modo em que **a mesma voz é corrigida em tempo real** quando não há base operacional. O **núcleo de truth enforcement** está **activo em produção**.

**Não está 100% fechado** o plano das 10 etapas: faltam **chave Gemini**, **certificação formal da Etapa 7** e **fecho de GAPs de chat por código**.

Recomendação: **aprovar operação com o estado actual** para CEO e piloto industrial, e **agendar Fase 2** (conselho + Gemini) na semana seguinte.

---

## Anexos (repositório)

| Documento | Caminho |
|-----------|---------|
| Gap report actualizado | `backend/docs/TRUTH_GAP_REPORT.md` |
| Auditoria Anam voz | `backend/docs/ANAM_REALTIME_TRUTH_AUDIT.md` |
| Validação shadow voz | `backend/docs/VOICE_SHADOW_VALIDATION.md` |
| Scorecard certificação | `backend/docs/OPERATIONAL_TRUTH_CERTIFICATION_SCORECARD.md` |

---

*Documento gerado para comunicação executiva. Versão 1.0 — 2026-06-03.*
