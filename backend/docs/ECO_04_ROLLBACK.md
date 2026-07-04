# ECO-04 — Rollback Controller Consumer

**Fase:** 4 · **Data:** 2026-07-02

---

## Rollback independente

| Flag | Acção | Impacto ECO-03 |
|------|-------|----------------|
| `ECO_CONTROLLER_VIA_EG=false` | PM2 restart `--update-env` | **Nenhum** |

ECO-03 flags (`ECO_OAE_VIA_EG`, `ECO_CHAT_VIA_EG`, `ECO_ORG_AI_VIA_EG`) **não afectadas**.

---

## Procedimento

```bash
# 1. Desactivar consumer
sed -i 's/ECO_CONTROLLER_VIA_EG=true/ECO_CONTROLLER_VIA_EG=false/' backend/.env

# 2. Restart
pm2 restart impetus-backend --update-env

# 3. Validar
curl -H "Authorization: Bearer $TOKEN" \
  https://HOST/api/audit/eco-controller/status
# shadow_mode: true
```

---

## Quando rollback

| Condição | Acção |
|----------|-------|
| Council bloqueado incorrectamente (false deny) | Rollback imediato |
| Latência p95 > 2× baseline | Rollback + NC |
| Divergência shadow > 20% sustentada | Manter OFF; investigar |
| Regressão UX chat cognitivo | Rollback |

---

## Backup pré-activação

```bash
cp backend/.env backend/.env.pre-eco04-controller-$(date +%s)
node scripts/eco/eco-03-baseline-snapshot.js
```

---

## Rollback de código (extremo)

```bash
git revert <commit-eco-04>
pm2 restart impetus-backend --update-env
```

Event Governance v1 permanece intacto.

---

## Ordem recomendada (staging)

1. Validar ECO-03 shadow ≥ 85% (7d)
2. Activar `ECO_CONTROLLER_VIA_EG=true` (1 restart)
3. Monitorar 7d
4. Rollback isolado se regressão — **sem** reverter ECO-03
