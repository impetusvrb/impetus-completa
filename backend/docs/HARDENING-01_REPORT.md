# HARDENING-01 — Recuperação Pós-Incidente e Fechamento de Lacunas

**Data:** 2026-07-03  
**Referência forense:** FORENSICS-EXFILTRATION-01  
**Modo:** Implementação controlada (sem alterar Cognitive Core, EG, ECO, Enterprise Baseline congelados)

---

## Resumo executivo

| Parte | Estado | Resultado |
|-------|--------|-----------|
| 1 — Recuperação completa | ✅ | 56 ficheiros restaurados via Git; 0 em falta |
| 2 — Nginx hardening | ✅ | Config restaurada + anti-scanner activo |
| 3 — HTTP hardening | ✅ | Headers, dotfiles, source maps, MIME |
| 4 — SSH hardening | ✅ | Drop-in aplicado + banner |
| 5 — PM2 | ✅ | Script restart seguro + documentação |
| 6 — Integridade | ✅ | Baseline SHA256 + script periódico |
| 7 — Recuperação documental | ✅ | Blueprint Vol. 00–10 + ADRs + scripts audit |

---

## PARTE 1 — Recuperação completa

### Acção executada

```bash
git checkout HEAD -- $(git ls-files --deleted)
```

### Inventário pós-recuperação

| Categoria | Esperado | Restaurado | Em falta |
|-----------|----------|------------|----------|
| Blueprint Vol. 00–10 | 11 | 11 | 0 |
| Blueprint templates | 4 | 4 | 0 |
| Docs enterprise | 4+ | ✅ | 0 |
| IECP (CERT-04, checkpoint) | 2 | 2 | 0 |
| Scripts audit | 18 | 18 | 0 |
| Scripts ops | 5 | 5 | 0 |
| Workflows CI | 1 | 1 | 0 |
| Root scripts | 4 | 4 | 0 |
| `frontend/vite.config.js` | 1 | 1 | 0 |
| Submodule `lipsync/Wav2Lip` | 1 | presente | 0 |
| **Total Git deleted** | — | — | **0** |

### Ficheiros modificados localmente (não destruição)

Permanecem alterações `M` de trabalho em curso (Billing v4, inventários) — **não** relacionadas com perda do incidente. Repositório Git íntegro; HEAD `daf338657`.

---

## PARTE 2 — Nginx hardening

### Problema corrigido

Durante o incidente, `/etc/nginx/sites-available/impetus` foi **apagado** (symlink órfão). Scanners recebiam HTTP 200 com fallback SPA (~1020 bytes) para paths como `/server.js`, `/docker-compose.yml`.

### Implementação

| Artefacto | Path |
|-----------|------|
| Config produção | `infra/nginx/impetus-production.conf` |
| Regras anti-scanner | `infra/nginx/impetus-hardening-locations.conf` |
| Deploy script | `scripts/deploy-nginx-hardening.sh` |

### Verificação pós-deploy

| Request | Antes | Depois |
|---------|-------|--------|
| `GET /server.js` | 200 / 1020 bytes | **404** / 146 bytes |
| `GET /docker-compose.yml` | 200 / 1020 bytes | **404** / 146 bytes |
| `GET /` | 200 / 655 bytes | 200 / 655 bytes (SPA legítima) |

---

## PARTE 3 — HTTP hardening

### Nginx (aplicado)

