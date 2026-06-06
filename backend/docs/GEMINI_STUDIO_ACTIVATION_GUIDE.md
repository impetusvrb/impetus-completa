# GEMINI_STUDIO_ACTIVATION_GUIDE

**Fase:** 46.5-B / 46.5-C  
**Objetivo:** Ativar Gemini Studio no backend de produção sem alterar arquitetura.

## Modo recomendado

**Google AI Studio (sem Vertex nesta fase).**

Configuração alvo no `backend/.env`:

```env
GEMINI_API_KEY=<SECRET>
GOOGLE_GENAI_USE_VERTEXAI=false
GEMINI_MODEL=gemini-2.5-flash
```

Opcional (não necessário quando `GEMINI_API_KEY` já está definido):

```env
GOOGLE_API_KEY=
```

## Procedimento operacional

1. Editar `backend/.env` e garantir as três variáveis acima.
2. Recarregar processo PM2 com atualização de ambiente:
   - `pm2 restart impetus-backend --update-env` **ou**
   - `pm2 reload impetus-backend --update-env`
3. Confirmar carregamento no runtime:
   - `pm2 env 3` (ou `pm2 env impetus-backend`, conforme suporte local)
   - Verificar presença de `GEMINI_API_KEY`, `GOOGLE_GENAI_USE_VERTEXAI`, `GEMINI_MODEL`.
4. Executar readiness:
   - `cd /var/www/impetus-completa/backend`
   - `node scripts/gemini-readiness-audit.js`
5. Validar health:
   - `curl -s http://127.0.0.1:4000/health`

## Restart vs Reload (PM2)

- `restart`: encerra e inicia o processo novamente (mais simples e previsível para atualização de env).
- `reload`: tenta troca graciosa (mais útil em modo cluster; em fork pode se comportar próximo ao restart).
- Para este backend (`fork_mode`), **`restart --update-env` é a opção mais direta**.

## Critérios de sucesso

```json
{
  "gemini_available": true,
  "google_vertex.status": "up",
  "gemini_transport": "google_ai_studio"
}
```

E simultaneamente:

- OpenAI: ONLINE
- Anthropic: ONLINE
- Gemini: ONLINE
