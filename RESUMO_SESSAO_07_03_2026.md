# Resumo da Sessão - 07/03/2026

## O que foi feito

### Chat Interno (IMPETUS Chat)
- Criado módulo completo de chat estilo WhatsApp
- Conversas privadas e grupos
- Comunicação em tempo real via Socket.io (WebSocket)
- IA @ImpetusIA integrada nas conversas (mencione @ImpetusIA para acionar)
- Upload de arquivos (imagens, vídeos, documentos, PDF)
- Badge de mensagens não lidas na sidebar
- Menu "Chat Interno" adicionado para todos os cargos

### PWA (App Instalável)
- Chat instalável como app no celular
- Ícone personalizado (logo Impetus)
- Acessa direto em `/chat` ao abrir
- Service worker configurado

### Ícone Personalizado
- Logo Impetus substituiu ícone de robô no chat
- Ícone no menu lateral do sistema também atualizado

### Configurações (/app/settings)
- Corrigido crash causado por referências ao Z-API removido
- Aba "Comunicação" substituiu aba "Z-API"
- Página voltou a funcionar normalmente

### Uploads
- Pasta `/var/www/impetus-completa/impetus_complete/uploads/chat/` criada
- Arquivos chegando ao servidor corretamente

---

## Pendente (aguardando domínio + HTTPS)

| Funcionalidade | Motivo do bloqueio |
|---|---|
| Gravação de áudio | Requer HTTPS (getUserMedia bloqueado em HTTP) |
| Notificações push no celular | Requer HTTPS (Service Worker Push API) |
| Preview de imagens/vídeos no chat | A implementar |

---

## Arquitetura do Chat

### Backend
- Tabelas: `chat_conversations`, `chat_messages`, `chat_participants`, `chat_reactions`, `chat_push_subscriptions`
- Serviços: `chatService.js`, `chatAIService.js`
- Rotas: `/api/chat/*`
- Socket: `src/socket/chatSocket.js`
- Uploads: `/uploads/chat/` (50MB por arquivo)

### Frontend
- Módulo isolado: `src/chat-module/`
- Página: `src/pages/ChatPage.jsx`
- Rota: `/chat`
- Componentes: `ChatApp`, `ConversationList`, `MessageArea`, `MessageInput`
- Hooks: `useChatSocket`, `useMessages`
- API: `chat-module/services/chatApi.js`

### IA no Chat
- Usuário especial ID: `00000000-0000-0000-0000-000000000001`
- Acionamento: digitar `@ImpetusIA` na mensagem
- Modelo: GPT-4o-mini
- Lê últimas 30 mensagens para contexto

---

## Caminhos importantes no servidor

```
/var/www/impetus-completa/impetus_complete/impetus_complete/
├── backend/
│   ├── src/socket/chatSocket.js
│   ├── src/routes/chat.js
│   ├── src/services/chatService.js
│   └── src/services/chatAIService.js
├── frontend/
│   ├── src/chat-module/
│   ├── src/pages/ChatPage.jsx
│   └── public/icons/chat-icon-192.png
└── uploads/chat/   ← arquivos enviados
```

---

## Quando tiver o domínio

1. Configurar nginx como reverse proxy com SSL (Let's Encrypt)
2. Implementar push notifications no celular
3. Habilitar gravação de áudio
4. Adicionar preview de imagens/vídeos no chat
