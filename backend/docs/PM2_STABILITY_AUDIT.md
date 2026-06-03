# PM2_STABILITY_AUDIT — FASE 47-G

**Data:** 2026-06-03  
**Processo:** `impetus-backend` (id PM2 3)  
**Investigação:** READ ONLY

---

## Métricas observadas

| Métrica | Valor |
|---------|-------|
| **restarts (lifetime)** | **348** |
| **unstable restarts** | **0** |
| **status** | online |
| **created at (último arranque)** | 2026-06-03T14:51:43Z |
| **frontend created at** | ~mesmo período (deploy Truth 03/06) |

---

## Análise

### Frequência e período

- **348 restarts** é contador **acumulado** do processo PM2 (não só desde 03/06).
- Último deploy estável desde **14:51 UTC 03/06** (~6h+ online na auditoria Vertente).
- **unstable_restarts: 0** — PM2 não classifica crash loop recente.

### Causas prováveis (evidência logs `impetus-backend-error.log`)

| Padrão | Tipo | Crash? |
|--------|------|--------|
| `[IDENTITY_OBSERVABILITY] Cannot read properties of undefined (reading 'length')` | Bug runtime observability | Provável **não** (logged, processo continua) |
| `[RUNTIME_OPERATIONAL_CALIBRATION] rollout.toFixed is not a function` | Bug calibração rollout | Provável **não** |
| `[anam] persona skipGreeting PATCH 401 Invalid API key` | Credencial Anam inválida | **Não** |
| `[GEMINI] API key not valid` | Dependência externa | **Não** |

**Hipótese:** grande parte dos **348 restarts** históricos = deploys manuais, `pm2 restart`, OOM passado, ou crashes anteriores a correcções — **não** necessariamente 348 crash loops no dia.

### Serviços afectados

- **impetus-backend** — principal
- **impetus-frontend** — restarts separados (não quantificados neste audit)
- Edge/lab processes — independentes

---

## Classificação de risco operacional

# **MEDIUM**

| Nível | Justificação |
|-------|----------------|
| LOW | Descartado — 348 restarts lifetime assusta em demo CEO |
| **MEDIUM** | Processo online pós-deploy; erros recorrentes em log mas sem unstable_restarts |
| HIGH | Se restarts >10/dia **após** 03/06 sem deploy planeado |
| CRITICAL | Crash loop com downtime >5 min em horário de produção |

**Não CRITICAL hoje** com base em `status: online` + `unstable_restarts: 0`.

---

## Recomendações (fora FASE 47 — não executadas)

1. `pm2 logs impetus-backend --lines 500` após janela 24h — contar restarts novos.
2. Corrigir `IDENTITY_OBSERVABILITY` e `RUNTIME_OPERATIONAL_CALIBRATION` (bugs não-Truth).
3. Rotacionar/truncar error.log (1,2 MB).
4. Alertar se `restarts` incrementa >3/dia sem deploy.

---

*FASE 47-G — auditoria ops read-only.*
