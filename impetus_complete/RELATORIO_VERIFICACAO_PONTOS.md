# Relatório de Verificação – Pontos Críticos

**Data:** 11/03/2026  
**Status geral:** ✅ Sistema funcional com ressalvas

---

## 1. Claude (ANTHROPIC_API_KEY)

### Status: ⚠️ Não configurado

- **Verificação:** `.env` não contém `ANTHROPIC_API_KEY`
- **Health:** Retorna `"claude":"not_configured"`

### Impacto

| Recurso | Com Claude | Sem Claude (atual) |
|---------|------------|--------------------|
| Ingestão em memória operacional | Claude extrai fatos de chat/registros | Não grava fatos extraídos |
| Enriquecimento do contexto no chat | Resposta mais rica | Fallback: bloco simples (linhas 142–145 de `claudeService.js`) |
| Memória corporativa (casos de manutenção) | Eventos estruturados | Dados brutos não processados |
| Chat Impetus, Chat interno, Registro Inteligente | Ingestão em background | `ingestAsync` retorna cedo (claudeService retorna null) |

### Conclusão

O sistema continua funcionando: o chat usa OpenAI e há fallback quando Claude não está disponível. A memória operacional fica limitada sem Claude.

### Para ativar Claude

```
# Adicionar ao .env
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 2. Validação de licença

### Status: ✅ Desativada (correto para dev)

- **Verificação:** `LICENSE_VALIDATION_ENABLED=false` no `.env`
- **Comportamento:** `validateLicense()` retorna `{ valid: true, reason: 'validation_disabled' }`
- **Teste:** Rota `/api/companies/me` com token inválido retorna `AUTH_SESSION_INVALID` (não 403 de licença)

### Conclusão

Licença não bloqueia nenhuma ação no ambiente atual. Para produção, é necessário `LICENSE_VALIDATION_ENABLED=true`, `LICENSE_KEY` e servidor de licenças configurado.

---

## 3. Migrations puladas

### Migrations que falharam (e foram puladas)

| Migration | Motivo | Impacto |
|-----------|--------|---------|
| Schema completo | `idx_companies_active` já existe | ✅ Nenhum (estrutura existente) |
| Contatos TPM | `idx_whatsapp_contacts_company` já existe | ✅ Nenhum |
| Planos e instâncias | Constraint única incompatível | ⚠️ Tabela `plans` pode estar desatualizada |
| **Índice pgvector** | ~~ivfflat ausente~~ | ✅ **Resolvido** – extensão ativada, coluna vector(1536), índice ivfflat |
| Segurança Enterprise | ~~r.id ambíguo~~ | ✅ **Corrigido** – aliases renomeados |
| Identificação e ativação | ~~company_id ausente~~ | ✅ **Corrigido** – ADD COLUMN para compatibilidade |
| Base Estrutural Admin | `idx_company_roles_company` já existe | ✅ Nenhum |
| Chat interno | `idx_internal_chat_conversations_company` já existe | ✅ Nenhum |
| Manutenção operacional | `idx_maintenance_preventives_company` já existe | ✅ Nenhum |
| Memória operacional | `idx_operational_memory_company` já existe | ✅ Nenhum |

### pgvector – ✅ ATIVADO (11/03/2026)

- Extensão `vector` instalada
- Migração `pgvector_semantic_search_migration.sql`: coluna `embedding` como vector(1536), índice ivfflat
- Serviços atualizados: `manuals.js`, `documentContext.js`, `plcDataService.js` com formato correto

### Conclusão

Principais tabelas foram criadas. As falhas estão em índices duplicados (sem impacto) ou em extensões/configurações específicas (pgvector, RBAC). O sistema funciona; funcionalidades que dependem de pgvector ficam limitadas.

---

## 4. Z-API / WhatsApp

### Status: ✅ Removido corretamente

- **Rotas removidas:** `/api/zapi`, `/api/zapi_webhook`, `/api/whatsapp`
- **Serviços removidos:** `zapiService`, `zapiCommunicationResolver`, `zapiRateLimit`, `whatsappService`
- **Canal ativo:** App Impetus via:
  - `app_impetus.js` – mensagens do app
  - `appCommunications.js` – API de comunicações
  - `unifiedMessagingService.js` – envio para `app_notifications` + Socket.IO
  - `messagingAdapter.js` – abstração única para envio

### Referências restantes (apenas legado/compatibilidade)

- Migrations: `zapi_connect`, `zapi_communications_enhancement`, `whatsapp_plans_instances`, `whatsapp_contacts`
- Docs em `docs/_arquivo_zapi/`
- Menções em AdminSettings, CommunicationPanel (para histórico/legado)

### Conclusão

Z-API/WhatsApp foram removidos. Comunicação hoje usa apenas o App Impetus.

---

## Resumo executivo

| Ponto | Status | Bloqueia uso? |
|-------|--------|----------------|
| Claude | Não configurado | Não – há fallback |
| Licença | Desativada (dev) | Não |
| Migrations | 10 puladas, maioria sem impacto | Não – exceto pgvector e RBAC |
| Z-API | Removido | Não – App Impetus ativo |

**Conclusão:** O software está funcional para o fluxo principal. Para máxima capacidade: configurar Claude, habilitar pgvector e ajustar migrations com erros de código (Segurança Enterprise, Identificação).
