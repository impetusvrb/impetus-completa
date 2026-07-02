# Manual — Go-Live Enterprise

**Certificação:** CERT-ONPREM-VALIDATION-01 · **Liberação formal:** CERT-ENTERPRISE-GOLIVE-01

> **Documento canónico de liberação:** [`MANUAL-GOLIVE-ENTERPRISE.md`](./MANUAL-GOLIVE-ENTERPRISE.md)  
> **Checklist decisão:** [`CHECKLIST-GOLIVE.md`](./CHECKLIST-GOLIVE.md)  
> **Registro formal:** [`GO-LIVE-DECISION-RECORD.md`](./GO-LIVE-DECISION-RECORD.md)

---

## Pré-requisito absoluto

1. **STAGING-01** APROVADA  
2. **ROLLBACK-01** APROVADA (re-exec)  
3. **VALIDATION-01** **HOMOLOGADA** (re-exec)  
4. **GOLIVE-01** — 6 aprovações formais + checklist completo  

**Estado actual (2026-07-01): Go-Live PROIBIDO.**

Ver `CERT-ENTERPRISE-GOLIVE-01.md` e `CERT-ONPREM-VALIDATION-01.md`.

---

## Checklist Go-Live (operacional rápido)

Ver secções completas em `CHECKLIST-GOLIVE.md`. Resumo:

### Documentação entregue ao cliente

- [ ] `MANUAL-DOCKER.md` ou runbook PM2 (INFRA-01)  
- [ ] `MANUAL-LICENSING.md` + licença + `public.pem`  
- [ ] `MANUAL-BACKUP.md` / `MANUAL-RESTORE.md`  
- [ ] `MANUAL-ROLLBACK.md`  
- [ ] `HANDOFF-INFRASTRUCTURE.md` preenchido  
- [ ] Template `config/.env` (sem segredos internos IMPETUS)  

### Infraestrutura

- [ ] `IMPETUS_HOME=/opt/impetus` · user `impetus`  
- [ ] PostgreSQL backup automático  
- [ ] Nginx TLS válido  
- [ ] Firewall: 443 (+ 22 restrito)  

### Validação final

```bash
npm run enterprise:homologation -- --json
node scripts/enterprise/verify-enterprise.js
node scripts/enterprise/health-enterprise.js
npm run test:license-enterprise
```

---

## Referências

- `CERT-ENTERPRISE-GOLIVE-01.md`
- `MANUAL-GOLIVE-ENTERPRISE.md`
- `MANUAL-HOMOLOGACAO.md`
