# Sugestões: Opção A (só documentação) e Opção B (renomear)

**Objetivo:** Remover/renomear resíduos de Z-API/WhatsApp para refletir o canal atual (App Impetus).

---

## OPÇÃO A – Apenas documentação

Alterações **somente em arquivos .md**, sem mudar código ou banco.

### 1. `docs/ARQUITETURA_MENSAGENS.md`

| Linha | De | Para |
|-------|----|------|
| 10 | `\| **communications** \| Comunicação rastreada por empresa \| Z-API (WhatsApp), fluxo interno, multi-tenant \|` | `\| **communications** \| Comunicação rastreada por empresa \| App Impetus, fluxo interno, multi-tenant \|` |
| 29-32 | `- **Rota:** ... Z-API ... Z-API (WhatsApp Business)` | `- **Rota:** POST /api/app-impetus/messages (App Impetus) ou POST /api/communications (API interna)`<br>`- **Uso:** App Impetus, mensagens vinculadas a empresa` |
| 41-52 | Seção "Fluxo unificado (Z-API)" com diagrama WhatsApp→Z-API | `## 3. Fluxo unificado (App Impetus)` + diagrama `App Impetus → POST /api/app-impetus/messages` |
| 57-59 | "Z-API" nas regras de uso | Trocar por "App Impetus" |
| 66 | "fluxo Z-API" | "fluxo App Impetus" |

**Trecho exato a substituir (linhas 41-52):**

```markdown
## 3. Fluxo unificado (App Impetus)

**Canal atual:** App Impetus (Z-API/WhatsApp removido)

```
App Impetus → POST /api/app-impetus/messages
                        ↓
              Salva em communications
                        ↓
              processIncomingMessage(companyId, msg)
                        ↓
              Classifica → Tarefa / Diagnóstico / etc.
```
```

### 2. `docs/CHECKLIST_INICIAL.md`

| De | Para |
|----|------|
| `- **Webhook Z-API** – requer zapi_configurations preenchido e instanceId no payload` | `- **App Impetus** – canal de mensagens via POST /api/app-impetus/messages` |
| `\| Z-API sem config \| Webhook retorna "Instance not configured" \| Inserir em zapi_configurations \|` | `\| App Impetus offline \| Mensagens não chegam \| Verificar conectividade do App com o backend \|` |

### 3. `docs/DOCUMENTACAO_TECNICA_COMPLETA.md`

Adicionar no início (após o cabeçalho):

```markdown
> **Nota (Mar/2025):** O canal Z-API/WhatsApp foi removido. Canal atual: **App Impetus** (`POST /api/app-impetus/messages`, `appImpetusService`). Ver `REVISAO_POS_REMOCAO_ZAPI.md`.
```

Substituir as ocorrências de Z-API/WhatsApp nas tabelas de mapeamento, fluxos e troubleshooting conforme já listado no arquivo (fluxo, rotas, tabelas).

### 4. `docs/PROTECAO_CODIGO.md`

| Linha ~100 | De | Para |
|------------|----|------|
| `- Z-API (ZAPI_*)` | | `- App Impetus (variáveis de canal); ZAPI_* removido` |

### 5. `docs/SEGURANCA_ANTI_HACKER.md`

| Linha ~44, 49, 123, 140-141 | De | Para |
|-----------------------------|----|------|
| "Tokens Z-API" | | "Tokens (legado; Z-API removido)" |
| "zapi service" | | "serviço de mensagens" |
| Referências a `zapi.js`, criptografia Z-API | | Nota: "Criptografia usada para outros secrets; Z-API removido" |

### 6. `docs/PLANO_TPM_FORMULARIO.md`

| Linhas ~180, 209, 211, 240, 260 | De | Para |
|---------------------------------|----|------|
| "WhatsApp (via Z-API)" | | "App Impetus" |
| "zapi.processWebhook" | | "processamento de mensagem do App" |
| "Fase 3: Z-API e mensagens" | | "Fase 3: Mensagens (App Impetus)" |
| "Z-API integrada" | | "App Impetus integrado" |
| Coluna da tabela "Z-API" | | "App Impetus" |

