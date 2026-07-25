# APPSEC-01 — Upload Security

## Política canónica

- **Middleware:** `impetusUploadMiddleware.createUploadMiddleware`
- **Magic bytes:** `uploadSecurity.postUploadMagicValidator`
- **ACL leitura:** `uploadAclPolicy.userCanReadUploadStrict`

## Módulos migrados (Red Team)

| Rota | Module key | Groups |
|------|------------|--------|
| `POST /api/chat/upload` | `chat_internal` | image, document, audio, video |
| `PUT /api/chat/me/avatar` | `dashboard_chat_image` | image |
| `POST /api/manuals/upload` | `manuals_legacy` | document |

## MIME `application/octet-stream`

Só permitido se extensão estiver na whitelist (APPSEC-01).

## Diretórios ACL

- `chat/`, `chat-multimodal/`
- `registro-inteligente/`, `cadastrar-ia/`
- `manuals/`, `equipment-library/{tenant}/`
- `role-verification/`, `avatars/`, `technical-library/`

**Default:** deny — acesso só com registo BD correspondente.

## Quarentena (preparado)

`uploadSecurity.getQuarantineDir()` — escaneamento futuro.

## Auditoria

Eventos: `APPSEC_UPLOAD_SECURITY` (magic mismatch, rejected).
