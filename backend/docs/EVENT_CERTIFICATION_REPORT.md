# Event Certification Report (Fase 44-K)

**Script:** `backend/scripts/phase44-event-certification.js`  
**Resultado:** 2026-06-01 — **12/12 PASS** (`certified: true`)  
**Tenants:** `CERT_REAL_COMPANY_ID` (PLC LAB-EQ-001) · `CERT_EMPTY_COMPANY_ID` (vazio)

---

## Suíte EV

| ID | Teste | Descrição |
|----|-------|-----------|
| EV-01 | Evento normal | `NORMAL_OPERATION` presente |
| EV-02 | Instabilidade observada | `SIGNAL_INSTABILITY` / atenção |
| EV-03 | Escalada de alarmes | `ALARM_ESCALATION` |
| EV-04 | Recuperação observada | `TELEMETRY_RECOVERY` |
| EV-05 | Tenant vazio | Pack vazio protegido |
| EV-06 | PLC sem MES | `telemetry_only` |
| EV-07 | Timeline operacional | Janelas 24h/7d/30d |
| EV-08 | Event confidence | 0–100 determinístico |
| EV-09 | Evidence binding | `event_supported_claim` |
| EV-10 | Truth enforcement | `buildOperationalEventEvidence` |
| EV-11 | Bloqueio de previsão | «vai falhar», «vai parar», etc. |
| EV-CHAT-01 | Chat eventos recentes | Pergunta «O que aconteceu recentemente…» |

---

## Comando

```bash
cd backend && node scripts/phase44-event-certification.js
pm2 reload impetus-backend --update-env
```

---

## Frases de bloqueio (EV-11)

`vai falhar` · `vai parar` · `quebra iminente` · `falha futura` → todas devem retornar `UNSUPPORTED_OPERATIONAL_CLAIM`.
