# F49-D — Gemini Readiness Audit

**Gerado:** 2026-06-14T20:59:37.323Z
**Modo:** READ ONLY · VALIDATION ONLY
**Veredicto:** `F49_GEMINI_OPERATIONAL_CERTIFIED`

---

## Resumo

```json
{
  "gemini_configured": true,
  "vertex_reachable": true,
  "credentials_valid": true,
  "live_ping_ok": true,
  "readiness_score": 83
}
```

## Configuração (F49-D.1)

| Campo | Valor |
|-------|-------|
| Modo credencial | google_ai_studio_api_key |
| Vertex mode | false |
| Cliente inicializável | true |
| Modelo | gemini-2.5-flash |
| GEMINI_API_KEY | definida |
| GOOGLE_GENAI_USE_VERTEXAI | false |
| GOOGLE_CLOUD_PROJECT | não definido |
| IMPETUS_GEMINI_INGRESS_ENABLED | true |

## Live Ping (F49-D.2)

```json
{
  "live_ping_ok": true,
  "response_received": true,
  "configured": true,
  "latency_ms": 1010,
  "model": "gemini-2.5-flash",
  "response_preview": "```json\n{\"ping\":true}\n```",
  "status": "up"
}
```

---

*F49-D.1/D.2 — auditoria read-only. Sem alteração de runtime.*
