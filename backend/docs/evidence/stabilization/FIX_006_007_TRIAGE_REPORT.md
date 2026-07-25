# FIX-006/007 — Triage Report

**Data:** 2026-07-13  
**Missão:** STABILIZATION FIX-006/007 — NEXT FUNCTIONAL RISK TRIAGE  
**Fonte de verdade:** Matriz oficial de estabilização (não numeração heurística)

---

## FASE 1 — Identificação formal

### FIX-006

```
FIX_006_FINDING     = GET /health e /api/health lentos (>1s, até ~23s medido) por await de
                      voiceHealthProbe() + getAiIntegrationsHealth() quando allowHealthDetails(req)
                      é true (loopback / X-Health-Key)
FIX_006_PRIORITY    = P2 (risco operacional LB/monitoring timeout)
FIX_006_MODULE      = Backend — server.js / aiIntegrationsHealthService
FIX_006_FAILURE_CLASS = PERFORMANCE
FIX_006_USER_IMPACT = Health checks de load balancer, PM2 e observabilidade podem timeout;
                      falso negativo de disponibilidade do processo Node
```

| Campo | Valor |
|-------|-------|
| Arquivo(s) | `backend/src/server.js` L257-283, `aiIntegrationsHealthService.js` |
| Componente | Rotas `/health`, `/api/health` |
| Rota | `GET /health`, `GET /api/health` |
| API | Probes OpenAI, Anthropic, Vertex/Gemini, Akool + TTS OpenAI |
| Perfil afetado | Infra/ops (não RBAC de utilizador) |
| Evidência | STABILIZATION_AUDIT_001, PERFORMANCE_BASELINE_2026, PENDING_FIXES_ROADMAP |
| Comportamento atual (pré) | Loopback: 1–23s com payload integrations |
| Comportamento esperado | Liveness <200ms; probes em endpoint dedicado |

### FIX-007

```
FIX_007_FINDING     = Botão «Atualizar» do Dashboard Vivo parcialmente encoberto por overlay
                      cognitivo em viewport 1366×768 (CERT-01-1 / UX-015)
FIX_007_PRIORITY    = P2 (impacto UX baixo — acção ainda clicável)
FIX_007_MODULE      = Frontend — CentroComando / cognitivePresence / LiveDashboardUnifiedPanel
FIX_007_FAILURE_CLASS = RESPONSIVE_REGRESSION
FIX_007_USER_IMPACT = Dificuldade visual/acesso ao refresh do painel vivo em notebook compacto
```

| Campo | Valor |
|-------|-------|
| Arquivo(s) | `cognitivePresence.css`, `CentroComando.css`, `LiveDashboardUnifiedPanel.jsx` |
| Componente | Faixa cognitiva + `.live-dash-actions` |
| Rota | `/app` (CentroComando) |
| Perfil afetado | Liderança / perfis com Dashboard Vivo |
| Evidência | UX_REGRESSION_MATRIX UX-015, REG-013, CERT-01-1 |
| Comportamento atual | NOT_TESTED nesta missão — CSS parcial já presente (CERT-01.1) |
| Comportamento esperado | Botão Atualizar totalmente visível e clicável em 1366×768 |

---

## FASE 2 — Acoplamento

```
SAME_MODULE           = NO  (backend vs frontend dashboard)
SAME_COMPONENT_TREE   = NO
SAME_API_CONTRACT     = NO
SAME_STATE_FLOW       = NO
SAME_ROOT_CAUSE       = NO
SAME_BASELINE         = NO

FIX_006_007_COUPLED   = NO
```

**Decisão:** Executar **apenas FIX-006** nesta missão (P2 com risco operacional > FIX-007 UX parcial).

FIX-007 permanece:

```
DOCUMENTED = YES
PENDING    = YES
NOT_AUTO_FIXED = YES
```

---

## FASE 3 — Intenção arquitetural FIX-006

Documentação: `PERFORMANCE_BASELINE_2026.md` §2:

> Separar `/health` (liveness rápido) de `/health/integrations` (readiness completo).

```
ORIGINAL_INTENT_CONFIRMED = YES
```

---

## FASE 6 — False normal state

| Finding | FALSE_NORMAL_STATE_RISK |
|---------|-------------------------|
| FIX-006 | **TRUE** — processo vivo mas health check reporta lentidão/timeout como indisponível |
| FIX-007 | **FALSE** — colisão visual; botão permanece clicável |

---

## FASE 9 — Storage observation

```
DISK_USAGE              = 94%
DISK_AVAILABLE          ≈ 6.3G
DISK_VARIATION_EXPLAINED = PARTIAL
```

| Path | Tamanho | Nota |
|------|---------|------|
| `/var/log/journal` | ~993M | Rotação automática possível |
| `/var/crash` | ~412M | Apport — **não tocado** |
| `/root/.pm2/logs` | ~368M | Estável |
| `frontend/dist` | ~107M | In-place replace |
| `dist_backup_*` | 3×107M | **Não removidos** pela missão |

Sem limpeza executada. Sem alteração forense. Variação ~2.3G (SF-005/006) continua **parcialmente inexplicada** — hipótese journal/tmp, sem evidência timestamp correlacionada.

```
DISK_VARIATION_OBSERVATION_UPDATED = YES
```

---

## Decisão de execução

| Item | Valor |
|------|-------|
| Executado nesta missão | **FIX-006** |
| Adiado | **FIX-007** |
| Razão | Maior risco operacional; findings independentes |

---

*Relatório de triagem — FIX-007 aguarda missão dedicada com validação visual 1366×768.*
