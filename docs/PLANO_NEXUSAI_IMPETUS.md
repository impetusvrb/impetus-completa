# Plano de Integração NexusAI no Impetus Comunica IA

**Documento:** Arquitetura e plano de implementação  
**Versão:** 1.0  
**Data:** 2026-03-07  
**Escopo:** Avatar conversacional com IA em tempo real + cobrança por tokens unificada por empresa, sem alterar design nem funcionalidades existentes  

---

## 1. Contexto e Princípios

### Regra de ouro
Um único contador de tokens por empresa. O cliente vê só o total consumido e o valor a pagar. Nunca: custo real, margens, detalhe por API/serviço.

### Restrições absolutas
- **Não alterar** design, UX ou funcionalidades existentes do Impetus
- **Não modificar** fluxo de assinatura Asaas (mensalidade fixa já funciona)
- **Aditivo:** apenas novos módulos, tabelas, rotas e jobs
- **Stack Impetus:** PostgreSQL, React, Node.js/Express — manter compatibilidade

### Mapeamento NexusAI → Impetus

| NexusAI | Impetus |
|---------|---------|
| tenant_id | company_id |
| tenants | companies (+ subscriptions) |
| usuarios | users |
| MySQL | PostgreSQL |
| planos (starter, pro, enterprise) | plan_type (essencial, profissional, estratégico, enterprise) |
| vanilla HTML | React (novas páginas no padrão existente) |

---

## 2. Modelo de Negócio

| Cobrança | Situação atual | Ação |
|----------|----------------|------|
| Mensalidade fixa | ✅ Asaas assinatura recorrente | Manter |
| Tokens (voz, chat, avatar, IA) | ❌ Não cobrado | **Novo:** cobrança avulsa no dia 1, separada por empresa |

---

## 3. Stack Técnico (Já Existente no Impetus)

| Categoria | Tecnologia | Status |
|-----------|------------|--------|
| Backend | Node.js, Express, pg | ✅ |
| Auth | JWT, bcrypt, requireAuth | ✅ |
| Multi-tenant | company_id em req.user | ✅ |
| Assinatura | Asaas (webhook, subscriptions) | ✅ |
| Voz tempo real | OpenAI Realtime API (proxy WebSocket) | ✅ |
| Avatar lip sync | avatarLipsyncSocket, Wav2Lip | ✅ |
| TTS | voiceTtsService (Google/OpenAI), ElevenLabs | ✅ |
| D-ID | didAvatarApi.js (frontend) — backend /api/did pode estar em impetus_complete | ⚠️ Verificar |
| Pagamentos avulsos | Asaas API (payments) | ✅ Suporta |

---

## 4. Estrutura de Dados (PostgreSQL)

### 4.1 Tabela `token_usage` (equivalente uso_api)

```sql
-- Migration: token_usage_migration.sql
CREATE TABLE IF NOT EXISTS token_usage (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  servico    VARCHAR(50) NOT NULL,   -- controle interno: voz, chat, claude, avatar, tts, etc.
  quantidade DECIMAL(14,4) NOT NULL,
  unidade    VARCHAR(20) NOT NULL DEFAULT 'tokens',
  custo_real DECIMAL(12,6) NOT NULL, -- NUNCA expor ao cliente
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_quantidade_positiva CHECK (quantidade > 0)
);

CREATE INDEX IF NOT EXISTS idx_token_usage_company_created
  ON token_usage(company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_token_usage_company_mes
  ON token_usage(company_id, (date_trunc('month', created_at)));
```

### 4.2 Tabela `token_billing_plans` (preço por token por plano)

```sql
CREATE TABLE IF NOT EXISTS token_billing_plans (
  plan_type       VARCHAR(50) PRIMARY KEY,
  preco_token_brl DECIMAL(12,8) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

INSERT INTO token_billing_plans (plan_type, preco_token_brl) VALUES
  ('essencial',    0.00005),
  ('profissional', 0.00004),
  ('estratégico',  0.00003),
  ('enterprise',   0.00002)
ON CONFLICT (plan_type) DO NOTHING;
```

