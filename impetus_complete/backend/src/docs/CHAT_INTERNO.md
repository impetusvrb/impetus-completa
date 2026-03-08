# Chat Interno - Impetus Comunica IA

Módulo de comunicação interna tipo WhatsApp entre colaboradores.

## Conexão e Banco de Dados

O chat interno usa a **mesma conexão** do software Impetus:

| Arquivo | Função |
|---------|--------|
| `backend/src/db/index.js` | Pool PostgreSQL – variáveis `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` |

Variáveis no `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=impetus
DB_USER=postgres
DB_PASSWORD=***
```

## Tabelas do Chat Interno

- `internal_chat_conversations` – Conversas (1:1 por padrão)
- `internal_chat_messages` – Mensagens (texto, áudio, vídeo)
- `internal_chat_read_receipts` – Confirmação de leitura

## API Endpoints

Base: `/api/internal-chat` (requer autenticação + empresa ativa)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/colaboradores` | Lista colaboradores para iniciar conversa |
| GET | `/conversations` | Lista conversas do usuário |
| POST | `/conversations` | Cria conversa 1:1 (`body: { participant_id }`) |
| GET | `/conversations/:id/messages` | Lista mensagens (query: `limit`, `before_id`) |
| POST | `/conversations/:id/messages` | Envia mensagem (texto/áudio/vídeo) |
| POST | `/conversations/:id/read` | Marca mensagens como lidas |

## Colaboradores

Colaboradores vêm da tabela `users` (campo `role`) com filtro `company_id` e `active=true`.  
O endpoint `/api/admin/users` pode ser usado com filtro `role=colaborador` ou `hierarchy_level=5`.

## Mídia (Firebase Storage / AWS S3)

O app mobile deve:

1. Fazer upload do áudio/vídeo para Firebase Storage ou S3
2. Enviar a URL retornada no campo `media_url` ao criar a mensagem:

```json
POST /api/internal-chat/conversations/:id/messages
{
  "message_type": "audio",
  "media_url": "https://storage.googleapis.com/...",
  "media_filename": "audio.m4a",
  "media_duration_seconds": 15,
  "storage_provider": "firebase"
}
```

## Rastreabilidade

Todas as mensagens são salvas em `internal_chat_messages` com:

- `sender_id`, `created_at`
- `client_ip`, `source` (app/web)
- Soft delete (`deleted_at`) para auditoria
- Histórico de edição (`original_text_content`)
