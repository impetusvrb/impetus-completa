# Hardening VPS — IMPETUS (Hostinger + Cloudflare)

Documento operacional para fechar exposição directa do IP `72.61.221.152` e alinhar produção.

## Estado actual detectado (baseline)

| Componente | Situação | Risco |
|------------|----------|-------|
| Frontend PM2 (`impetus-frontend`) | `serveDist.cjs` em `0.0.0.0:3000` | **Alto** — URL pública `:3000` |
| Backend PM2 (`impetus-backend`) | `server.js` em `*:4000` (todas interfaces) | **Crítico** — API exposta sem Nginx |
| Nginx | Site `default` activo; **sem proxy IMPETUS** | Médio |
| UFW | **Inactivo** | **Alto** |
| `NODE_ENV` (PM2) | `development` | **Alto** — bypass rotas internas, CORS permissivo |
| `JWT_SECRET` | Fraco / curto | **Crítico** |
| `ALLOWED_ORIGINS` | Não definido | **Alto** em produção (CORS bloqueia ou mal configurado) |
| Token JWT | `localStorage` (`impetus_token`) | Médio — XSS rouba sessão |

## Arquitectura alvo

```
Internet → Cloudflare (WAF/DDoS) → VPS :443/:80 (Nginx)
                                      ├─ /        → 127.0.0.1:3000 (SPA serveDist)
                                      ├─ /api/*   → 127.0.0.1:4000 (API)
                                      ├─ /uploads → 127.0.0.1:4000
                                      └─ /socket.io, /impetus-realtime → 127.0.0.1:4000 (WS)

Portas 3000/4000: bind localhost + UFW deny público
SSH (22): apenas IP de administração (NÃO Cloudflare)
```

---

## 1. Reverse proxy Nginx

Ficheiros no repositório:

- `infra/nginx/impetus.conf` — site principal
- `infra/nginx/impetus-proxy.conf` — headers proxy HTTP
- `infra/nginx/impetus-proxy-ws.conf` — WebSocket
- `infra/nginx/cloudflare-real-ip.conf` — IP real do cliente

### Instalação rápida

```bash
cd /var/www/impetus-completa

sudo cp infra/nginx/impetus-proxy.conf /etc/nginx/snippets/impetus-proxy.conf
sudo cp infra/nginx/impetus-proxy-ws.conf /etc/nginx/snippets/impetus-proxy-ws.conf
sudo cp infra/nginx/impetus.conf /etc/nginx/sites-available/impetus

# Substituir domínio
sudo sed -i 's/SEU_DOMINIO/app.seudominio.com/g' /etc/nginx/sites-available/impetus

sudo ln -sf /etc/nginx/sites-available/impetus /etc/nginx/sites-enabled/impetus
sudo rm -f /etc/nginx/sites-enabled/default

sudo bash infra/scripts/update-cloudflare-ips.sh
sudo nginx -t && sudo systemctl reload nginx
```

### SSL

