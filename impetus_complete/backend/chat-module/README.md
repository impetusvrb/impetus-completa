# IMPETUS Chat Module

Módulo completo de comunicação interna estilo WhatsApp, isolado para PWA.

## Estrutura

```
backend/chat-module/
├── index.js           # Ponto de entrada, mountRoutes, mountSocket
├── chatRoutes.js      # Rotas REST
├── chatService.js     # Lógica de negócio
├── chatAIService.js   # Integração Impetus IA (@ImpetusIA)
├── chatSocket.js      # Socket.io tempo real
├── chatBroadcast.js   # Broadcast para REST
├── chat_module_schema.sql
└── README.md
```

## Funcionalidades

- **Conversas privadas e grupos**
- **Mensagens**: texto, imagem, vídeo, áudio, documento
- **Socket.io**: send_message, receive_message, typing, stop_typing, user_online, user_offline
- **Impetus IA**: @ImpetusIA para resumir, plano de ação, etc.
- **Upload** via backend (multer) em uploads/chat/
- **Multi-tenant** (company_id)
- **RBAC** (reutiliza auth existente)

## API REST

Base: `/api/chat`

- GET /colaboradores
- GET /conversations
- POST /conversations (type: private | group)
- GET /conversations/:id
- GET /conversations/:id/messages
- POST /conversations/:id/messages (multipart para arquivos)
- POST /conversations/:id/invoke-ai
- POST /add-impetus-ia/:conversationId

## Socket.io

- Conexão com token JWT em `auth.token`
- Rooms: `conv_{conversationId}`
- Eventos: send_message, receive_message, typing, stop_typing, user_online, user_offline

## Migration

Executar junto com as outras:

```bash
npm run migrate
```

O schema está em `chat_module_schema.sql` e é executado automaticamente pelo run-all-migrations.
