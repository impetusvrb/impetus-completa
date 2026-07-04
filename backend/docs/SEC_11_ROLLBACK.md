# SEC-11 — Rollback

```env
SECURITY_ADAPTIVE_PROTECTION=false
```

```bash
pm2 restart impetus-backend --update-env
```

---

## Impacto

- SEC-01→10 **inalterados**
- Planos SEC-11 deixam de ser gerados
- Perfil lógico reverte para NORMAL no boot
- Nenhuma medida de superfície revertida (SEC-11 nunca executou)

---

## Rollback plan (automático no dashboard)

1. Desactivar SEC-11
2. Perfil NORMAL lógico
3. Restart PM2 (manual)
4. Verificar audit endpoints

---

*Independente da baseline SEC-08.*
