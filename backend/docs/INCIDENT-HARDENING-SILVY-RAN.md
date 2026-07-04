# INCIDENT HARDENING — Silvy X Ran (jul/2026)

> Redução contínua de risco — não existe "100% seguro". Este documento mapeia o
> prompt de hardening pós-incidente ao estado actual do ambiente IMPETUS.

**Incidente:** campanha de scanning automatizado (~151 paths: `.env`, credenciais
cloud, Docker, CLIs de cloud providers). Nenhum ficheiro real exposto (404/SPA),
mas lacunas de visibilidade confirmadas.

---

## Estado por bloco

| Bloco | Prioridade | Estado | Notas |
|-------|------------|--------|-------|
| **1 — Segredos** | Máxima | ⚠️ Parcial | `.gitignore` OK; `backend/.env` **644 root:root** — corrigir |
| **2 — nginx** | Alta | ✅ HARDENING-01 + **02 pendente deploy** | 403, log TLS, rate limit per-IP |
| **3 — WAF/Cloudflare** | Alta | ⚠️ Manual | `cloudflare-real-ip.conf` presente; validar Bot Fight + Full Strict |
| **4 — Firewall/SSH** | Alta | ⚠️ Parcial | UFW activo; SSH ainda `PasswordAuthentication yes` |
| **5 — Aplicação** | Média | ✅ Melhorado | `requestAccessLog`, rate limit, `sendSafeError` |
| **6 — CI/CD** | Média | ⚠️ Parcial | `.gitleaks.toml` adicionado; activar no GitHub |
| **7 — Monitoramento** | Média | 📋 Documentado | Alertas — configurar Slack/email |
| **8 — Verificação** | Contínua | ✅ Script | `scripts/security/audit-periodic.sh` |

---

## Bloco 1 — Acções imediatas (requer confirmação humana)

### Já verificado

```bash
./scripts/security/check-env-git-history.sh   # .env nunca commitado (neste repo)
grep -E "^\.env" .gitignore                   # múltiplas variantes ignoradas
```

### Pendente — executar com confirmação

```bash
# 1. Permissões (dry-run primeiro)
./scripts/security/harden-env-permissions.sh
IMPETUS_APP_USER=root ./scripts/security/harden-env-permissions.sh --apply

# 2. Rotacionar credenciais por precaução se alguma vez existiram em backup/commit
#    — AWS/GCP, DB, Stripe, SendGrid, JWT secret

# 3. Arquivar ou apagar backups .env em disco (lista em harden-env-permissions.sh)
#    backend/.env.bak*, .env.backup*, deploy_backups/

# 4. Produção: migrar para secrets manager ou EnvironmentFile 600 (systemd)
```

**Achado crítico:** `backend/.env` com modo **644** — legível por qualquer user local.

---

## Bloco 2 — nginx (repo actualizado, deploy pendente)

Artefactos:

| Ficheiro | Função |
|----------|--------|
| `infra/nginx/impetus-hardening-locations.conf` | 403 paths Silvy + dotfiles |
| `infra/nginx/impetus-log-format.conf` | `impetus_detailed` (TLS, XFF, rt) |
| `infra/nginx/impetus-production.conf` | rate limit 10r/s + access_log |
| `scripts/deploy-nginx-hardening.sh` | deploy + verify curl |

```bash
sudo ./scripts/deploy-nginx-hardening.sh
curl -I https://srv1422313.hstgr.cloud/.env   # esperado: 403
```

**Nota:** HARDENING-01 usava 404; HARDENING-02 passa a **403** conforme prompt.

---

## Bloco 3 — Cloudflare (manual)

- [ ] Bot Fight Mode
- [ ] SSL/TLS Full (strict)
- [ ] Firewall origem: só ranges Cloudflare no UFW (80/443)
- [ ] JA3/JA4 fingerprint (plano pago ou Enterprise)

---

## Bloco 4 — Firewall/SSH

**UFW actual:** 3000/4000 DENY; SSH restrito a ranges IMPETUS.

**SSH pendente** (após `authorized_keys` da equipa):

```bash
# /etc/ssh/sshd_config.d/99-impetus-hardening.conf
PermitRootLogin no
PasswordAuthentication no
```

**fail2ban:** instalar jails ssh + nginx (não automatizado neste repo).

**UFW logging:** confirmar `/var/log/ufw.log` existe após `ufw logging on`.

---

## Bloco 5 — Aplicação

| Item | Estado |
|------|--------|
| Log HTTP app | ✅ `middleware/requestAccessLog.js` (prod default ON) |
| Erros sem stack | ✅ `sendSafeError.js` |
| Rate limit API | ✅ `globalRateLimit.js` + nginx |
| JWT em secrets | ⚠️ verificar manualmente |
| `npm audit` CI | ⚠️ integrar pipeline |

Flag: `SECURITY_HTTP_ACCESS_LOG=true|false` (default: ON em production)

---

## Bloco 6 — CI/CD

- `.gitleaks.toml` — configurado
- Activar **GitHub secret scanning** no repositório remoto
- Pre-commit: `gitleaks protect --staged`

---

## Bloco 7 — Alertas (configurar externamente)

- Scan pattern: >50 403/404 mesmo IP / 5 min (nginx log → fail2ban ou Loki)
- SSH login IP desconhecido
- AWS billing alarm

---

## Bloco 8 — Verificação periódica

```bash
./scripts/security/audit-periodic.sh
./scripts/security/check-env-git-history.sh
curl -I https://SEUDOMINIO/.env   # 403
```

---

## Ordem de execução recomendada

1. **Bloco 1** — permissões `.env` + rotacionar credenciais se necessário  
2. **Bloco 2** — `deploy-nginx-hardening.sh`  
3. **Bloco 4** — SSH chave-only (após authorized_keys)  
4. **Bloco 3** — Cloudflare hardening  
5. **Blocos 5–8** — maturidade contínua  

---

*Documento gerado a partir do prompt pós-incidente Silvy X Ran — jul/2026.*
