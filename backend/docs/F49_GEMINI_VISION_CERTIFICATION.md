# F49-D — Gemini Vision / ManuIA Certification

**Gerado:** 2026-06-14T20:59:37.323Z
**Veredicto visão:** `VISION_CERTIFIED`

---

## Resultado (F49-D.3)

```json
{
  "vision_available": true,
  "vision_response_received": true,
  "manuia_ok": true,
  "detection_structured": true,
  "latency_ms": 3236,
  "confidence_level": "inconclusivo"
}
```

## Rotas auditadas

- `POST /api/manutencao-ia/live-assistance/analyze-frame` — manuiaLiveAssistanceService.identifyPartFromImageWithGemini
- `POST /api/vision` — anthropic (ManuIA 3D multimodal — Anthropic (paralelo))

## Pipeline

`geminiService.analyzeImage → extractJsonFromText → ManuIA dossier path`

**Imagem real:** JPEG 1×1 mínimo enviado directamente à API Gemini via `analyzeImage`.
Sem mocks. Sem respostas simuladas.

---

*F49-D.3 — validação forense read-only.*
