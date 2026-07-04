# SEC-14 — Enterprise Adaptive Blocking Engine

**Módulo:** `backend/src/securityAdaptiveBlocking/`  
**Feature flag:** `SECURITY_ADAPTIVE_BLOCKING=false` (default)  
**Modo:** `SECURITY_BLOCKING_MODE=observe`  
**Tipo:** Recomendações only — **nenhum bloqueio executado**

---

## Missão

Primeira camada de **bloqueio adaptativo baseado em comportamento**, consumindo exclusivamente SEC-01→SEC-13:

1. Classificar comportamentos hostis (Behavior Engine)
2. Construir reputação interna por IP (Reputation Engine)
3. Gerar fingerprints técnicos (Fingerprint Engine)
4. Classificar IPs em estados de blacklist adaptativa (registro only)
5. Produzir **Blocking Recommendations** com `auto_execute: false`

---

## Princípio Enterprise

```
detecta → correlaciona → reputa → classifica → recomenda → [execução futura]
```

SEC-14 implementa até **recomenda**. A execução efectiva (nginx, firewall, rate limit) fica para fases posteriores após validação operacional SEC-13A.

---

## Flags

```env
SECURITY_ADAPTIVE_BLOCKING=false
SECURITY_BLOCKING_MODE=observe
SECURITY_BLOCKING_REQUIRE_APPROVAL=true
SECURITY_ADAPTIVE_BLOCKING_EVAL_MS=60000
```

Nunca activar automaticamente.

---

## Endpoint

```
GET /api/audit/security-adaptive-blocking
```

Somente leitura — requer `requireAuth` + `requireTenantAdminRole`.

---

## DTO

Schema: `adaptive_blocking_v1`

| Campo | Descrição |
|-------|-----------|
| `blockingStatus` | Estado agregado (NORMAL … BLOCK_CANDIDATE) |
| `reputationScore` | Média reputação IPs (0–100) |
| `behaviorScore` | Score comportamental agregado |
| `fingerprintConfidence` | Confiança média dos fingerprints |
| `recommendedAction` | Acção recomendada |
| `recommendationReason` | Justificativa baseada em evidências |
| `executionAllowed` | Sempre `false` nesta fase |
| `approvalRequired` | Sempre `true` por defeito |

---

## Proibições

- Bloquear IP · alterar nginx/firewall/SSH/PM2
- Rate limiting · captcha · challenge executado
- Alterar Event Governance · ECO · Enterprise Baseline
- Feeds externos de reputação · execução automática

---

## Teste

```bash
node backend/src/tests/securityAdaptiveBlocking/SEC_14_ADAPTIVE_BLOCKING.test.js
```

---

*Additive layer — preserva integralmente Enterprise Security v1 certificado (SEC-08) e SEC-01→SEC-13A.*