### 4.3 Tabela `token_invoices` (faturas de tokens geradas pelo cron)

```sql
CREATE TABLE IF NOT EXISTS token_invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  mes               SMALLINT NOT NULL,
  ano               SMALLINT NOT NULL,
  mensalidade_brl   DECIMAL(10,2) NOT NULL,
  tokens_totais     BIGINT NOT NULL DEFAULT 0,
  valor_tokens_brl  DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_cobrado_brl DECIMAL(10,2) NOT NULL,
  custo_real_brl   DECIMAL(10,2) NOT NULL, -- controle interno
  asaas_payment_id  VARCHAR(100),
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, mes, ano)
);
```

---

## 5. Serviço de Billing (`billingTokenService.js`)

### 5.1 Custo real por serviço (nunca expor ao cliente)

```javascript
const CUSTO_REAL_POR_SERVICO = {
  voz:      0.000060,  // OpenAI Realtime
  chat:     0.000025,  // GPT-4o
  claude:   0.000015,  // Claude Sonnet
  gemini:   0.000005,  // Gemini Pro
  avatar:   0.500000,  // D-ID por segundo de vídeo
  tts:      0.000180,  // ElevenLabs por caractere
  analise:  0.000015,  // Claude análise docs
  conteudo: 0.000015,  // Geração texto
  outro:    0.000010,
};
```

### 5.2 `registrarUso(companyId, userId, servico, quantidade, unidade = 'tokens')`

- Chamado em **todos** os pontos onde há consumo de IA/voz/avatar
- Insere em `token_usage`
- `custo_real` = (CUSTO_REAL_POR_SERVICO[servico] || 0.00001) * quantidade
- Fire-and-forget: não bloquear fluxo principal; usar `setImmediate` ou `.catch(() => {})`

### 5.3 `calcularFatura(companyId, ano, mes)`

- Busca `plan_type` da empresa (companies.plan_type)
- Busca `preco_token_brl` de token_billing_plans
- Soma `SUM(quantidade)` e `SUM(custo_real)` de token_usage (mesmo mês)
- Retorna: `{ totalTokens, valorTokens, totalFatura, custoReal, lucro }` — **custoReal e lucro nunca vão ao cliente**

---

## 6. Pontos de Integração `registrarUso`

| Serviço/Arquivo | Momento | servico | quantidade | unidade |
|-----------------|---------|---------|------------|---------|
| ai.js (chatCompletion, embedText) | Após resposta | chat / outro | usage.total_tokens | tokens |
| chatService.js | Após mensagem processada | chat | tokens | tokens |
| realtimeOpenaiProxy.js | Após sessão/reponse.audio.done | voz | usage.total_tokens | tokens |
| chatVoice.js (transcribe, tts) | Após TTS/STT | tts / outro | chars ou tokens | chars/tokens |
| voiceTtsService.js | Após geração áudio | tts | caracteres ou segundos | chars |
| D-ID backend (se existir) | Após createTalk/poll | avatar | segundos vídeo | segundos |
| diagnostic.js | Após generateDiagnosticReport | analise | tokens | tokens |
| smartSummary.js | Após resumo | conteudo | tokens | tokens |
| executiveMode.js | Após query | chat | tokens | tokens |
| equipmentResearchService (ManuIA) | Após researchEquipment | outro | tokens | tokens |

**Abordagem segura:** Criar wrapper `billingTokenService.registrarUsoSafe(companyId, userId, ...)` que nunca lança erro e ignora falhas (tabela inexistente, db indisponível).

---

## 7. Job `faturamento-mensal-tokens.js`

- **Cron:** Dia 1 de cada mês, 08:00 (node-cron: `0 8 1 * *`)
- Percorre `companies` com `active = true` e `subscription_status = 'active'`
- Para cada empresa:
  1. `calcularFatura(companyId, ano, mes)` — mês anterior
  2. Se `valorTokens < 1.00` → skip (evitar cobrança mínima)
  3. Cria cobrança avulsa no Asaas: `POST /payments` com `customer: asaas_customer_id`, `value: valorTokens`, `description: "Tokens consumidos — Mês/Ano"`
  4. Insere em `token_invoices`
