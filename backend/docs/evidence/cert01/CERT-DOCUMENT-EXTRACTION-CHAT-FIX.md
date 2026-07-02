# CERT — Extração documental no Chat IA (upload → contexto LLM)

**Data:** 2026-06-22  
**Tipo:** FIX (congelamento arquitetural)  
**Módulo:** IMPETUS Comunica IA / Chat multimodal  

## Incidente

Após correção do HTTP 413 no upload:

- Upload concluído com sucesso
- Mensagem `[Arquivo enviado]` no chat
- IA respondia: *"No momento eu não consigo extrair ou analisar diretamente o conteúdo de documentos anexados..."*

**Causa raiz:** o ficheiro era armazenado, mas o texto extraído não era injetado no contexto do LLM. Para PPTX/XLSX existia apenas placeholder estático; `mammoth` não estava declarado em `package.json`.

## Fluxo corrigido

```
Frontend (AIChatPage)
  → POST /api/dashboard/chat/upload-file
  → documentTextExtractorService.extractFromPath()
  → fileContext { extractedText, extractionOk, extractor }
  → POST /api/dashboard/chat-multimodal
  → multimodalChatService.buildDocumentSystemBlock()
  → system message com texto extraído
  → ai.chatWithVision() → GPT/Claude/Gemini
```

## Alterações

| Ficheiro | Alteração |
|----------|-----------|
| `backend/src/services/documentTextExtractorService.js` | Fonte única: PDF, DOCX, XLSX, PPTX, TXT, CSV, áudio |
| `backend/src/services/multimodalChatService.js` | Delegação ao extrator; bloco system dedicado; fail-fast se extração falhar |
| `backend/src/routes/dashboard.js` | 422 em extração falhada; validação no chat-multimodal |
| `backend/src/services/operational/documentOperationalRuntime.js` | Delega ao extrator unificado |
| `backend/src/services/intelligentRegistrationAttachments.js` | Mesmo extrator (PPTX/XLSX incluídos) |
| `frontend/src/features/aiChat/AIChatPage.jsx` | UX: erro de extração; contagem de caracteres extraídos |
| `backend/package.json` | `mammoth`, `xlsx`, `jszip` |

## Formatos suportados

| Extensão | Biblioteca |
|----------|------------|
| `.pdf` | pdf-parse |
| `.docx` / `.doc` | mammoth |
| `.xlsx` / `.xls` | xlsx |
| `.pptx` | jszip + parse XML `a:t` (slides + notas) |
| `.txt` / `.csv` / `.md` | utf8 |

## Logs de diagnóstico

- `[TEXT_EXTRACTED]` — chars, ext, extractor, ok
- `[DOCUMENT_CONTEXT_SENT]` — chars enviados ao LLM

## Teste de regressão

```bash
node backend/src/tests/upload/documentExtractionScenarios.js
```

## Critérios de aceite

- [x] Upload continua funcionando
- [x] Texto extraído injetado no system prompt
- [x] PPTX com extração real (não placeholder)
- [x] Falha de extração → mensagem técnica (sem IA genérica)
- [x] Pipeline único (sem duplicação)
- [x] Registro Inteligente reutiliza o mesmo extrator
