# SEC-09 — Rollback Independente

Rollback por módulo — **não** requer desactivar todo o ecossistema.

---

## Procedimento geral

```bash
# 1. Restaurar flag específica
# SECURITY_<MODULE>=false

# 2. Restart
pm2 restart impetus-backend --update-env

# 3. Verificar
curl -s -H "Authorization: Bearer $TOKEN" \
  https://HOST/api/audit/security-promotion | jq '.promotion.summary'
```

Tempo máximo: **2 minutos** por rollback.

---

## Rollback por módulo

| Módulo | Acção | Impacto downstream |
|--------|-------|-------------------|
| SEC-07 SOC | `SECURITY_SOC=false` | Dashboard offline; detecção intacta |
| SEC-06 Response | `SECURITY_RESPONSE_ORCHESTRATOR=false` | Sem recomendações; incidentes intactos |
| SEC-05 Notification | `SECURITY_NOTIFICATION_CENTER=false` | Sem alertas; observação continua |
| SEC-04 Integrity | `SECURITY_RUNTIME_INTEGRITY=false` | Sem checks integridade |
| SEC-03 Threat Intel | `SECURITY_THREAT_INTELLIGENCE=false` | Sem perfis; correlação intacta |
| SEC-02 Correlation | `SECURITY_CORRELATION_ENGINE=false` | Sem incidentes novos; eventos SEC-01 intactos |
| SEC-01 Observatory | `SECURITY_OBSERVATORY=false` | Observação HTTP para |

---

## Rollback completo (emergência)

```bash
SECURITY_OBSERVATORY=false
SECURITY_CORRELATION_ENGINE=false
SECURITY_THREAT_INTELLIGENCE=false
SECURITY_RUNTIME_INTEGRITY=false
SECURITY_NOTIFICATION_CENTER=false
SECURITY_RESPONSE_ORCHESTRATOR=false
SECURITY_SOC=false
pm2 restart impetus-backend --update-env
```

Restaura estado shadow certificado SEC-08.

---

## Rollback SEC-06 degradado

Se SEC-06 activo com constraints incorrectos:

1. `SECURITY_RESPONSE_ORCHESTRATOR=false` imediato
2. Corrigir constraints no `.env`
3. Re-promover apenas após validação

---

## Restauro `.env`

```bash
cp backend/.env.pre-sec09-step-N-TIMESTAMP backend/.env
pm2 restart impetus-backend --update-env
```

---

*Rollback independente — equivalente PROMOTION-02 Event Governance.*
