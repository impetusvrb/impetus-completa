# SEC-06 — Enterprise Security Response Orchestrator

**Fase:** SEC-06  
**Modo:** Respostas graduadas — zero acções destrutivas  
**Feature flag:** `SECURITY_RESPONSE_ORCHESTRATOR=false` (default)

---

## Propósito

Responder **"Qual é a resposta operacional mais segura e proporcional?"**

Consome SEC-05 (notificações) + SEC-02/03/04 read-only. Toda acção Assist é **reversível**.

---

## Níveis

| Nível | Nome | Comportamento |
|-------|------|---------------|
| 0 | **Observe** | Registo apenas |
| 1 | **Advise** | Recomendações ao operador (default inicial) |
| 2 | **Assist** | Acções reversíveis (snapshot, logs, SEC-02/03/04 imediato) |
| 3 | **Protect** | Plano apenas — **nunca auto-executar** |

---

## Activação

```bash
SECURITY_RESPONSE_ORCHESTRATOR=true
SECURITY_RESPONSE_DEFAULT_MODE=advise
SECURITY_RESPONSE_MAX_LEVEL=2
SECURITY_RESPONSE_PROTECT_ENABLED=false

pm2 restart impetus-backend --update-env
```

---

## Endpoints

```
GET /api/audit/security-response
GET /api/audit/security-response/history
```

---

## Protecção Adaptativa

Gera plano estruturado (modo protegido, MFA, dual approval) — **recomendações apenas**, implementação futura SEC-06R/SEC-08.
