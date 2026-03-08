# Plano de Melhorias – Comparação com Scaffold Original

## Objetivo

Este documento compara o **código-fonte scaffold original** (IMPETUS Project scaffold) com o **software atual**, identificando esquemas lógicos que ainda não estão implementados e que agregariam valor. Serve apenas como referência para evolução do produto.

---

## Resumo da Comparação

| Área | Scaffold | Software Atual | Status |
|-----|---------|----------------|--------|
| Webhook + classificação IA | ✓ | ✓ | **Implementado** |
| Diagnóstico assistido (need_more_info, relatório) | ✓ | ✓ | **Implementado** |
| Aviso segurança (elétrico/pressão) | ✓ | ✓ | **Implementado** |
| OCR fallback PDF | ✓ (placeholder) | ✓ (tesseract+pdf2pic) | **Implementado** |
| Z-API (receber + enviar) | ✓ (notas) | ✓ (receber) | **Parcial** |
| Citação de fontes em relatórios | ✓ | ⚠️ | **Melhorar** |
| Safety mode (confiança baixa) | ✓ | ✗ | **Pendente** |
| Resposta automática ao criar tarefa/diag | ✓ (notas) | ✗ | **Pendente** |
| Proação worker (regras → alerts) | ✓ | ✗ | **Pendente** |
| Índice ivfflat para pgvector | ✓ | ⚠️ | **Verificar** |
| Validate retorna questions | ✓ (frontend) | ✗ | **Pendente** |
| ChatPanel / Reports no Dashboard | ✓ | ⚠️ | **Verificar** |

---

## Esquemas Lógicos Faltantes (detalhados)

### 1. Safety Mode – confiança baixa → pedir mais informações

**Scaffold (AI & Safety notes):**
> "Implement 'safety mode': if confidence low, ask for more info instead of producing steps that may be dangerous."

**Situação atual:** O sistema pede mais informações quando o texto é curto ou não tem palavra-chave de sintoma (`ensureSufficientDetail`). Não há verificação de **confiança da IA** – se a IA retornar passos com baixa certeza, o sistema ainda exibe o relatório.

**Melhoria proposta:** Após gerar o relatório, adicionar um passo em que a IA informe um nível de confiança (ou extrair do texto). Se confiança < X, retornar `need_more_info` com perguntas de esclarecimento em vez de exibir o relatório.

---

### 2. Citação explícita de fontes nos relatórios

**Scaffold (AI notes):**
> "Always cite manual chunk sources in AI responses to avoid hallucination."

**Situação atual:** O prompt pede "4) referências" e o contexto inclui títulos de manuais. A IA pode citar ou não. Não há formatação estruturada tipo `[Fonte: Manual X, p. Y]`.

**Melhoria proposta:** 
- Incluir no prompt instrução explícita: "Para cada causa ou passo, cite a fonte no formato: [Manual: título do manual]."
- Opcional: pós-processar o relatório para inserir referências dos `candidates` quando a IA não citar.

---

### 3. Resposta automática via Z-API ao criar tarefa/diagnóstico

**Scaffold (WhatsApp notes):**
> "To send messages back to users, call provider's send API from services/whatsapp.js"

**Situação atual:** `zapi.sendTextMessage` existe e funciona. Porém, ao processar mensagem WhatsApp e criar tarefa ou diagnóstico, **não** enviamos resposta ao remetente.

**Melhoria proposta:** Em `zapi.processWebhook`, após `processIncomingMessage` retornar com `taskId` ou `report`, chamar `sendTextMessage(companyId, sender, mensagemDeConfirmação)`.

Exemplo de mensagem:
- Tarefa: "Tarefa registrada com sucesso. ID: XXX. Nossa equipe irá analisar."
- Diagnóstico: "Diagnóstico gerado. Acesse o link [url] para ver o relatório completo."

---

### 4. Proação Worker – verificação periódica de regras → alerts

**Scaffold (módulo Pró-Ação):**
> "Worker exemplo: proacao_worker.js (checagens periódicas simples que geram alerts)"

**Situação atual:** Existe `proacao_rules`, `alerts`, rotas e serviço de Pró-Ação. Não há um **worker** que rode periodicamente (cron/setInterval) para avaliar regras e criar alerts.