### 7. `docs/PENDENCIAS_PARA_EXCELENCIA.md`

| Linhas ~62, 116 | De | Para |
|-----------------|----|------|
| "tokens Z-API" | | "tokens/secrets sensíveis" |
| "webhook Z-API" | | "fluxo de mensagens (App)" |

### 8. `docs/PLANO_MELHORIAS_SCAFFOLD.md`

| Linhas ~17, 54-61, 130, 152, 171-172 | De | Para |
|--------------------------------------|----|------|
| "Z-API" nas tabelas e descrições | | "App Impetus" |
| "zapi.sendTextMessage", "zapi.processWebhook" | | "appImpetusService" ou "canal de mensagens" |

### 9. `docs/PLANO_CORRECOES_VARREDURA.md`

| Linha ~62 | De | Para |
|------------|----|------|
| "GET `/whatsapp-contacts`" | | "GET `/admin/settings/whatsapp-contacts` (Contatos para Notificações TPM)" |

| Linha ~116 | De | Para |
|------------|----|------|
| "documentação Z-API" | | "documentação do canal (App Impetus)" |

### 10. `docs/FASE2_TRATAMENTO_ERROS.md`

| Linhas ~30, 74 | De | Para |
|----------------|----|------|
| "Z-API com Timeout" | | "Envio de mensagens com Timeout" |
| "zapi.js" | | "appImpetusService" |
| "Z-API" no AdminSettings | | "Comunicação" |

### 11. `docs/PLANO_CONCLUSAO.md`

Atualizar seções que referenciam Z-API, webhook Z-API e variáveis ZAPI_* para "App Impetus" ou "canal unificado".

---

## OPÇÃO B – Renomear (código + documentação)

Alterações em código, UI e, opcionalmente, banco. **Recomendação:** aplicar em fases para reduzir risco.

### Fase B1 – Baixo risco (comentários, labels, strings)

#### Backend – Comentários e strings

| Arquivo | Linha | De | Para |
|---------|-------|----|------|
| `backend/src/app.js` | 194 | `// Webhooks (Asaas, Genérico) - Z-API removido, substituído por App Impetus` | `// Webhooks (Asaas, Genérico). Canal mensagens: App Impetus` |
| `backend/src/routes/app_impetus.js` | 3 | `* Substitui Z-API:` | `* Canal de mensagens:` |
| `backend/src/services/appImpetusService.js` | 3 | `* Substitui Z-API/WhatsApp:` | `* Canal de mensagens:` |
| `backend/src/services/appImpetusService.js` | 55, 64 | "Z-API" em comentários | "App Impetus" |
| `backend/src/services/messagingAdapter.js` | 4 | `* Substitui zapi.sendTextMessage` | `* Envio via appImpetusService` |
| `backend/src/services/unifiedMessagingService.js` | 3, 16, 72 | "zapi", "WhatsApp/Z-API", "fluxo Z-API" | "App Impetus", "canal unificado" |
| `backend/src/services/appCommunicationService.js` | 3 | "substitui fluxo Z-API" | "processa mensagens do App" |
| `backend/src/routes/appCommunications.js` | 3 | "substitui webhook Z-API" | "recebe mensagens do App" |
| `backend/src/models/app_impetus_outbox_migration.sql` | 2, 36 | "substitui Z-API" | "mensagens para entrega via App" |
| `backend/src/models/app_communications_migration.sql` | 1, 19 | "substituição Z-API", "substitui zapi_sent_messages" | "comunicações do App", "notificações push" |

#### Frontend – Labels e comentários

| Arquivo | De | Para |
|---------|----|------|
| `frontend/src/pages/AppMobile.jsx` | `* Substitui canal WhatsApp/Z-API` | `* Canal de mensagens App Impetus` |
| `frontend/src/services/api.js` | `(substitui Z-API/WhatsApp)` | `(canal unificado)` |

#### AdminSettings – Labels (sem alterar IDs/APIs)

