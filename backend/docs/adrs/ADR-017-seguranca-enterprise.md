# ADR-017 — Segurança Enterprise

**Status:** Aceite  
**Data:** 2026-06-30  
**Certificação:** CERT-ONPREM-INFRA-01

---

## Contexto

Backend: Helmet, CORS fail-closed, rate limit, JWT, uploads ACL. Infra actual: root PM2, TLS nginx, secrets em `.env` plaintext.

---

## Problema

Definir postura segurança infra Enterprise sem alterar código auth.

---

## Decisão

| Controlo | Enterprise |
|----------|------------|
| User serviço | `impetus` dedicado |
| Secrets | `config/.env` 0600; rotação 90d |
| Network | 443 in; 4000/5432 localhost only |
| TLS | `certificates/` ou Let's Encrypt |
| CORS | Domínio único factory |
| Admin portal | Não exposto (nginx deny) |
| Backups | GPG encrypt off-site |
| Hardening | fail2ban, nginx rate limit, 55m body |

JWT localStorage preservado (decisão ARCHITECTURE — não reabrir nesta cert).

---

## Consequências

- DATA-01: script create user `impetus`
- Enterprise: `IMPETUS_ADMIN_JWT_SECRET` unset

---

## Alternativas descartadas

| Alternativa | Motivo |
|-------------|--------|
| mTLS interno obrigatório | Complexidade; loopback suficiente |
| Cookie httpOnly migration | Alteração código; fora scope |

---

## Referências

- `backend/src/config/security.js`
- `infra/nginx/impetus.conf`
