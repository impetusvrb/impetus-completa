# Plano de Unificação: Impetus Comunica IA + App Impetus

**Objetivo:** Substituir Z-API/WhatsApp pelo App Impetus como canal único de comunicação, unificando software e app em um único produto com backend/frontend compartilhados.

**Registro INPI:** BR512025007048-9

---

## 1. Visão da Arquitetura Unificada

```
                    ┌─────────────────────────────────────────┐
                    │     IMPETUS COMUNICA IA (Unificado)      │
                    ├─────────────────────────────────────────┤
                    │  Backend (Node.js) - único               │
                    │  - /api/app-communications (receber)     │
                    │  - Socket.IO (real-time)                 │
                    │  - MediaProcessor (áudio/vídeo → texto)   │
                    │  - UnifiedMessaging (enviar)             │
                    ├─────────────────────────────────────────┤
                    │  Banco PostgreSQL - único                │
                    │  - communications (source: 'app')        │
                    │  - internal_chat_messages                │
                    │  - media_transcriptions                 │
                    ├─────────────────────────────────────────┤
                    │  Frontend (React + Vite) - único build    │
                    │  - Desktop: /app/* (dashboard completo)   │
                    │  - Mobile:  /m/* (chat simplificado PWA)  │
                    └─────────────────────────────────────────┘
```

---

## 2. Fluxos Migrados (Z-API → App)

| Antes (Z-API) | Depois (App Impetus) |
|---------------|----------------------|
| Webhook recebe msg WhatsApp | App envia via POST /api/app-communications |
| zapi.sendTextMessage(companyId, phone, msg) | unifiedMessaging.sendToUser(companyId, userId, msg) |
| Resposta automática via WhatsApp | Notificação in-app + Socket.IO push |
| processWebhook → ai → organizationalAI → tpm | processAppMessage → (mesmo pipeline) |
| Classificação em mensagens externas | Classificação em mensagens de usuários identificados |

---

## 3. Componentes a Criar

### 3.1 Backend

- **unifiedMessagingService.js** – Serviço único de envio (substitui zapi.sendTextMessage)
- **appCommunicationService.js** – Processa mensagens do app (espelho do processWebhook)
- **mediaProcessorService.js** – Transcrição de áudio (Whisper), interpretação de vídeo
- **appCommunications routes** – POST receber, GET histórico
- **Socket.IO** – Já existe no chat; estender para notificações push

### 3.2 Frontend Mobile (PWA)

- **/m** – Rota mobile (chat focado)
- **AppMobile.jsx** – Layout simplificado para celular
- **ChatMobile.jsx** – Envio de texto, áudio, vídeo
- **Media capture** – Input file (vídeo/áudio), MediaRecorder para gravação

### 3.3 Banco de Dados

- **app_communications_migration.sql** – Colunas: media_transcription, media_type
- **Integração internal_chat** com communications para relatórios unificados

---

## 4. Ordem de Implementação (Precisão Cirúrgica)

1. Criar mediaProcessorService (Whisper para áudio)
2. Criar appCommunicationService (processar mensagens app)
3. Criar unifiedMessagingService (enviar para app)
4. Criar rotas /api/app-communications
5. Migrar consumidores de zapi → unifiedMessaging
6. Criar frontend mobile PWA (/m)
7. Desabilitar Z-API (feature flag)
8. Remover código Z-API (após validação)

---

## 5. Pontos de Toque (Sem Quebrar Funcionalidades)

- **executiveMode.js** – Usa zapi.sendTextMessage → unifiedMessaging
- **organizationalAI.js** – Idem
- **tpmNotifications.js** – Idem
- **subscriptionNotifications.js** – Idem
- **aiProactiveMessagingService.js** – Idem
- **admin/settings.js** – Remover teste Z-API; adicionar status app
- **AdminSettings.jsx** – Trocar aba Z-API por status do App Impetus

---

## 6. IA para Mídia

- **Áudio:** OpenAI Whisper API → transcrição → texto → pipeline existente
- **Vídeo:** Extrair áudio (ffmpeg) ou frames → Whisper/Vision → texto
- **Melhoria de relatórios:** media_transcription enriquece ai_classification

---

## 7. Implementação Concluída

### Backend
- `mediaProcessorService.js` - Transcrição áudio (Whisper), interpretação IA
- `unifiedMessagingService.js` - Envio para usuários via Socket.IO
- `appCommunicationService.js` - Pipeline completo (TPM, OrgAI, IA)
- `messagingAdapter.js` - Ponto único (substitui zapi.sendTextMessage)
- `routes/appCommunications.js` - POST receber, GET listar
- Migração `app_communications_migration.sql`

### Frontend
- `AppMobile.jsx` - PWA em `/m` (texto, áudio, vídeo)
- `api.appCommunications` - send, list, getNotifications
- AdminSettings - Tab "App Impetus" como padrão

### Configuração
- `ZAPI_ENABLED=true` - mantém webhook e rotas Z-API (opcional)
- Sem a variável ou `ZAPI_ENABLED=false` - Z-API desabilitado
