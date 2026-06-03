# COGNITIVE_OBSERVABILITY_REPORT

**Data:** 2026-06-03  
**Âmbito:** Observabilidade cognitiva pós-activação Truth (Vertente)  
**Fonte:** PostgreSQL (`ai_hallucination_assessments`, `ai_interaction_traces`, `audit_logs`), flags `.env` efectivas via `dotenv` override

---

## 1. Flags runtime (efectivas no Node)

| Flag | Valor |
|------|--------|
| `IMPETUS_INDUSTRIAL_TRUTH_MODE` | `enforce` |
| `IMPETUS_HALLUCINATION_BLOCK` | `on` |
| `IMPETUS_C2_SYNTHETIC_EVENTS_WHEN_SPARSE` | `off` |
| `IMPETUS_VOICE_TRUTH_ORAL_ENFORCE` | `true` |
| `IMPETUS_COGNITIVE_SAFETY_ENABLED` | `true` |

> `pm2 env` pode mostrar valores antigos; o servidor lê `backend/.env` com `override: true` em `server.js`.

---

## 2. Métricas agregadas (snapshot 03/06/2026)

| Métrica | Valor | Nota |
|---------|-------|------|
| **Total respostas com trace (30d)** | **955** | `ai_interaction_traces` |
| **Traces com `industrial_truth` no output (30d)** | **202** (~21%) | Evidência de enforcement registado |
| **Traces sem metadado truth explícito (30d)** | **~753** | Inclui canais antigos, voz, rotas sem closure |
| **Avaliações hallucination (total)** | **255** | `ai_hallucination_assessments` |
| **Confiança média (hallucination)** | **0,807** | |
| **Fila revisão humana pendente** | **5** | `requires_human_review` |
| **Voice truth shadow (7d)** | **4** eventos | `audit_logs.action = voice_truth_shadow` |
| **Voice `would_replace` (7d)** | **4** (100% do volume 7d) | Correção oral activa quando `oral_enforce` |

---

## 3. Hallucination detection

| Campo | Estado |
|-------|--------|
| Modo (phase37 / serviço) | **enforce** |
| `block_enabled` | **true** |
| `review_threshold` | 0,55 |

**Interpretação:** detecção activa com bloqueio de entrega quando política aplica; não substitui prova de «0% inventado» em conversação (Etapa 7).

---

## 4. Voz (Anam) — observabilidade

| Indicador | Valor |
|-----------|--------|
| Shadow audits 7d | 4 |
| Taxa `would_replace` no período | 100% (amostra pequena) |
| Enforcement oral | **ON** (`IMPETUS_VOICE_TRUTH_ORAL_ENFORCE`) |

**Risco:** volume baixo de shadow — difícil estatística de 10% / 0% inventado; teste de campo CEO (15 min) continua obrigatório.

---

## 5. Lacunas de observabilidade (Etapa 6)

| Lacuna | Impacto |
|--------|---------|
| Tabela `ai_traces` não existe; usar `ai_interaction_traces` | Scripts phase37 podem reportar `traces_30d: null` |
| Sem dashboard automático deste relatório | Reexecutar query ou script dedicado |
| `unsupported_claim` não agregado em SQL único | Extrair de `audit_logs` / meta JSON por canal |
| Stress 100 perguntas | **Não** executado — fora deste snapshot |

---

## 6. Scripts de revalidação

```bash
cd /var/www/impetus-completa/backend
node -e "require('dotenv').config({path:'.env',override:true}); ['IMPETUS_INDUSTRIAL_TRUTH_MODE','IMPETUS_HALLUCINATION_BLOCK','IMPETUS_VOICE_TRUTH_ORAL_ENFORCE'].forEach(k=>console.log(k,process.env[k]))"
node scripts/gemini-readiness-audit.js
node scripts/industrial-truth-enforcement-smoke.js
node scripts/phase37-real-factory-audit.js
node scripts/empty-factory-certification-run.js
```

---

## 7. Conclusão (Etapa 6)

| Requisito plano | Atendido? |
|-----------------|-----------|
| Relatório de observabilidade | **Sim** (este documento) |
| Métricas evidência / fallback / unsupported | **Parcial** — hallucination + traces + voz 7d |
| Prova 0% inventado ao longo do tempo | **Não** — amostra insuficiente em voz; ~79% traces 30d sem `industrial_truth` explícito |

**Recomendação:** correr relatório semanal; após Fase 2 (Claude Panel + ManuIA), esperar subida da % traces com `industrial_truth`.

---

*Gerado a partir de queries read-only em produção. Não altera runtime.*
