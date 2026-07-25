# SEC-21A — Enterprise Production Go-Live Gate

**Fase:** SEC-21A  
**Modo:** 100% consultivo — **zero alteração runtime**  
**Feature flag:** `SECURITY_GO_LIVE_GATE=false` (default)

---

## Filosofia

| Fase | Papel |
|------|-------|
| **SEC-21** | Promove (gera pacote + flags alvo) |
| **SEC-21A** | **Decide** se Go-Live é permitido |

> O ambiente está realmente pronto para entrar em operação?

---

## Decisões possíveis

- `GO_LIVE_APPROVED`
- `GO_LIVE_APPROVED_WITH_REMARKS`
- `GO_LIVE_BLOCKED`
- `GO_LIVE_DENIED`

---

## Gate obrigatória (bloqueia Go-Live)

- Integrity < **0.95**
- PM2 unhealthy
- Nginx unhealthy
- Endpoint crítico indisponível
- Ficheiro crítico divergente (baseline)
- TLS inválido
- PostgreSQL indisponível
- Módulo FAILED
- NC crítica aberta
- Rollback SEC-21 indisponível

---

## POST_ACTIVATION_OBSERVATION + GO_LIVE_GUARD

| Fase | Duração | Intervalo | Modo |
|------|---------|-----------|------|
| 1 — Intensiva | **10 min** | 5 s | `GO_LIVE_GUARD` |
| 2 — Estabilização | **20 min** | 30 s | Alertas only |
| 3 — Contínua | — | SEC normal | SEC-01→20 |

Teste acelerado: `SEC21A_FAST_OBSERVATION=true` (10s + 20s)

**Durante GO_LIVE_GUARD:**
- Módulos SEC activos (se flags ON)
- CRITICAL → alerta Wellington/Gustavo
- **Sem** acção automática de bloqueio
- Degradação integridade → **FAILED** (intervenção humana)

---

## Endpoint

```
GET /api/audit/security-go-live-gate
```

---

## Comando

```bash
node backend/src/tests/audit/SEC_21A_PRODUCTION_GO_LIVE_GATE.test.js
```

---

## Sequência recomendada

1. SEC-20 certificado
2. SEC-21 teste (14/14)
3. **SEC-21A Go-Live Gate** ← autoridade final
4. `apply-sec21-activation.sh --apply` (só se APPROVED*)

---

## Restrições

- ❌ Não altera runtime, EG, ECO, Cognitive Core, Baseline
- ❌ Não activa flags
- ❌ Não reinicia PM2
- ❌ Não executa rollback
- ❌ Não modifica nginx/firewall/BD

---

*SEC-21A — gatekeeper técnico obrigatório antes de produção.*
