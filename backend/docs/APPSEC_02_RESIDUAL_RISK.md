# APPSEC-02 — Risco Residual

**Nível global:** medium  
**Após APPSEC-01 + validação APPSEC-02**

---

## Riscos operacionais (requerem acção humana)

| Risco | Impacto | Acção |
|-------|---------|-------|
| Backups `.env` no disco | Comprometimento total se host invadido | Remover + rotacionar segredos |
| Flags prod inseguras | Bypass licenciamento / debug leaks | Corrigir `.env` antes PM2 restart |
| npm audit High | Supply chain / CVE conhecidas | axios, ws, xlsx upgrade |

---

## Riscos arquitecturais (fora APPSEC-01)

| Risco | Notas |
|-------|-------|
| JWT em localStorage | XSS → account takeover; roadmap Etapa 2.5 |
| RLS só 2 tenants piloto | Bug SQL sem company_id amplificado |
| UUIDs piloto públicos | Reconnaissance low (RT-11) |
| Auth mount inconsistente | Novas rotas podem omitir requireAuth |

---

## Riscos eliminados (confirmados APPSEC-02)

- IDOR cross-tenant chat
- SSRF Time Clock / PLC REST
- Uploads sem validação MIME/magic
- ACL uploads deny-by-default
- Endpoints boot-metrics/aioi verbosos (política mínima)
- octet-stream bypass

---

## Recomendação

Proceder com **Red Team externo** após:

1. Remover backups `.env`
2. Corrigir flags produção
3. Reiniciar backend com APPSEC boot validator activo

Risco residual esperado após ops: **low**