1. Na Cloudflare: DNS `A`/`AAAA` para o IP da VPS, proxy **laranja** activo.
2. SSL/TLS → **Full (strict)** (após certificado válido na origem).
3. No VPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d app.seudominio.com -d www.app.seudominio.com
```

Alternativa: **Origin Certificate** Cloudflare (15 anos) no Nginx, sem Certbot.

---

## 2. Cloudflare — aceitar só tráfego CF no VPS

### Painel Cloudflare

1. **DNS**: registo `A` → `72.61.221.152`, **Proxied** (nuvem laranja).
2. **SSL/TLS** → Encryption mode: **Full (strict)**.
3. **SSL/TLS** → Edge Certificates → **Always Use HTTPS** = On.
4. **Security** → **WAF** → managed rules + OWASP (plano Pro ou rules custom Free).
5. **Security** → **Settings**:
   - Security Level: Medium ou High
   - Bot Fight Mode: On (Free)
6. **Network**: WebSockets = **On** (Socket.IO).
7. **Firewall Rules** (exemplos):
   - Bloquear países não usados: `(ip.geoip.country not in {"PT" "BR"})` → Block (ajuste).
   - Rate limit login: `(http.request.uri.path contains "/api/auth/login")` → Challenge/Block.
8. **Page Rules / Cache Rules**: não cachear `/api/*`.

### Origem (VPS) — impedir bypass da Cloudflare

Sem firewall, atacantes acedem `http://72.61.221.152:4000` directamente.

**Camada A — UFW** (script pronto):

```bash
export ADMIN_SSH_IP="SEU_IP_FIXO"
sudo -E bash /var/www/impetus-completa/infra/scripts/ufw-cloudflare-only.sh
```

**Camada B — Nginx `real_ip`**: incluir `cloudflare-real-ip.conf` para logs e rate limits com IP real (`CF-Connecting-IP`).

**Camada C — Actualizar IPs CF** (Cloudflare altera ranges ocasionalmente):

```bash
sudo bash /var/www/impetus-completa/infra/scripts/update-cloudflare-ips.sh
# Cron mensal recomendado
```

**Nota:** Se precisar de aceder ao IP directamente para debug, use túnel SSH — não abra 3000/4000 ao mundo.

---

## 3. Firewall — fechar 3000 e 4000

Além do script UFW acima, **obrigatório** restringir bind das aplicações:

### Frontend (`serveDist.cjs`)

No PM2 ou `.env` do frontend:

```bash
SERVE_DIST_HOST=127.0.0.1
SERVE_DIST_PORT=3000
```

### Backend

Adicionar em `backend/.env`:

```bash
LISTEN_HOST=127.0.0.1
```

E alterar `server.js` para respeitar `LISTEN_HOST` (ver secção 4).

Reiniciar:

```bash
pm2 restart impetus-frontend impetus-backend --update-env
```

Verificação:

```bash
ss -tlnp | grep -E ':3000|:4000'
# Deve mostrar 127.0.0.1:3000 e 127.0.0.1:4000 (não 0.0.0.0)
```

---

## 4. Vulnerabilidades de código — correções prioritárias

### P0 — Crítico (fazer hoje)

| ID | Problema | Acção |
|----|----------|-------|
| SEC-01 | API `:4000` exposta publicamente | Nginx + UFW + `LISTEN_HOST=127.0.0.1` |
| SEC-02 | `NODE_ENV=development` em PM2 produção | `NODE_ENV=production` no `.env` + PM2 `--update-env` |
| SEC-03 | `JWT_SECRET` fraco (`impetus_super_secreto_2026`, <32 chars) | Gerar: `openssl rand -base64 48` — **invalida sessões activas** |
| SEC-04 | Bypass rotas `/api/internal/*` em dev | Com `NODE_ENV=production`, `IMPETUS_INTERNAL_NETWORK_DEV_BYPASS` deixa de aplicar |
| SEC-05 | Backups `.env` no disco com segredos | Remover ou mover para fora do webroot; permissões `chmod 600 backend/.env` |

### P1 — Alto

| ID | Problema | Acção |
|----|----------|-------|
| SEC-06 | `ALLOWED_ORIGINS` ausente | Definir: `ALLOWED_ORIGINS=https://app.seudominio.com` |
| SEC-07 | `FRONTEND_URL` / `BASE_URL` | Apontar para `https://app.seudominio.com` (sem `:3000`) |
| SEC-08 | `HEALTH_DETAIL_KEY` ausente | `openssl rand -hex 32` — protege `/api/system/health/deep` |
| SEC-09 | Frontend `VITE_API_URL` absoluto com `:4000` | Usar `/api` relativo (Nginx faz proxy) |
| SEC-10 | Token em `localStorage` | Médio prazo: cookies `HttpOnly`+`Secure`+`SameSite=Strict` |

### P2 — Médio (já parcialmente mitigado)

| ID | Problema | Estado |
|----|----------|--------|
| SEC-11 | CORS | `security.js` bloqueia Origins em prod se `ALLOWED_ORIGINS` vazio — configurar explicitamente |
| SEC-12 | Rate limiting | Activo (`globalRateLimit.js`); ajustar `RATE_LIMIT_API_PER_MIN` se necessário |
| SEC-13 | Helmet/CSP | Activo; `unsafe-inline` necessário para SPA |
| SEC-14 | Uploads | `secureStaticUploads` — validar MIME/path traversal periodicamente |
| SEC-15 | Webhooks | Stripe/Meta usam HMAC — manter secrets só em `.env` |

### Alteração mínima recomendada no código (`server.js`)

```javascript
const HOST = process.env.LISTEN_HOST || '127.0.0.1';
httpServer.listen(PORT, HOST, () => { ... });
```

Em produção, recusar arranque se `LISTEN_HOST` for `0.0.0.0` sem `ALLOW_PUBLIC_BIND=true` explícito.

### Variáveis `.env` produção (checklist)

```bash
NODE_ENV=production
PORT=4000
LISTEN_HOST=127.0.0.1
JWT_SECRET=<48+ bytes base64>
HEALTH_DETAIL_KEY=<32 bytes hex>
ALLOWED_ORIGINS=https://app.seudominio.com
FRONTEND_URL=https://app.seudominio.com
BASE_URL=https://app.seudominio.com
IMPETUS_INTERNAL_NETWORK_DEV_BYPASS=false
IMPETUS_INTERNAL_ROUTE_ALLOW_LOCALHOST=true
IMPETUS_INTERNAL_ROUTE_DENY_BY_DEFAULT=true
```

Frontend PM2:

```bash
SERVE_DIST_HOST=127.0.0.1
# Não definir VITE_API_URL ou usar /api no build
```

---

## 5. Ordem de execução recomendada

1. Bind apps em `127.0.0.1` (testar localmente com `curl localhost:3000`).
2. Instalar Nginx + snippets + site `impetus`.
3. Configurar DNS Cloudflare (proxy laranja).
4. Certificado SSL (Certbot ou Origin CF).
5. Activar UFW com script Cloudflare (com sessão SSH de reserva).
6. Rotacionar `JWT_SECRET` e `HEALTH_DETAIL_KEY`.
7. `NODE_ENV=production` + `ALLOWED_ORIGINS` + restart PM2.
8. Teste externo: `https://dominio` OK; `:3000` e `:4000` inacessíveis de fora.

---

## 6. Comandos de verificação

```bash
# Portas expostas
ss -tlnp | grep -E ':80|:443|:3000|:4000'

# Health local
curl -s http://127.0.0.1:4000/health | head
curl -sI http://127.0.0.1:3000/

# Simular bypass (de outra máquina)
curl -m 5 http://72.61.221.152:4000/health   # deve falhar após UFW

# Headers segurança
curl -sI https://app.seudominio.com | grep -iE 'strict|frame|content-type'
```

---

## Ficheiros relacionados

| Path | Descrição |
|------|-----------|
| `infra/nginx/impetus.conf` | Virtual host 80/443 |
| `infra/scripts/ufw-cloudflare-only.sh` | Firewall Cloudflare-only |
| `infra/scripts/update-cloudflare-ips.sh` | Actualizar IPs CF |
| `backend/src/config/security.js` | CORS/CSP |
| `backend/src/middleware/internalNetworkGuard.js` | Rotas internas |
| `frontend/serveDist.cjs` | Proxy local /api → :4000 |
