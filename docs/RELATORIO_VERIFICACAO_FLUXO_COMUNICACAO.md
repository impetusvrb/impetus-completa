# Relatório de Verificação do Fluxo de Comunicação

**Data:** Março 2025  
**Objetivo:** Identificar erros e falhas no fluxo de comunicação do sistema.

---

## ✅ Correções Aplicadas

### 1. aiProactiveMessagingService.js – merge conflicts resolvidos
- **Problema:** Arquivo com conflitos de merge não resolvidos (`<<<<<<<`, `=======`, `>>>>>>>`).
- **Correção:** Conflitos resolvidos; uso de `appImpetusService` mantido para envio via outbox.
- **Impacto:** Mensagens proativas da IA passam a ser enviadas corretamente.

### 2. proactiveAI.js – query incompleta
- **Problema:** `SELECT whatsapp_number FROM users` não incluía `phone`, então usuários com apenas `phone` ficavam com número indefinido.
- **Correção:** `SELECT whatsapp_number, phone FROM users`.
- **Impacto:** Lembretes e alertas proativos passam a alcançar todos os destinatários elegíveis.

### 3. tpmNotifications.js – ajustes
- **Mensagem de log:** "WhatsApp falhou" alterada para "Envio falhou".
- **Indentação:** Ajuste de formatação no bloco `INSERT` em `alerts`.
- **Fallback config:** Já existente – contatos de `config.whatsapp_contacts` são usados quando a tabela `whatsapp_contacts` está vazia.

---

## Fluxo Verificado

### Entrada de mensagens
| Rota | Uso | Status |
|------|-----|--------|
| `POST /api/app-impetus/messages` | App envia mensagens (texto) | OK |
| `POST /api/app-communications` | App envia mensagens (texto, áudio, vídeo) | OK |

### Saída de mensagens
| Serviço | Destino | Status |
|---------|---------|--------|
| `appImpetusService.sendMessage` | `app_impetus_outbox` (App faz poll em GET /outbox) | OK |
| `unifiedMessaging.sendToUser` | `app_notifications` + Socket.IO (web) | OK |

### Consumidores do canal
| Serviço | Canal | Status |
|---------|-------|--------|
| tpmNotifications | appImpetusService | OK |
| executiveMode | appImpetusService | OK |
| organizationalAI | appImpetusService | OK |
| subscriptionNotifications | appImpetusService | OK |
| aiProactiveMessagingService | appImpetusService | OK |
| proactiveAI (job) | appImpetusService | OK |

---

## Pontos de Atenção

1. **app-impetus vs app-communications:** Há dois fluxos distintos:
   - `app-impetus`: texto, outbox polling.
   - `app-communications`: texto + mídia, usa `unifiedMessaging` para respostas (in-app/Socket.IO).

2. **Coluna `zapi_message_id`:** Mantida em `ai_outbound_audit` para compatibilidade; na prática guarda o ID da mensagem no outbox.

3. **Contatos TPM:** Ordem de busca: usuários → tabela `whatsapp_contacts` → `config.whatsapp_contacts`.
