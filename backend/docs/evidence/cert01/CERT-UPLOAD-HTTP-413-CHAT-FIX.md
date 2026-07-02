# CERT — UPLOAD-HTTP-413-CHAT-FIX

**Classe:** FIX (P0) | **Data:** 2026-06-23  
**Sintoma:** Chat Impetus — câmera/galeria OK; «Anexar Arquivo» → HTTP 413

---

## 1. Causa raiz

| Camada | Problema |
|--------|----------|
| **Nginx produção** | `client_max_body_size` ausente → default **1 MB** → 413 em PDFs/DOCX |
| **Backend** | Rota `POST /api/dashboard/chat/upload-file` **inexistente** (frontend chamava endpoint órfão) |
| **Frontend** | Imagem/galeria/câmera usam **base64 local** (sem upload imediato); ficheiro usa upload HTTP → exposto ao 413 |

OpenAI/IA não envolvidos.

---

## 2. Correções

| Ficheiro | Alteração |
|----------|-----------|
| `backend/src/config/uploadPolicy.js` | Limites e MIME canónicos |
| `backend/src/middleware/impetusUploadMiddleware.js` | Multer + erros 413/415 amigáveis |
| `backend/src/services/uploadObservabilityService.js` | Logs UPLOAD_* |
| `backend/src/routes/dashboard.js` | **POST /chat/upload-file** implementado |
| `backend/src/services/multimodalChatService.js` | txt/csv/xlsx/ppt/áudio |
| `frontend/src/services/uploadService.js` | Validação + `formatUploadError` |
| `frontend/src/features/aiChat/AIChatPage.jsx` | Usa uploadService |
| `/etc/nginx/sites-enabled/impetus` | `client_max_body_size 55m` |

---

## 3. Limites (relatório)

| Camada | Valor |
|--------|-------|
| Nginx | 55 MB |
| Chat Impetus upload-file | 15 MB |
| Chat interno `/api/chat/upload` | 50 MB |
| Registro Inteligente | 15 MB |
| bodyParser JSON | 20–50 MB |

---

## 4. Testes

```bash
cd backend && node src/tests/upload/uploadPolicyScenarios.js
```

---

## 5. Aceite

| Critério | Estado |
|----------|--------|
| Anexar arquivo (PDF/DOCX) | ✅ rota + nginx |
| Câmera / galeria | ✅ preservado |
| Mensagens 413 amigáveis | ✅ |
| Logs estruturados | ✅ |
| uploadService partilhado | ✅ |
