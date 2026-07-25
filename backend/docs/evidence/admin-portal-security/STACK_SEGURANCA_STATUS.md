# Pilha de Segurança IMPETUS — Status

Gerado: 2026-07-06T21:08:56Z

## Verificações

### Processos
✅ PM2 impetus-backend online
✅ PM2 impetus-admin-portal online

### Cloudflare / HTTPS
✅ https://plataformaimpetus.com → HTTP 200
✅ Resposta via Cloudflare (server: cloudflare)
✅ www + painel → HTTP 200

### Certificado origem
✅ Let's Encrypt plataformaimpetus.com (expira: Oct  4 19:04:42 2026 GMT)
                  DNS:plataformaimpetus.com, DNS:www.plataformaimpetus.com

### Guard nginx (bypass IP)
✅ Cloudflare proxy guard activo

### fail2ban
✅ fail2ban instalado
  Status
  |- Number of jail:	4
  `- Jail list:	impetus-auth-fail, impetus-nginx-scan, nginx-limit-req, sshd

### threat-watch
✅ threat-watch.env presente
✅ Log threat-watch (1226 linhas)

### Software (.env)
  IMPETUS_ADMIN_PORTAL_MFA_ENABLED=true
  ADMIN_PORTAL_TURNSTILE_SITE_KEY=0x4AAAAAADw1vC2Nkh17llBK
  IMPETUS_MFA_ENABLED=true
  SECURITY_OBSERVATORY=true
  SECURITY_PROTECTION_MODE=observe
✅ Turnstile configurado
✅ MFA app cliente ligado
✅ MFA painel ligado
✅ IA segurança (observatório) ligada

### APIs
✅ Turnstile API: "mode":"turnstile"
✅ Backend health: "status":"ok"

## Pendente (equipa)

- [ ] 2FA activo nas 5 contas (fazer quando possível)
- [x] DNS Cloudflare
- [x] Turnstile painel
- [x] Bot Fight Mode (confirmado pela equipa)
- [x] Full (strict) — activar no Cloudflare se ainda não guardou

## URLs

| Serviço | URL |
|---------|-----|
| App | https://plataformaimpetus.com |
| Painel | https://plataformaimpetus.com/painel/ |
| Centro Segurança | https://plataformaimpetus.com/painel/seguranca |
| 2FA conta painel | https://plataformaimpetus.com/painel/conta-seguranca |
| 2FA app | https://plataformaimpetus.com/app/settings → Segurança |
