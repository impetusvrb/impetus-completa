# SEC-09 — Runtime Promotion (Procedimento Operacional)

**Referência:** PROMOTION-02 (Event Governance)  
**Auto-activação:** **DESACTIVADA**

---

## Pré-requisitos

- [ ] SEC-08 certificado (`node backend/src/tests/audit/SEC_08_ENTERPRISE_SECURITY_CERTIFICATION.test.js`)
- [ ] Backup `.env` completo
- [ ] Janela de manutenção acordada
- [ ] Acesso PM2 + logs
- [ ] Operador com role `tenant_admin`

---

## Procedimento por etapa

### Template (repetir para cada SEC-0X)

```bash
# 1. Backup
cp backend/.env backend/.env.pre-sec09-step-N-$(date +%s)

# 2. Editar UMA flag (exemplo SEC-01)
# SECURITY_OBSERVATORY=true

# 3. Restart controlado
pm2 restart impetus-backend --update-env

# 4. Health (autenticado)
curl -s -H "Authorization: Bearer $TOKEN" \
  https://HOST/api/audit/security-observatory | jq .

# 5. Promotion dashboard
curl -s -H "Authorization: Bearer $TOKEN" \
  https://HOST/api/audit/security-promotion | jq .

# 6. Aguardar tempo mínimo (ver SEC_09_PROMOTION.md)
# 7. Registar evidência em backend/docs/evidence/sec-09/
```

---

## Sequência completa (7 etapas)

| # | Flag | Constraints adicionais | Observação min |
|---|------|------------------------|----------------|
| 1 | `SECURITY_OBSERVATORY=true` | — | 15 min |
| 2 | `SECURITY_CORRELATION_ENGINE=true` | — | 15 min |
| 3 | `SECURITY_THREAT_INTELLIGENCE=true` | — | 15 min |
| 4 | `SECURITY_RUNTIME_INTEGRITY=true` | — | 20 min |
| 5 | `SECURITY_NOTIFICATION_CENTER=true` | webhook opcional | 20 min |
| 6 | `SECURITY_RESPONSE_ORCHESTRATOR=true` | `DEFAULT_MODE=advise`, `MAX_LEVEL=1`, `PROTECT=false` | 30 min |
| 7 | `SECURITY_SOC=true` | requer SEC-01→06 estáveis | 15 min |

---

## SEC-06 — Configuração obrigatória fase 1

```env
SECURITY_RESPONSE_ORCHESTRATOR=true
SECURITY_RESPONSE_DEFAULT_MODE=advise
SECURITY_RESPONSE_MAX_LEVEL=1
SECURITY_RESPONSE_PROTECT_ENABLED=false
```

**Nunca** activar `SECURITY_RESPONSE_PROTECT_ENABLED=true` nesta fase.

---

## Validação pós-promoção

| Endpoint | Módulo |
|----------|--------|
| `GET /api/audit/security-observatory` | SEC-01 |
| `GET /api/audit/security-incidents` | SEC-02 |
| `GET /api/audit/security-threat-intelligence` | SEC-03 |
| `GET /api/audit/security-runtime-integrity` | SEC-04 |
| `GET /api/audit/security-notifications` | SEC-05 |
| `GET /api/audit/security-response` | SEC-06 |
| `GET /api/audit/security-soc` | SEC-07 |
| `GET /api/audit/security-promotion` | SEC-09 dashboard |
| `GET /api/audit/security-certification` | SEC-08 baseline |

---

## Flags proibidas

- `SECURITY_RESPONSE_PROTECT_ENABLED=true`
- Activar todas as flags num único restart
- Alterar código SEC-01→07 durante promoção

---

## Rollback

Ver [`SEC_09_ROLLBACK.md`](./SEC_09_ROLLBACK.md) — rollback independente por módulo (< 2 min).

---

*Execução manual apenas — SEC-09 não inclui script de auto-activação.*