- `server_tokens off`
- Headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Robots-Tag`
- Bloqueio dotfiles (`/.`, `/.git`)
- Bloqueio extensões sensíveis fora de `/assets/`
- Bloqueio `.map` (source maps)
- Rate limits: API 60r/m, auth 10r/m, static 100r/s
- SSL TLS via Let's Encrypt (cert válido até 2026-09-19)
- Redirect HTTP → HTTPS

### Express serveDist (defesa em profundidade)

`frontend/serveDist.cjs` — middleware HARDENING-01 devolve **404 text/plain** para paths de scanner antes do fallback SPA.

### UFW (já existente, documentado)

- Portas 3000/4000 bloqueadas ao público
- SSH/HTTP/HTTPS restritos aos IPs autorizados (170.246.0.0/16, 186.225.0.0/16 + IPv6)
- IPs de atacantes AWS bloqueados

### Lacunas futuras (Enterprise Security — não implementadas nesta fase)

- CORS audit formal no backend
- Fail2ban
- IDS / auto-lockdown
- Cloudflare-only UFW (`infra/scripts/ufw-cloudflare-only.sh` disponível)

---

## PARTE 4 — SSH hardening

### Aplicado

| Parâmetro | Valor |
|-----------|-------|
| `MaxAuthTries` | 3 |
| `LoginGraceTime` | 30 |
| `ClientAliveInterval` | 300 |
| `ClientAliveCountMax` | 2 |
| `AllowUsers` | root, ubuntu |
| `X11Forwarding` | no |
| `MaxSessions` | 4 |
| `Banner` | `/etc/ssh/impetus-banner.txt` |
| `PermitRootLogin` | yes (até `authorized_keys` configurado) |

### Ficheiros

- `infra/ssh/99-impetus-hardening.conf` → `/etc/ssh/sshd_config.d/`
- `PermitRootLogin yes` comentado no `sshd_config` principal (delegado ao drop-in)

### Próximo passo recomendado (manual)

1. Adicionar chaves SSH em `/root/.ssh/authorized_keys`
2. Alterar `PermitRootLogin prohibit-password` e `PasswordAuthentication no`
3. Instalar fail2ban: `apt install fail2ban`

### Fail2ban

**Não instalado** nesta fase (conforme escopo — sem IDS activo).

---

## PARTE 5 — PM2

### Riscos identificados (forense)

- `dump.pm2` contém variáveis de ambiente em texto claro
- `pm2 jlist` / `pm2 env` expõem segredos no stdout

### Mitigações implementadas

| Artefacto | Função |
|-----------|------|
| `scripts/pm2-secure-restart.sh` | Restart com backup metadados (sem env), health check |
| Forensics dir | `/var/lib/impetus/forensics/` |

### Procedimento de rotação segura

1. Rotacionar segredos no `.env` (nunca commitar)
2. `bash scripts/pm2-secure-restart.sh`
3. Validar `curl -sf http://127.0.0.1:4000/health`
4. **Nunca** executar `pm2 jlist` / `pm2 env` em canais não cifrados
5. Restringir permissões: `chmod 600 /root/.pm2/dump.pm2`

### Restart nesta fase

- `impetus-frontend` reiniciado (middleware serveDist)
- `impetus-backend` **não** reiniciado (preservar uptime; health OK)

---

## PARTE 6 — Integridade periódica

### Script

```bash
# Gerar baseline (feito)
bash scripts/integrity-check.sh --baseline

# Verificação periódica (cron sugerido: 0 */6 * * *)
bash scripts/integrity-check.sh
```

### Baseline

- Path: `backend/docs/integrity/HARDENING-01-baseline.sha256`
- Entradas: 15 ficheiros críticos (server.js, blueprint, nginx, audit, CI)
- Relatório: `backend/docs/integrity/HARDENING-01-last-report.json`

**Sem correção automática** — apenas reporta `missing_files` ou `drift`.

### Cron sugerido (aplicar manualmente)

```cron
0 */6 * * * /var/www/impetus-completa/scripts/integrity-check.sh >> /var/log/impetus-integrity.log 2>&1
```

---

## PARTE 7 — Recuperação documental

### Documentação enterprise restaurada

- `IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT/` — README + Vol. 00–10 + templates
- `INSTALACAO_INDUSTRIAL.md`, `PLANO_IMPLANTACAO_INDUSTRIAL_COMPLETO.md`
- `PRONTO_PARA_INDUSTRIA.md`, `RELATORIO_PROGRESSO_ETAPAS_IMPETUS.md`
- `iecp/CERT-04_PILOT_EXECUTION_PLAN.md`, `CHECKPOINT_RETOMAR.md`
- `FUNCTIONAL_MATRIX.json`

### Scripts e CI restaurados

- `backend/scripts/audit/*` (18 scripts certificação)
- `backend/scripts/ops/*`
- `.github/workflows/cert-drift.yml`
- `scripts/deploy-impetus.sh`, `cert-drift-gate.sh`, `continue-from-checkpoint.sh`

---

## Artefactos criados nesta fase

```
infra/nginx/impetus-production.conf
infra/nginx/impetus-hardening-locations.conf
infra/ssh/99-impetus-hardening.conf
infra/ssh/impetus-banner.txt
infra/shell/impetus-history-timestamp.sh
scripts/deploy-nginx-hardening.sh
scripts/integrity-check.sh
scripts/pm2-secure-restart.sh
backend/docs/integrity/HARDENING-01-baseline.sha256
backend/docs/HARDENING-01_REPORT.md
```

---

## Checklist pós-HARDENING-01

- [x] 0 ficheiros Git deleted
- [x] Nginx config restaurado e testado (`nginx -t`)
- [x] Falsos positivos 200 eliminados
- [x] SSH drop-in + banner
- [x] HISTTIMEFORMAT em `/etc/profile.d/`
- [x] Baseline integridade gerada
- [ ] Rotação credenciais PM2 (acção humana — P0)
- [ ] Configurar `authorized_keys` + desactivar password SSH
- [ ] Instalar auditd (fase Enterprise Security)
- [ ] Cron integridade (6h)

---

**Integridade desta fase:** alterações limitadas a infraestrutura, recovery Git, nginx, serveDist middleware, scripts ops e documentação. Nenhum componente congelado (Cognitive Core, EG, ECO, Enterprise Baseline) foi modificado.