- Erro em uma empresa não interrompe as demais (try/catch por empresa)

**Pré-requisito:** `subscriptions.asaas_customer_id` ou `companies` com referência ao customer Asaas (verificar schema atual).

---

## 8. Rota `GET /api/admin/custos`

- **Auth:** requireAuth + requireCompanyActive + role admin da empresa (ou equivalente)
- **Query:** ano, mes (default: mês corrente)
- **Regra:** Retorna apenas:
  - `totalTokens`
  - `valorTokens`
  - `mensalidade`
  - `totalFatura`
  - `diario` (array { dia, tokens } para gráfico)
- **Nunca retornar:** custo_real, detalhe por servico, margem, lucro

---

## 9. Painel de Custos (Frontend React)

- **Rota:** `/app/admin/custos` ou `/app/settings/custos` (conforme padrão de rotas)
- **Acesso:** Admin da empresa (já existe middleware/role)
- **UI:** Card com total tokens, valor a pagar, gráfico diário (reutilizar componentes de dashboard existentes)
- **API:** `GET /api/admin/custos?ano=2026&mes=3`

---

## 10. Webhook Asaas — Extensão

- Eventos existentes (PAYMENT_CONFIRMED, PAYMENT_OVERDUE, etc.) → **manter comportamento atual**
- Cobranças avulsas de tokens → Asaas envia PAYMENT_RECEIVED / PAYMENT_CONFIRMED
- Associar pelo `customer` (asaas_customer_id) → company_id
- Não alterar lógica de assinatura; cobrança de tokens é independente

---

## 11. Variáveis de Ambiente (Novas)

```env
# NexusAI / Token Billing
ENABLE_TOKEN_BILLING=true
TOKEN_BILLING_CRON_ENABLED=true
```

---

## 12. Ordem de Implementação

| Fase | Tarefa | Risco |
|------|--------|-------|
| 1 | Migration token_usage, token_billing_plans, token_invoices | Baixo |
| 2 | billingTokenService.js (registrarUso, calcularFatura, helpers) | Baixo |
| 3 | Rotas GET /api/admin/custos (backend) | Baixo |
| 4 | Integrar registrarUso nos serviços (ai.js, chat, voice, etc.) — um por vez | Médio |
| 5 | Job faturamento-mensal-tokens.js + registrar no PM2/ecosystem | Médio |
| 6 | Painel custos React (página + rota) | Baixo |
| 7 | Testes em staging (cron, cobrança, painel) | — |
| 8 | Deploy produção + monitoramento | — |

---

## 13. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| registrarUso falhar e quebrar fluxo | Usar registrarUsoSafe (try/catch, fire-and-forget) |
| Cron cobrar empresa indevidamente | Validar subscription_status, valor mínimo 1.00 |
| Cliente ver custo real | Nunca expor custo_real, servico em APIs de custos |
| Asaas payment avulso não vinculado | Usar customer = asaas_customer_id da empresa |

---

## 14. Checklist de Não-Regressão

- [ ] Assinatura recorrente Asaas continua funcionando
- [ ] Login, JWT, multi-tenant inalterados
- [ ] Chat, voz, avatar funcionam mesmo se token_usage falhar
- [ ] Dashboard e demais módulos inalterados
- [ ] Webhook Asaas processa eventos atuais

---

## 15. Resumo Executivo

| Item | Quantidade |
|------|------------|
| Novas tabelas | 3 |
| Novo serviço | 1 (billingTokenService) |
| Novo job | 1 (faturamento-mensal-tokens) |
| Nova rota | 1 (GET /api/admin/custos) |
| Novas páginas React | 1 (painel custos) |
| Arquivos a modificar | ~10 (integração registrarUso) |
| Design/funcionalidade existente alterada | 0 |

---

*Documento elaborado para avaliação de viabilidade. Implementação incremental com commits atômicos e testes em staging antes de produção.*
