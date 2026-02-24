# Arquitetura de Mensagens – messages vs communications

## Visão geral

O IMPETUS utiliza **duas tabelas** para armazenar mensagens, com propósitos distintos:

| Tabela | Uso | Contexto |
|--------|-----|----------|
| **messages** | Webhook genérico | Twilio, Meta, ou qualquer provedor que envie para `/api/webhook` |
| **communications** | Comunicação rastreada por empresa | Z-API (WhatsApp), fluxo interno, multi-tenant |

---

## 1. Tabela `messages`

- **Rota:** `POST /api/webhook`
- **Payload normalizado:** `source`, `sender`, `text`, `metadata`
- **Uso:** Provedores genéricos de mensagem (webhook sem vínculo direto a empresa)
- **IA:** `processIncomingMessage` classifica, gera diagnóstico (falha_técnica) e cria tarefas automaticamente
- **Estrutura mínima:**
  - `source`: origem (whatsapp, sms, etc.)
  - `sender`: identificador do remetente (telefone, id)
  - `text`: corpo da mensagem
  - `metadata`: JSON com payload original

---

## 2. Tabela `communications`

- **Rota:** `POST /api/webhook/zapi` (Z-API) ou `POST /api/communications` (API interna)
- **Campos principais:** `company_id`, `sender_phone`, `text_content`, `ai_classification`, `status`
- **Uso:** Z-API (WhatsApp Business), mensagens vinculadas a empresa
- **IA:** Classificação e ações automáticas (tarefa, diagnóstico) via `processIncomingMessage` após gravação
- **Diferenças em relação a `messages`:**
  - Multi-tenant (`company_id`)
  - Classificação IA (`ai_classification`, `ai_priority`, `ai_sentiment`)
  - Fluxo de status (received, processed, routed, resolved)
  - Rastreabilidade LGPD

---

## 3. Fluxo unificado (Z-API)

```
WhatsApp → Z-API → POST /api/webhook/zapi
                        ↓
              Salva em communications
                        ↓
              processIncomingMessage(companyId, msg)
                        ↓
              Classifica → Tarefa / Diagnóstico / etc.
```

---

## 4. Quando usar cada tabela

- **messages:** Webhook genérico sem `company_id` ou quando o provedor não é Z-API
- **communications:** Z-API ou qualquer fluxo que exija `company_id` e rastreabilidade por empresa

---

## 5. Manutenção

- A tabela `messages` pode ser usada para testes e integrações legadas.
- Para novas integrações com empresa definida, preferir `communications` e o fluxo Z-API.
