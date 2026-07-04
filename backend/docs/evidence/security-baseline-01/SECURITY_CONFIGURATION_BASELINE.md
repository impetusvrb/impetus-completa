# SECURITY_CONFIGURATION_BASELINE — Configurações Congeladas

**Certificação:** SECURITY-BASELINE-01  
**Modo:** Registro only — sem alterações nesta fase

---

## Node.js / Express (backend)

| Parâmetro | Valor baseline |
|-----------|----------------|
| `NODE_ENV` | `production` (PM2 env_production) |
| `PORT` | 4000 |
| `LISTEN_HOST` | **127.0.0.1** (recusa 0.0.0.0 em prod sem `ALLOW_PUBLIC_BIND`) |
| Helmet | `buildHelmetOptions()` — CSP, HSTS implícito via nginx TLS |
| CORS | `ALLOWED_ORIGINS` — lista explícita; prod recusa Origin se vazio |
| Compression | `compression()` activo |
| Rate limit | `apiByIpLimiter`, `apiByUserLimiter`, `heavyRouteLimiter` |
| Uploads | `secureStaticUploads` middleware em `/uploads` |
| Tenant | `tenantIsolationGuard` + RLS context (except skip prefixes auth/webhook) |
| License | `licenseApiMiddleware` |

Fonte: `backend/src/server.js`, `backend/src/config/security.js`

---

## Node.js / Express (frontend serveDist)

| Parâmetro | Valor baseline |
|-----------|----------------|
| `SERVE_DIST_HOST` | 127.0.0.1 |
| `SERVE_DIST_PORT` | 3000 |
| Static root | `frontend/dist/` |
| Proxy | `/api`, `/uploads`, `/socket.io`, `/impetus-realtime` → :4000 |
| SPA fallback | index.html (except `/unity/` paths validados) |
| HARDENING-01 | Middleware 404 para paths de scanner |

Fonte: `frontend/serveDist.cjs`, `ecosystem.config.js`

---

## PM2

| App | Script | CWD | Policy |
|-----|--------|-----|--------|
| impetus-backend | `backend/src/server.js` | backend/ | autorestart, max 1G, fork |
| impetus-frontend | `npm run preview:prod` | frontend/ | autorestart, max 512M |
| lipsync-api | `lipsync_api.py` | repo root | online |
| pm2-logrotate | módulo PM2 | — | rotação logs |
| Lab (stopped) | modbus, opcua, edge, oidc, smtp | — | stopped baseline |

| Parâmetro | Valor |
|-----------|-------|
| `env_production` flags | NEXUS_BILLING_ENGINE_V4, NEXUS_CREDIT_WALLET, etc. |
| Logs | `/root/.pm2/logs/impetus-*` |
| dump.pm2 | Contém env vars — **risco documentado** |
| Restart seguro | `scripts/pm2-secure-restart.sh` |

---

## Nginx

| Parâmetro | Valor baseline |
|-----------|----------------|
| Config | `/etc/nginx/sites-available/impetus` |
| Domain | `srv1422313.hstgr.cloud` |
| SSL cert | Let's Encrypt ECDSA, expira **2026-09-19** |
| Fingerprint SHA256 | `8B:E3:F9:C7:8D:1E:1F:B5:5A:92:58:D7:3D:FE:5B:41:F4:44:98:10:42:37:B2:42:52:00:9F:3A:66:2E:5A:3A` |
| HTTP/2 | Sim |
| `server_tokens` | off |
| Rate limits | API 60r/m, auth 10r/m, static 100r/s |
| Dotfiles | deny → 404 |
| Hardening | `impetus-hardening-locations.conf` |
| Real IP | Cloudflare ranges (`cloudflare-real-ip.conf`) |
| Default server IP | return 444 |

---

## SSH

| Parâmetro | Valor baseline |
|-----------|----------------|
| Drop-in | `/etc/ssh/sshd_config.d/99-impetus-hardening.conf` |
| `PermitRootLogin` | yes (pendente migração chave) |
| `PasswordAuthentication` | yes |
| `PubkeyAuthentication` | yes |
| `MaxAuthTries` | 3 |
| `LoginGraceTime` | 30 |
| `ClientAliveInterval` | 300 |
| `AllowUsers` | root, ubuntu |
| `authorized_keys` | **0 chaves** |
| Banner | `/etc/ssh/impetus-banner.txt` |

---

## Firewall (UFW)

| Regra | Acção |
|-------|-------|
| 3000, 4000 | DENY Anywhere |
| 22, 80, 443 | ALLOW 170.246.0.0/16, 186.225.0.0/16 (+ IPv6) |
| IPs atacantes | DENY explícito (6 IPs) |
| Default | deny incoming |

---

## TLS

| Item | Valor |
|------|-------|
| Protocolos | TLSv1.2, TLSv1.3 (via certbot options) |
| Cert path | `/etc/letsencrypt/live/srv1422313.hstgr.cloud/` |
| Renovação | snap.certbot.renew.timer |

---

## CORS (Express)

- `credentials: true`
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD
- Origin: whitelist `ALLOWED_ORIGINS`; prod bloqueia se vazio
- Headers expostos: TTS-related, Cache-Control

---

## Helmet / CSP

- `script-src`: 'self', 'unsafe-inline'
- `connect-src`: self, OpenAI, Anthropic, wss:, https:, + extras
- Origins CORS injectados em connect-src

---

## Docker

- **Nenhum container activo** na baseline
- Configs presentes: `docker/`, `docker-compose` references em docs
- Não exposto via HTTP

---

## Environment — categorias (nomes only, `.env.example`)

| Categoria | Exemplos vars | Count |
|-----------|---------------|-------|
| Database | DB_HOST, DB_PASSWORD, DATABASE_URL | ~10 |
| JWT/Auth | JWT_SECRET, IMPETUS_ADMIN_JWT_SECRET | ~5 |
| AI | OPENAI_*, ANTHROPIC_*, GEMINI_* | ~30 |
| SMTP | SMTP_HOST, SMTP_PASS | ~6 |
| Encryption | DATA_ENCRYPTION_KEY, MFA keys | ~4 |
| Integrations | GITHUB_WORKFLOW_TOKEN, webhooks | ~10 |
| Feature flags | NEXUS_*, ENABLE_* | ~50+ |
| **Total** | | **314** |

Valores runtime: **não documentados** nesta baseline pública.

---

## Lacunas de configuração (para SEC-01+)

| Item | Estado baseline |
|------|-----------------|
| fail2ban | Não instalado |
| auditd | Não instalado |
| SSH key-only | Pendente |
| Cloudflare-only UFW | Script disponível, não activo |
| HISTTIMEFORMAT | Instalado HARDENING-01 |
| CORS formal audit report | Pendente SEC |
