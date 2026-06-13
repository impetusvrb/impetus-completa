# AIOI_F49_ROADMAP_ALIGNMENT

**Fase:** AIOI-ORG-3 — F49 Certification Closure  
**Etapa:** 3 — Análise de Alinhamento com o Roadmap  
**Data:** 2026-06-10  
**Modo:** AUDIT ONLY · ADDITIVE ONLY

---

## 1. Pergunta Central

> **F49 continua obrigatório? Foi substituído? Tornou-se opcional? Ainda bloqueia partes do roadmap?**

---

## 2. Análise por Sub-track F49

### 2.1 F49-E — Truth Program Closure

| Pergunta | Resposta |
|----------|----------|
| Continua obrigatório? | **NÃO** — concluído |
| Foi substituído? | **N/A** — executado |
| Tornou-se opcional? | **N/A** |
| Ainda bloqueia roadmap? | **NÃO** |
| Estado | `TRUTH_PROGRAM_COMPLETE_WITH_EXTERNAL_DEPENDENCIES` |
| Documento | `INDUSTRIAL_TRUTH_PROGRAM_CLOSURE.md` |
| Completude ponderada | **~91%** |
| Pendências restantes | Chave Gemini (terceiro) · Anam áudio humano (validação manual) |

**Veredicto F49-E:** `DELIVERED` (com dependências externas documentadas, não bloqueadoras para P0/P1/P2)

---

### 2.2 F49-B — TRI-AI Gemini Certification

| Pergunta | Resposta |
|----------|----------|
| Continua obrigatório? | **SIM** — mas apenas para P3 features |
| Foi substituído? | **PARCIALMENTE** — OpenAI/Anthropic substituem para P0–P2 |
| Tornou-se opcional? | **OPCIONAL para P0/P1/P2** · **OBRIGATÓRIO para P3 IA rerank** |
| Ainda bloqueia roadmap? | **SIM** — bloqueia somente P3 |
| Estado | `TRI_AI_PENDING_EXTERNAL_DEPENDENCY` |
| Documento | `TRI_AI_CERTIFICATION_STATUS.md` |
| Bloqueador | `GEMINI_API_KEY` inválida / ausente |

**Veredicto F49-B:** `PENDING_EXTERNAL_DEPENDENCY` (não bloqueia P0/P1/P2; bloqueia P3)

---

## 3. Alinhamento F49 × Roadmap AIOI

| Fase Roadmap | Requer F49? | F49 necessário | Pode avançar? |
|--------------|-------------|----------------|---------------|
| **AIOI-P0** (IOE, adapters, queue) | **NÃO** | Nenhum | ✅ Sim — já autorizado |
| **AIOI-P1** (decision, execution, KPI) | **NÃO** | Nenhum | ✅ Sim — após P0 gate |
| **AIOI-P2** (workflow, governance) | **NÃO** | Nenhum | ✅ Sim — após P1 gate |
| **AIOI-P3** (IA rerank, weight versions) | **SIM** | Gemini UP + ≥10k IOE + Etapa 7 | ⛔ Bloqueado por F49-B |
| Truth Stage 7 (ORG-2) | **NÃO** | — | ✅ Certificado |
| Queue CEO ORG-1 | **NÃO** | — | ✅ Certificado |
| ManuIA visão → IOE automático | **SIM** (F49-B) | Gemini UP | ⏳ Aguarda chave |
| Narrativa LLM Gemini em classificação | **SIM** (F49-B) | Gemini UP | ⏳ Aguarda chave |

---

## 4. O que F49 bloqueia atualmente

| Feature bloqueada | Fase | Bloqueador | Desbloqueio |
|-------------------|------|------------|-------------|
| IA rerank fila CEO | P3 | `GEMINI_API_KEY` válida + ≥10k IOE/dia | Chave válida + volume de produção |
| `aioi_weight_versions` + admin | P3 | P3 outcomes + volume + Gemini | Pós-P1 execution |
| ManuIA analyze-frame → IOE | P1+ | `GEMINI_API_KEY` válida | Chave válida |
| Narrativa Gemini classificação IOE | P3 | Gemini UP | Chave válida |
| TRI-AI status `READY` | Certificação | `GEMINI_API_KEY` válida | Chave válida |

