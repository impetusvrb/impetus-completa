# Correlation Certification Report (Fase 43-J)

**Script:** `backend/scripts/phase43-correlation-certification.js`  
**Resultado:** 2026-06-01 — **11/11 PASS**

---

## Suíte CO

| ID | Teste | PASS |
|----|-------|------|
| CO-01 | Temperatura-vibração | ✓ |
| CO-02 | Corrente-rpm | ✓ |
| CO-03 | Sem correlação | ✓ |
| CO-04 | Tenant vazio | ✓ |
| CO-05 | PLC sem MES | ✓ |
| CO-06 | Evidence binding | ✓ |
| CO-07 | Interaction score | ✓ |
| CO-08 | Truth / evidence model | ✓ |
| CO-09 | Bloqueio causalidade | ✓ |
| CO-CHAT-01 | Chat | ✓ |
| CO-FEED-01 | Live feed | ✓ |

---

## Comando

```bash
cd backend && node scripts/phase43-correlation-certification.js
pm2 reload impetus-backend --update-env
```

---

## Nota piloto

Com telemetria estável (temperatura/vibração constantes), `correlation_count` pode ser 0 — comportamento esperado. O classificador e o truth layer estão certificados; correlações aparecem quando há variância co-temporal nos sinais.
