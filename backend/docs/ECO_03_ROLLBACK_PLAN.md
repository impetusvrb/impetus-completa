# ECO-03 — Plano de Rollback

**Fase:** 3 · **Data:** 2026-07-02

---

## Princípio

Cada bypass possui **rollback independente**. Regressão num fluxo **não** reverte a fase inteira.

---

## Rollback por fluxo

| Fluxo | Flag | Acção | Impacto |
|-------|------|-------|---------|
| operationalActionExecutor | `ECO_OAE_VIA_EG=false` | PM2 restart `--update-env` | Volta shadow + legacy directo via adapter |
| operationalRealtimeCoordinator | `ECO_CHAT_VIA_EG=false` | PM2 restart | Idem |
| organizationalAI | `ECO_ORG_AI_VIA_EG=false` | PM2 restart | Idem + fallback appImpetus em erro |

### Procedimento

```bash
# 1. Desactivar flag afectada
sed -i 's/ECO_OAE_VIA_EG=true/ECO_OAE_VIA_EG=false/' backend/.env

# 2. Restart controlado
pm2 restart impetus-backend --update-env

# 3. Validar audit
curl -H "Authorization: Bearer $TOKEN" \
  https://HOST/api/audit/eco-convergence/status
```

---

## Quando registar NC

| Condição | Acção |
|----------|-------|
| Notificações falham com flag ON | Rollback flag + NC-ECO-03-NNN |
| Divergência shadow > 20% amostra | Manter OFF; investigar |
| Latência p95 > 2× baseline | Rollback flag afectada |
| Regressão funcional E2E | Rollback + bloquear activação seguinte |

---

## Backup pré-activação

Antes de activar cada flag:

```bash
cp backend/.env backend/.env.pre-eco03-FLAG-$(date +%s)
node scripts/eco/eco-03-baseline-snapshot.js
```

---

## Ordem de activação recomendada

1. `ECO_OAE_VIA_EG=true` — 7d estável
2. `ECO_CHAT_VIA_EG=true` — 7d estável
3. `ECO_ORG_AI_VIA_EG=true` — 7d estável

Nunca activar múltiplas flags no mesmo restart (disciplina PROMOTION-02).

---

## Rollback de código (extremo)

Se adapter defectuoso:

```bash
git revert <commit-eco-03>
pm2 restart impetus-backend --update-env
```

Event Governance v1 permanece intacto — rollback de código não afecta pipeline certificado.
