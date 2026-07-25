# Cloudflare — plataformaimpetus.com (guia para o time)

Domínio **activo** em produção com proxy Cloudflare.

**Estado (2026-07):** DNS `@` + `www`, Let's Encrypt, guard nginx, Turnstile, fail2ban, threat-watch, Centro de Segurança no painel.

## Passo 1 — DNS no painel Cloudflare ✅

1. Entrar em [dash.cloudflare.com](https://dash.cloudflare.com)
2. Clicar em **plataformaimpetus.com**
3. Menu **DNS** → **Records** → **Add record**

| Tipo | Nome | Conteúdo | Proxy |
|------|------|----------|-------|
| **A** | `@` | `72.61.221.152` | **Proxied** (nuvem laranja) |
| **CNAME** | `www` | `plataformaimpetus.com` | **Proxied** |

4. Guardar. Aguardar 2–15 minutos.

## Passo 2 — SSL/TLS (Cloudflare) ✅

Modo recomendado: **Full (strict)** / **Completo (Rigoroso)** — certificado Let's Encrypt já no servidor.

## Passo 3 — Proteções recomendadas (plano Free)

| Onde | O quê |
|------|--------|
| **Security** → **Bots** | Bot Fight Mode **ON** |
| **Security** → **Settings** | Security Level **Medium** ou High |
| **SSL/TLS** → **Edge Certificates** | Always Use HTTPS **ON** |
| **WAF (borda)** | Script `cloudflare-waf-impetus.sh apply` — bloqueia `.env`/`.git` antes do servidor |

### WAF na borda (scanners não chegam ao servidor)

1. Criar API Token: [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens)  
   - Permissões: **Zone → Firewall Services → Edit** + **Zone → Zone → Read**  
   - Zone: `plataformaimpetus.com`
2. No servidor:

```bash
sudo cp /var/www/impetus-completa/infra/security/cloudflare-waf.env.example /etc/impetus/cloudflare-waf.env
sudo nano /etc/impetus/cloudflare-waf.env   # colar CLOUDFLARE_API_TOKEN
sudo bash /var/www/impetus-completa/infra/scripts/cloudflare-waf-impetus.sh apply
```

Isto activa:
- **Regra WAF** — bloqueia `/.env`, `/.git`, `wp-admin`, etc. na Cloudflare (não chega ao nginx)
- **Sync IPs** — blocklist permanente também na borda
- **threat-watch** — novos IPs atacantes são banidos na CF automaticamente (se token configurado)

## Passo 4 — Turnstile (anti-bot no painel equipe)

1. **Turnstile** → Create widget → domínio `plataformaimpetus.com`
2. Copiar **Site Key** e **Secret Key**
3. No servidor, `backend/.env`:
   ```
   ADMIN_PORTAL_TURNSTILE_SITE_KEY=...
   ADMIN_PORTAL_TURNSTILE_SECRET_KEY=...
   ```
4. `pm2 restart impetus-backend --update-env`

## Passo 5 — Depois do DNS activo (equipa técnica no servidor)

```bash
# Certificado Let's Encrypt para o domínio novo
sudo certbot certonly --nginx -d plataformaimpetus.com -d www.plataformaimpetus.com

# Bloquear acesso directo ao IP (só Cloudflare)
sudo bash /var/www/impetus-completa/infra/scripts/enable-cloudflare-proxy-mode.sh on
```

**Atenção:** só activar o guard UFW/Cloudflare **depois** de `plataformaimpetus.com` abrir no browser via Cloudflare.

## Passo 6 — Origin Certificate (opcional, Full Strict)

1. Cloudflare → **SSL/TLS** → **Origin Server** → **Create Certificate**
2. Hostnames: `plataformaimpetus.com`, `*.plataformaimpetus.com`
3. Instalar `.pem` no nginx (pedir à equipa técnica)

---

## URLs finais

| Serviço | URL |
|---------|-----|
| App cliente | https://plataformaimpetus.com |
| Painel equipe | https://plataformaimpetus.com/painel/ |
| Legado Hostinger | https://srv1422313.hstgr.cloud (mantido em paralelo) |

---

## Não fazer sem confirmação

- Não remover o registo A antigo do hstgr até o domínio novo estiver validado
- Não activar **Full (strict)** sem certificado de origem válido