**Melhoria proposta:** Criar `backend/scripts/proacao_worker.js` que:
- Carrega regras ativas de `proacao_rules`
- Executa checagens (ex: propostas pendentes há X dias, contagem por categoria)
- Cria registros em `alerts` quando as condições são atendidas
- Pode ser executado via cron ou PM2

---

### 5. Índice ivfflat para manual_chunks (pgvector)

**Scaffold (proacao_diag_migration.sql):**
```sql
CREATE INDEX IF NOT EXISTS idx_manual_chunks_embedding 
ON manual_chunks USING ivfflat (embedding) WITH (lists = 100);
```

**Situação atual:** Não está claro se esse índice existe no banco. Sem ele, buscas por similaridade são mais lentas com muitos chunks.

**Melhoria proposta:** 
- Incluir a criação desse índice em uma migration
- Documentar no README/PLANO_CONCLUSAO quando e como executar

---

### 6. Endpoint validate retorna `questions`

**Scaffold (Diagnostic.jsx):**
> Usa `v.data.questions` quando `sufficient: false` para exibir as mesmas perguntas que `runDiagnostic` retornaria.

**Situação atual:** O endpoint `/api/diagnostic/validate` retorna `{ sufficient, reason }`. O frontend usa uma lista genérica quando `sufficient: false`.

**Melhoria proposta:** Fazer o `validate` retornar também `questions` (as mesmas de `runDiagnostic` em `need_more_info`) para o frontend exibir de imediato, sem nova chamada.

---

### 7. Confirmação humana para ações críticas

**Scaffold:**
> "For critical actions (electric, pressurised systems) always show a clear disclaimer and require human confirmation."

**Situação atual:** Há disclaimer no relatório. Não há fluxo de **confirmação explícita** (ex: checkbox "Li e confirmo as condições de segurança") antes de seguir com o procedimento.

**Melhoria proposta:** Na página de relatório (Diagnostic/frontend) e no relatório HTML, adicionar:
- Mensagem: "Este procedimento envolve risco. Confirme que leu as orientações de segurança antes de executar."
- Campo/checkbox de confirmação (para uso em interface web; em WhatsApp poderia ser "Responda SIM para confirmar").

---

## Plano de Ação por Prioridade

### Prioridade alta (impacto direto no uso) — ✅ Implementado

| # | Item | Status |
|---|------|--------|
| 1 | Resposta automática Z-API | ✅ `zapi.processWebhook` envia `sendTextMessage` ao criar tarefa/diag |
| 2 | Validate retorna questions | ✅ `DIAGNOSTIC_QUESTIONS` em `ensureSufficientDetail` e no endpoint |
| 3 | Índice ivfflat | ✅ `proacao_diag_migration.sql` + `README_MIGRATIONS.md` |

### Prioridade média (qualidade e segurança) — ✅ Implementado

| # | Item | Status |
|---|------|--------|
| 4 | Citação explícita de fontes | ✅ Prompt ajustado: "Cite [Manual: título]" |
| 5 | Proação worker | ✅ `scripts/proacao_worker.js` + `npm run proacao-worker` |
| 6 | Confirmação humana | ✅ Caixa de aviso no relatório HTML e na página Diagnostic |

### Prioridade baixa (refino) — ✅ Implementado

| # | Item | Status |
|---|------|--------|
| 7 | Safety mode (confiança) | ✅ Heurística: `candidates < 2` ou `avgDistance > 0.5` → need_more_info |

---

## Ordem de implementação sugerida

1. **Resposta automática Z-API** (1–2 h)
2. **Validate retorna questions** (≈ 30 min)
3. **Migration ivfflat** (≈ 30 min)
4. **Citação de fontes** (1–2 h)
5. **Proação worker** (2–3 h)
6. **Confirmação humana** (1–2 h)
7. **Safety mode** (2–4 h – requer definição de critérios de confiança)

---

## Itens do scaffold já cobertos (sem ação)

- Webhook com normalização de payload
- Classificação de mensagens (tarefa, falha_técnica, etc.)
- Diagnóstico com need_more_info e perguntas
- Busca em manuais via embeddings
- Relatório HTML
- Aviso de segurança para elétrico/pressão
- OCR fallback para PDFs
- Integração Z-API (recebimento)
- Envio de mensagens Z-API (serviço pronto)
- Estrutura Pró-Ação (proposals, alerts, rules, rotas)
- Módulo de diagnóstico (backend + frontend)
- DocumentContext (política Impetus, POPs, empresa)
