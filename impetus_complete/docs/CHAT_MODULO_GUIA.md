# Módulo IMPETUS Chat - Guia Completo

## O que foi implementado

### ✅ Backend (`backend/chat-module/`)

- **Estrutura modular** isolada
- **Tabelas**: `chat_conversations`, `chat_conversation_participants`, `chat_messages`, `chat_message_reactions`
- **Socket.io**: tempo real (send_message, receive_message, typing, stop_typing, user_online, user_offline)
- **Conversas privadas e grupos**
- **Upload de arquivos** (imagem, vídeo, áudio, documento) via multer em `uploads/chat/`
- **Impetus IA** integrada:
  - Usuário especial `role: ai_system`, nome "Impetus IA"
  - Menção com `@ImpetusIA` dispara resposta automática
  - Ações: resumir, plano_acao, conflitos, atrasos, relatorio
  - Registro em `ai_audit_logs`

### ✅ Frontend (`frontend/src/chat-module/`)

- **ChatPage** estilo WhatsApp (dark mode industrial)
- **Rota isolada** `/chat` (sem Layout do sistema)
- **Socket.io** para mensagens em tempo real
- **Indicação "digitando..."**
- **Status online** (indicador verde/cinza)
- **Link no menu** (sidebar) para acessar o Chat

### ✅ PWA

- `chat-manifest.json` com start_url `/chat`
- `chat-sw.js` (service worker)
- Registro do SW ao abrir `/chat`
- Nome: **IMPETUS Chat**

---

## Como usar

### 1. Instalar dependências

```bash
# Backend
cd impetus_complete/backend
npm install

# Frontend
cd impetus_complete/frontend
npm install
```

### 2. Executar migrations

```bash
cd backend
npm run migrate
```

### 3. Iniciar backend e frontend

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

### 4. Acessar o Chat

- Pelo menu lateral: clique em **Chat** (ícone de envelope)
- Ou navegue diretamente para: `http://localhost:5173/chat`

---

## API

Base: `POST/GET /api/chat`

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /colaboradores | Lista colaboradores |
| GET | /conversations | Lista conversas |
| POST | /conversations | Cria conversa (private ou group) |
| GET | /conversations/:id/messages | Lista mensagens |
| POST | /conversations/:id/messages | Envia mensagem (multipart para arquivos) |
| POST | /conversations/:id/invoke-ai | Aciona IA manualmente |
| POST | /add-impetus-ia/:id | Adiciona Impetus IA ao grupo |

---

## Próximos passos (opcional)

- **Ícones PWA**: criar `icon-192.png` e `icon-512.png` em `frontend/public/`
- **Push notifications**: integrar com serviço (Firebase, OneSignal)
- **Upload de áudio gravado**: adicionar botão de gravar no frontend
- **Métricas**: tabelas para relatórios de engajamento
