# Volume IX — Arquitetura da IA
## ICEB v1.0 · Como o IMPETUS pensa, decide e explica

---

## 9.1 Camadas do Conselho Cognitivo

```
Ingress → Policy → Compliance → Execution
```

**Orquestrador:** `ai/cognitiveOrchestrator.js`  
**Gateway unificado:** `unifiedOrchestrator.js` (se `IMPETUS_AI_GATEWAY_ENABLED=true`)  
**Classificação:** AB

---

## 9.2 Providers

| Provider | Serviço | Uso |
|----------|---------|-----|
| Gemini | `geminiService.js` | tier 1 council |
| Claude | `claudeService.js` | tier 2 council |
| GPT | `aiProviderService.js` | tier 3 fallback |
| Vertex | `vertexCentralOrchestrator.js` | enterprise opcional |

---

## 9.3 Grounding e segurança

| Componente | Função |
|------------|--------|
| `secureContextBuilder.js` | contexto tenant + structural |
| `promptFirewall` | deny patterns |
| `hallucinationDetectionService.js` | detecção pós-resposta |
| `cognitiveTruthClosureService.js` | fecho de verdade operacional |
| `structuralAIGovernanceService.js` | IA × Base Estrutural |
| `aiSecurityGateway` | rate limit / policy |

**Normativo (N):** toda resposta IA em domínio regulado deve citar fonte BD ou marcar incerteza.

---

## 9.4 Painéis IA

| Painel | Serviço | Endpoint típico |
|--------|---------|-----------------|
| Claude Panel | `claudePanelService` | dashboard panels |
| Smart Panel | `smartPanelCommandService` | comandos naturais |
| Chat | `chatAIService.consolidated.js` | `/api/chat` |
| ManuIA | `manutencao-ia` routes | diagnóstico |

Hidratação gráficos: `enrichPanelChartOutput` / `getPanelLineSeries` — **dados reais**, sem `Math.random()`.

---

## 9.5 Audiência cognitiva por cargo

`cognitiveAudienceResolver.js` → `cognitivePulseService.js`

Determina: `is_executive`, `is_hr`, domínios, agentes visíveis — **não** fallback executivo cego.

---

## 9.6 Motores IA (fichas)

Filtrar etapas **1–335** em `fichas/motores/` por: `cognitive`, `ai`, `orchestrator`, `chat`, `claude`, `decision`.

Endpoints IA: etapas **463–1060** (paths `/api/chat`, `/api/ai`, `/api/manutencao-ia`, etc.).

---

## 9.7 Estado roadmap (R)

- World Model unificado
- Twin cognitivo industrial + organizacional fundidos
- Eliminação de enrichment seeded em produção

Ver [Volume-10-ROADMAP-ENTERPRISE.md](./Volume-10-ROADMAP-ENTERPRISE.md).

---

*Volume IX · ICEB v1.0 · 2026-06-30*
