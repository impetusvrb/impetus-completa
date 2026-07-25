# SEC-21 — Enterprise Production Security Activation

**Fase:** SEC-21  
**Modo:** Promoção operacional controlada — **sem novos mecanismos**  
**Feature flag:** `SECURITY_PRODUCTION_ACTIVATION=false` (default)

---

## Propósito

Transformar o ecossistema **certificado** (SEC-01→SEC-20) em **produção operacional**, preservando:

- auditoria pré-activação obrigatória
- snapshot oficial de rollback
- `auto_execute=false` em todas as acções ofensivas
- registo completo de evidências

**Não substitui SEC-09/SEC-13A** — consolida a promoção final pós-incidente real.

---

## Pré-requisitos

1. SEC-20 `CERTIFIED` ou `CERTIFIED WITH REMARKS`
2. `criteria.json` presente para BASELINE + SEC-01→19
3. HARDENING-01/02 aplicado
4. Dossiê INCIDENT-KNOWLEDGE-BASE-01 consolidado

---

## Pipeline

| Passo | Função |
|-------|--------|
| 1 | Pre-audit (SEC, baseline, EG, infra) |
| 2 | Snapshot pre-activation |
| 3 | Promoção flags + safe constraints |
| 4 | Re-init módulos SEC |
| 5 | Validação endpoints |
| 6 | Validação integração chain |
| 7 | Ataques simulados |
| 8 | Snapshot post-activation |

---

## Activação

```bash
node backend/src/tests/audit/SEC_21_PRODUCTION_ACTIVATION.test.js
```

Produção (após teste):

```bash
sudo ./scripts/security/apply-sec21-activation.sh --dry-run
sudo ./scripts/security/apply-sec21-activation.sh --apply
pm2 restart impetus-backend --update-env
```

---

## Endpoint

```
GET /api/audit/security-production-activation
```

---

## Rollback

```bash
# Restaurar env do snapshot
cp backend/docs/evidence/sec-21/rollback-env.snapshot.json  # referência
# Aplicar variáveis do pre-snapshot manualmente ou via script inverso
pm2 restart impetus-backend --update-env
```

---

## Restrições invariantes

`auto_execute=false` — nunca:

- Protect / Lockdown
- Kill/restart PM2 automático
- Firewall/nginx/SSH automático
- IP block automático
- Maintenance mode automático

---

*SEC-21 — transição certificado → operacional pós-incidentes reais.*
