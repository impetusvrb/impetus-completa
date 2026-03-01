# Plano de Integração Z-API – Rastreamento Completo e Seguro

**Objetivo:** Tornar a integração Z-API extremamente eficaz para captar e rastrear toda comunicação, com IA interativa tendo acesso às comunicações entre usuários cadastrados, garantindo eficiência, rastreabilidade, dados precisos e conformidade LGPD.

---

## 1. Princípios de Design

| Princípio | Implementação |
|-----------|----------------|
| **Rastreabilidade total** | Toda mensagem (entrada e saída) em `communications` com metadados de auditoria |
| **Identificação precisa** | `sender_id` vinculado a `users` quando telefone corresponder; `sender_name` sempre preenchido |
| **Visibilidade hierárquica** | Comunicações WhatsApp visíveis conforme escopo (CEO vê tudo; gerentes/coordenadores veem comunicação da empresa) |
| **Contexto para IA** | Serviço dedicado injeta comunicações relevantes no prompt do chat |
| **LGPD** | Whitelist configurável, aviso no primeiro contato, registro de operações |
| **Segurança** | Apenas números autorizados (usuários/whatsapp_contacts) quando modo restrito ativado |

---

## 2. Arquitetura Implementada

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WEBHOOK Z-API                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. Resolução de remetente: phone → users/whatsapp_contacts → sender_id  │
│ 2. Extração sender_name (payload Z-API ou fallback telefone)             │
│ 3. (Opcional) Verificação whitelist antes de processar                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ communications (direction='inbound')                                     │
│ + sender_id, sender_name, sender_phone, text_content, ai_classification  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Respostas (CEO, TPM, OrgAI, IA) → sendAutoReply                         │
│                    ↓                                                    │
│ communications (direction='outbound') + zapi_sent_messages               │
│ conversation_thread_id liga entrada ↔ saída                             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ communicationContextService → comunicações recentes por empresa/usuário  │
│ chatUserContext integra → IA recebe contexto de comunicações            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Alterações de Banco de Dados

### 3.1 Colunas em `communications`

- `direction` TEXT: 'inbound' | 'outbound' (default 'inbound')
- `conversation_thread_id` UUID: agrupa mensagens da mesma conversa
- `related_communication_id` UUID: resposta em que esta mensagem responde (para encadeamento)

### 3.2 Tabela `whatsapp_first_contact` (LGPD)

- `company_id`, `phone`, `notice_sent_at`, `notice_version`
- Garante aviso de privacidade enviado no primeiro contato

---

## 4. Fluxo de Dados

### 4.1 Mensagem Recebida (inbound)

1. Extrair `sender` (phone/jid), `senderName` (body.message?.senderName, body.senderName, etc.)
2. Normalizar phone (apenas dígitos, últimos 11)
3. Buscar `userId` em users WHERE (whatsapp_number, phone) normalizado = sender
4. Buscar em whatsapp_contacts (companies.config)
5. `sender_name` = senderName || users.name || phone
6. Se WHITELIST_STRICT: rejeitar silenciosamente se não autorizado
7. INSERT communications (direction='inbound', sender_id, sender_name, sender_phone, ...)
8. Gerar `conversation_thread_id` = id da primeira comunicação com esse phone na empresa (ou novo UUID)
9. Processar (CEO, TPM, OrgAI, IA)

### 4.2 Mensagem Enviada (outbound)

1. Após `sendTextMessage`/`sendAutoReply` com sucesso
2. INSERT communications (direction='outbound', recipient_id implícito pelo phone, conversation_thread_id, related_communication_id quando for resposta)
3. Manter zapi_sent_messages para compatibilidade

---

## 5. Filtro Hierárquico Ajustado

**Regra:** Comunicações com `source='whatsapp'` são tratadas como comunicação da empresa.

- **CEO/Diretor (isFullAccess):** vê todas
- **Gerente/Coordenador:** vê todas da empresa (source='whatsapp' OU sender_id/recipient_id no escopo)
- **Supervisor/Colaborador:** vê comunicações onde sender_id ou recipient_id está no escopo OU source='whatsapp' com sender vinculado ao departamento

Simplificação para garantir visibilidade: **qualquer comunicação com source='whatsapp' é visível para hierarchy_level <= 2** (gerente+). Colaborador continua vendo apenas as suas (sender_id = self).

---

## 6. Serviço de Contexto para IA

`communicationContextService.getRelevantCommunications(userId, companyId, options)`

- Retorna últimas N comunicações (inbound+outbound) da empresa, ordenadas por data
- Filtrado por escopo hierárquico
- Formato: `{ role: 'user'|'assistant', content, sender_name, created_at }`
- Usado por `chatUserContext` para injetar no prompt: "Comunicações recentes da empresa: ..."

---

## 7. LGPD

1. **Aviso primeiro contato:** Ao primeiro número desconhecido, enviar mensagem automática com link para política de privacidade e opção de opt-out
2. **Registro:** `whatsapp_first_contact` com timestamp e versão do aviso
3. **Whitelist (opcional):** `WHITELIST_STRICT=true` → só processa números em users ou whatsapp_contacts
4. **Auditoria:** `logDataAccess` em acessos a comunicações; `audit_logs` já existente

---

## 8. Variáveis de Ambiente

```env
# Modo restrito: apenas usuários/whatsapp_contacts podem interagir
WHITELIST_STRICT=false

# Enviar aviso LGPD no primeiro contato
WHATSAPP_LGPD_NOTICE_ENABLED=true

# Mensagem customizável para o aviso de privacidade (primeiro contato)
# WHATSAPP_LGPD_FIRST_CONTACT_MSG=Olá! Este canal... [personalize]
```

---

## 9. Arquivos Modificados/Criados

| Arquivo | Ação |
|---------|------|
| `models/zapi_communications_enhancement_migration.sql` | Novo – direction, conversation_thread_id |
| `services/zapiCommunicationResolver.js` | Novo – resolução sender_id, sender_name |
| `services/communicationContextService.js` | Novo – contexto para IA |
| `services/zapi.js` | Modificar – processWebhook (sender_name, sender_id, thread), sendTextMessage (INSERT outbound) |
| `middleware/hierarchicalFilter.js` | Modificar – buildCommunicationsFilter incluir WhatsApp |
| `services/chatUserContext.js` | Modificar – adicionar bloco de comunicações |
| `routes/dashboard.js` | Verificar recent-interactions (fallback sender_name) |

---

*Plano aprovado para implementação.*