---

## 5. O que F49 **não** bloqueia

| Item | Evidência |
|------|-----------|
| Toda operação P0 AIOI | `AIOI_P0_AUTHORIZATION.md` — "F49 NÃO bloqueia P0" |
| Toda operação P1 e P2 AIOI | `AIOI_ARCHITECTURE_TARGET_IMPLEMENTATION_PLAN.md` — P1/P2 sem dependência F49 |
| Truth enforcement (F40–F47) | `AIOI_TRUTH_STAGE7_CERTIFICATION_CONTRACT.md` — ORG-2 PASS |
| Queue sovereignty CEO | `AIOI_QUEUE_PRECEDENCE_CONTRACT.md` — ORG-1 PASS |
| Chat / voz / council (OpenAI/Claude) | `INDUSTRIAL_TRUTH_PROGRAM_CLOSURE.md` |
| P8 Runtime Stack (foundation) | Já certificado independentemente |

---

## 6. F49 é obrigatório?

| Contexto | F49 obrigatório? |
|----------|-----------------|
| P0 IOE + queue + CEO bloco | **NÃO** |
| P1 decision + execution + KPI MES | **NÃO** |
| P2 workflow + learning | **NÃO** |
| P3 IA rerank + weight versions | **SIM** |
| ManuIA visão operacional | **SIM** |
| TRI-AI full certification | **SIM** |

---

## 7. F49 foi substituído?

| Sub-track | Substituição |
|-----------|--------------|
| F49-E Truth closure | **Executado** — não "substituído", mas concluído com OpenAI/Anthropic |
| F49-B Gemini cert | **Parcialmente substituído** para P0–P2 pelos modelos OpenAI+Claude UP |
| IA rerank | **Não substituído** — funcionalidade P3 que aguarda Gemini |
| Weight versions | **Não substituído** — funcionalidade P3 planejada |

---

## 8. Ações de desbloqueio F49-B

As seguintes ações são **externas ao código** e de responsabilidade de operações/IT:

1. Definir `GEMINI_API_KEY` válida (Google AI Studio) **ou** configurar Vertex ADC
2. `pm2 restart impetus-backend --update-env`
3. Executar `node scripts/gemini-readiness-audit.js` até `live_ping.ok=true`
4. Re-certificar `TRI_AI_CERTIFICATION_STATUS.md` com `google_vertex.status: up`
5. Após Gemini UP: ativar AIOI-P3 gradualmente (rerank + weight versions)

Estas ações **não requerem alterações de código** — o `geminiService.js` está production-grade.

---

## 9. Veredito de Alinhamento

| Classificação | Determinação |
|---------------|--------------|
| F49-E Truth Closure | `DELIVERED` |
| F49-B Gemini Cert | `PENDING_EXTERNAL_DEPENDENCY` — não bloqueia P0/P1/P2 |
| F49 impacto geral no roadmap atual | `PARTIAL_BLOCKER` — bloqueia P3, não bloqueia P0/P1/P2 |
| Roadmap AIOI P0–P2 desbloqueado | **SIM** |
| Roadmap AIOI P3 desbloqueado | **NÃO** |
| Ação necessária | Chave Gemini válida (ação IT externa) |

---

```
┌────────────────────────────────────────────────────────────────┐
│              F49 ROADMAP ALIGNMENT SUMMARY                     │
├────────────────────────────────────────────────────────────────┤
│  F49-E (Truth closure)     : DELIVERED ✅                      │
│  F49-B (Gemini cert)       : PENDING EXTERNAL DEPENDENCY ⏳    │
│  Bloqueia P0               : NÃO ✅                            │
│  Bloqueia P1               : NÃO ✅                            │
│  Bloqueia P2               : NÃO ✅                            │
│  Bloqueia P3 IA rerank     : SIM ⛔                            │
│  Desbloqueio               : GEMINI_API_KEY válida (IT)        │
│  Código Gemini             : production-grade, sem alterações  │
└────────────────────────────────────────────────────────────────┘
```

---

*AIOI_F49_ROADMAP_ALIGNMENT — Etapa 3 AIOI-ORG-3.*
