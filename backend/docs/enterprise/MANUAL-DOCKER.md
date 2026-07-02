# Manual — Docker Enterprise IMPETUS

**Certificação:** CERT-ONPREM-CONTAINER-01

---

## Princípio fundamental

> **PM2 é o runtime oficial certificado.** Docker **não substitui** PM2 — executa `pm2-runtime` com os mesmos scripts (`server.js`, `preview:prod`) já aprovados em INFRA-01.

Instalação PM2 no host (`ecosystem.config.js`) **continua válida** e **não é afectada** por esta certificação.

---

## 1. Pré-requisitos

- Docker Engine 24+ · Compose v2  
- 4 GB RAM (8 GB recomendado)  
- Portas 80/443 ou `IMPETUS_HTTP_PORT`  
- Disco para `${IMPETUS_HOME}`

---

## 2. Instalação

```bash
export IMPETUS_HOME=/opt/impetus
sudo mkdir -p "$IMPETUS_HOME"/{config,uploads,data,logs,licenses,certificates,backups,temp,runtime,database}
sudo chown -R 1000:1000 "$IMPETUS_HOME"

cp docker/config/env.enterprise.example "$IMPETUS_HOME/config/.env"
chmod 600 "$IMPETUS_HOME/config/.env"
# Editar senhas, JWT, bootstrap (1ª instalação)

cp docker/config/compose.env.example .env
# Editar POSTGRES_PASSWORD

cd /var/www/impetus-completa
docker compose up -d --build
```

---

## 3. Runtime PM2 no container

| Container | PM2 app | Script certificado |
|-----------|---------|-------------------|
| backend | `impetus-backend` | `./src/server.js` |
| frontend | `impetus-frontend` | `npm run preview:prod` |

Verificar:

```bash
docker compose exec backend pm2 list
docker compose exec frontend pm2 list
docker compose exec backend pm2 logs impetus-backend --lines 20
```

Logs persistidos: `${IMPETUS_HOME}/logs/backend/` e `logs/frontend/`.

**Adaptadores Docker** (não alteram host):

- `docker/ecosystem.backend.container.cjs`
- `docker/ecosystem.frontend.container.cjs`

**Host PM2 oficial:** `ecosystem.config.js` (raiz) — **não modificar para Docker**.

---

## 4. Configuração

| Ficheiro | Função |
|----------|--------|
| `${IMPETUS_HOME}/config/.env` | **Fonte única** certificada |
| `.env` (raiz repo) | Variáveis compose (`POSTGRES_PASSWORD`, `IMPETUS_HOME`) |

Perfil Docker em `config/.env`:

```env
LISTEN_HOST=0.0.0.0
ALLOW_PUBLIC_BIND=true
DB_HOST=postgres
API_PROXY_TARGET=http://backend:4000
SERVE_DIST_HOST=0.0.0.0
```

> Desvio NC-C01/C02/C03 — env only, rede Docker interna. Ver matriz conformidade.

Perfil PM2 host mantém `LISTEN_HOST=127.0.0.1` — **sem alteração**.

---

## 5. PM2 host vs Docker

| | PM2 Host | Docker |
|--|----------|--------|
| Supervisor | PM2 daemon | PM2 Runtime (`pm2-runtime`) |
| Config PM2 | `ecosystem.config.js` | `docker/ecosystem.*.container.cjs` |
| Nginx | host `/etc/nginx` | container nginx |
| Persistência | IMPETUS_HOME | IMPETUS_HOME (igual) |
| Obrigatório? | Sim (certificado) | **Opcional** (distribuição adicional) |

**Coexistência:** portas diferentes (PM2 :4000/:3000 local; Docker nginx :80).

---

## 6. Comandos úteis

```bash
docker compose logs -f backend
docker compose exec backend pm2 monit
docker compose exec backend node scripts/enterprise/verify-enterprise.js
docker compose exec backend node scripts/enterprise/license-admin.js status
docker compose exec backend node scripts/enterprise/backup-enterprise.js
```

---

## 7. Smoke test

```bash
bash docker/scripts/container-smoke.sh
```

Valida PM2 online dentro dos containers.

---

## 8. Não conformidades

Se um componente exigir alteração de código para Docker:

- **Não implementar** automaticamente  
- Documentar em `docker/MATRIZ-CONFORMIDADE-CONTAINER.md`  
- Escalar para certificação futura  

---

## Referências

- `backend/docs/CERT-ONPREM-CONTAINER-01.md`
- `docker/MATRIZ-CONFORMIDADE-CONTAINER.md`
- `backend/docs/enterprise/MANUAL-UPDATE-CONTAINER.md`