| Arquivo | De | Para |
|---------|----|------|
| `frontend/src/pages/AdminSettings.jsx` | `<Phone size={18} /> Contatos WhatsApp` | `<Phone size={18} /> Contatos para Notificações` |
| | `<h3>Contatos WhatsApp</h3>` | `<h3>Contatos para Notificações</h3>` |
| | `notify.success('Contato WhatsApp adicionado!...')` | `notify.success('Contato adicionado! A IA poderá usá-lo para notificações.')` |
| | `label="WhatsApp"` em notifConfig | `label="Notificações por app"` (ou manter se still usado) |

---

### Fase B2 – Médio risco (nomes de tab/rota/config)

**Atenção:** Alterar rotas ou chaves de config quebra integração. Fazer em uma única release e com migração de dados se necessário.

#### Tab e rota `whatsapp-contacts` → `notification-contacts`

Se quiser renomear a tab e a rota:

**1. Backend** `backend/src/routes/admin/settings.js`:
- Rotas: `/whatsapp-contacts` → `/notification-contacts`
- Chave em `config`: `whatsapp_contacts` → `notification_contacts`  
  - Exige migração: `UPDATE companies SET config = jsonb_set(config - 'whatsapp_contacts', '{notification_contacts}', config->'whatsapp_contacts') WHERE config ? 'whatsapp_contacts';`

**2. Frontend** `frontend/src/pages/AdminSettings.jsx`:
- `VALID_TABS`: `'whatsapp-contacts'` → `'notification-contacts'`
- `setActiveTab('notification-contacts')` onde aplicável
- `activeTab === 'notification-contacts'` onde aplicável

**3. API** `frontend/src/services/api.js`:
- `listWhatsappContacts` → `listNotificationContacts`
- URL: `/admin/settings/whatsapp-contacts` → `/admin/settings/notification-contacts`

**4. Backend** `backend/src/services/tpmNotifications.js`:
- Fallback: `config.whatsapp_contacts` → `config.notification_contacts` (após migração)

---

### Fase B3 – Alto risco (colunas e tabelas do banco)

**Não recomendado** sem migração cuidadosa e rollback planejado.

| Item | Renomear para | Migração necessária |
|------|---------------|---------------------|
| `users.whatsapp_number` | `users.contact_phone` ou `users.mobile_number` | `ALTER TABLE users ADD COLUMN contact_phone TEXT; UPDATE users SET contact_phone = whatsapp_number;` + atualizar todo o código + `ALTER DROP whatsapp_number` |
| `ai_outbound_audit.zapi_message_id` | `external_message_id` ou `outbox_message_id` | `ALTER TABLE ai_outbound_audit ADD COLUMN external_message_id TEXT; UPDATE ... SET external_message_id = zapi_message_id;` + ajustar `aiProactiveMessagingService.js` |
| Tabela `whatsapp_contacts` | `notification_contacts` | `CREATE TABLE notification_contacts AS SELECT * FROM whatsapp_contacts;` + migração de dados + alterar `tpmNotifications.js`, migrações, etc. |
| Tabela `zapi_configurations` | — | Manter para legado; não usar em fluxos novos. |

**Código que referencia `zapi_message_id`:**

```
backend/src/services/aiProactiveMessagingService.js, linhas ~149, ~179:
  SET success = true, sent_at = now(), zapi_message_id = $2
→
  SET success = true, sent_at = now(), external_message_id = $2
```

*(Exige migration que adicione `external_message_id` e migre dados antes de trocar o código.)*

---

## Resumo executivo

| Opção | Escopo | Risco | Esforço |
|-------|--------|-------|---------|
| **A** | Apenas docs em `docs/` | Muito baixo | Baixo (1–2 h) |
| **B1** | Comentários e labels | Baixo | Baixo |
| **B2** | Tab/rota/config `whatsapp-contacts` | Médio | Médio (migração de config) |
| **B3** | Colunas/tabelas do banco | Alto | Alto (migração DB + testes) |

**Sugestão:** aplicar **Opção A** completa e **Fase B1** da Opção B. Fases B2 e B3 apenas se houver demanda de negócio ou conformidade para eliminar termos "WhatsApp/Z-API" no esquema e na configuração.
