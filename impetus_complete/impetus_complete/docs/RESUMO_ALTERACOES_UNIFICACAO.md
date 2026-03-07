# Resumo das Alterações - Unificação App Impetus

**Data:** 2026-03-07  
**Objetivo:** Substituir Z-API/WhatsApp pelo App Impetus como canal de comunicação unificado.

---

## Arquivos Novos

| Arquivo | Descrição |
|---------|-----------|
| `backend/src/services/appImpetusService.js` | Serviço de comunicação unificado |
| `backend/src/routes/app_impetus.js` | Rotas POST /messages, GET /outbox, GET /status |
| `backend/src/models/app_impetus_outbox_migration.sql` | Tabela para mensagens pendentes |
| `backend/scripts/run-app-impetus-migration.js` | Script para rodar apenas esta migration |
| `docs/PLANO_UNIFICACAO_IMPETUS.md` | Plano completo da unificação |
| `docs/CHECKLIST_DEPLOY.md` | Checklist para deploy em produção |
| `docs/RESUMO_ALTERACOES_UNIFICACAO.md` | Este arquivo |

---

## Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `backend/src/app.js` | Rotas Z-API removidas; rotas App Impetus adicionadas |
| `backend/src/services/executiveMode.js` | zapi → appImpetusService |
| `backend/src/services/tpmNotifications.js` | zapi → appImpetusService |
| `backend/src/services/organizationalAI.js` | zapi → appImpetusService |
| `backend/src/services/subscriptionNotifications.js` | zapi → appImpetusService |
| `backend/src/services/aiProactiveMessagingService.js` | zapi → appImpetusService + logOutboundCommunication |
| `backend/src/services/tpmConversation.js` | tryStartFromOffer usa app_impetus_outbox |
| `backend/src/jobs/proactiveAI.js` | zapi → appImpetusService |
| `backend/src/routes/admin/settings.js` | Endpoints Z-API retornam stubs |
| `backend/scripts/run-all-migrations.js` | Migration app_impetus_outbox adicionada |
| `frontend/src/pages/AdminSettings.jsx` | Tab Z-API → Tab Comunicação (App Impetus) |
| `frontend/src/services/api.js` | appImpetus adicionado |

---

## Rotas Novas (Backend)

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/app-impetus/messages` | Recebe mensagem do App (usuário autenticado) |
| GET | `/api/app-impetus/outbox` | App busca mensagens pendentes para o usuário |
| GET | `/api/app-impetus/status` | Status do canal (sempre conectado) |

---

## Rotas Removidas

- `POST /api/webhook/zapi` (Z-API webhook)
- `GET/POST /api/zapi/*` (conectar, status, QR)
- `GET/POST /api/whatsapp/*` (conectar, status, QR)

---

## Tabela Nova

**app_impetus_outbox** – Mensagens para entrega via App Impetus (substitui envio via Z-API).

---

## Compatibilidade

- **Dados existentes:** Preservados (communications, users, companies, etc.)
- **Tabelas Z-API:** Mantidas para histórico (zapi_configurations, zapi_sent_messages)
- **Funcionalidades:** Modo Executivo, TPM, IA Org, tarefas, diagnósticos – inalteradas
