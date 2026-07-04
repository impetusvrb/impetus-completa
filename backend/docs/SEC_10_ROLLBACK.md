# SEC-10 — Rollback

## Rollback imediato

```env
SECURITY_ACTIVE_DEFENSE=false
```

```bash
pm2 restart impetus-backend --update-env
```

Tempo: **< 2 minutos**

---

## Impacto

- SEC-01→09 **inalterados** — continuam operacionais
- Recomendações SEC-10 deixam de ser geradas
- Modo lógico reverte para `NORMAL` em novo boot
- Nenhuma acção de superfície revertida (SEC-10 nunca executou)

---

## Rollback parcial

Não aplicável — SEC-10 é módulo único. Desactivar flag desactiva toda a camada.

---

*Rollback independente da baseline SEC-08.*
