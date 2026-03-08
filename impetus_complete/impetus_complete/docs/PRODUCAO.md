# IMPETUS COMUNICA IA — Guia de Produção

**Registro INPI:** BR512025007048-9

Este documento descreve procedimentos e configurações para operar o sistema em ambiente de produção com excelência.

---

## 1. HTTPS / SSL

### 1.1 Uso de proxy reverso (recomendado)

Coloque o IMPETUS atrás de um proxy reverso (nginx, Caddy, Traefik) que gerencie SSL:

**Exemplo nginx (SSL com Let's Encrypt):**
```nginx
server {
    listen 443 ssl http2;
    server_name impetus.sua-empresa.com;

    ssl_certificate /etc/letsencrypt/live/impetus.sua-empresa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/impetus.sua-empresa.com/privkey.pem;

    location / {
        proxy_pass http://localhost:80;  # frontend nginx (docker prod)
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:4000;  # backend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /uploads/ {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
    }
}
```

### 1.2 Variáveis de ambiente

```env
SSL_ENABLED=true
SSL_KEY_PATH=/path/to/privkey.pem
SSL_CERT_PATH=/path/to/fullchain.pem
FRONTEND_URL=https://impetus.sua-empresa.com
BASE_URL=https://impetus.sua-empresa.com
```

---

## 2. Backup do banco de dados

### 2.1 Backup manual (pg_dump)

```bash
# Backup completo (inclui schema e dados)
pg_dump -U impetus -d impetusdb -F c -f impetus_backup_$(date +%Y%m%d_%H%M).dump

# Backup apenas schema (para versionar)
pg_dump -U impetus -d impetusdb -s -f impetus_schema_$(date +%Y%m%d).sql
```

### 2.2 Restauração

```bash
pg_restore -U impetus -d impetusdb -c impetus_backup_20250101_1200.dump
# -c = limpar objetos existentes antes de restaurar
```

### 2.3 Rotina automática (cron)

```bash
# Adicionar ao crontab (crontab -e)
# Backup diário às 2h
0 2 * * * pg_dump -U impetus -d impetusdb -F c -f /backups/impetus_$(date +\%Y\%m\%d).dump
```

### 2.4 Retenção

- Manter últimos **7 dias** de backups diários
- Manter **1 backup mensal** por 12 meses
- Testar restauração **trimestralmente**

---

## 3. Variáveis de ambiente em produção

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `NODE_ENV` | Sim | `production` |
| `DATABASE_URL` | Sim | Connection string Postgres |
| `OPENAI_API_KEY` | Sim* | *Sem ela, a IA usa fallback limitado |
| `SALT` | Sim | String aleatória única |
| `ENCRYPTION_KEY` | Sim | 32+ caracteres (openssl rand -base64 32) |
| `LICENSE_VALIDATION_ENABLED` | - | `true` para validar licença |
| `LICENSE_KEY` | Se validação ativa | Chave de licença |
| `FRONTEND_URL` | Sim | URL pública (ex: https://impetus.empresa.com) |
| `BASE_URL` | Sim | Mesmo que FRONTEND_URL ou API pública |
| `AUDIT_LOG_RETENTION_DAYS` | - | 90 (padrão) |

---

## 4. PM2 e reinício automático

```bash
cd backend
npm install -g pm2
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup  # configura inicio com o sistema
```

**Health check:**
```bash
curl -s http://localhost:4000/health | jq
```

---

## 5. Logs e monitoramento

### 5.1 Logs da aplicação

- PM2: `pm2 logs impetus-backend`
- Rotação: configurar `logrotate` ou Winston com daily rotate

### 5.2 Alertas recomendados

- **Health check falhou** (GET /health retorna 503)
- **Uso de memória alto** (> 80% heap)
- **Conexões DB esgotadas**
- **Taxa de erro da API** (> 5% em 5 min)

### 5.3 Ferramentas sugeridas

- UptimeRobot ou Pingdom para monitoramento externo
- Grafana + Prometheus (opcional)
- Sentry para erros (configurar SENTRY_DSN)

---

## 6. Manutenção periódica

### 6.1 Script de manutenção

```bash
cd backend
npm run maintenance
```

Executa:
- Remoção de sessões expiradas
- Limpeza de logs antigos (audit, data_access)
- VACUUM ANALYZE em tabelas principais

**Cron sugerido:** `0 3 * * * cd /path/backend && npm run maintenance`

### 6.2 Atualização do sistema

1. Fazer backup do banco
2. `git pull` ou atualizar arquivos
3. `npm install` (backend e frontend)
4. `npm run migrate` (se houver novas migrations)
5. Rebuild frontend: `npm run build`
6. Reiniciar: `pm2 restart all`

---

## 7. Checklist pré-go-live

- [ ] Backup do banco configurado e testado
- [ ] HTTPS ativo (certificado válido)
- [ ] Variáveis de produção configuradas
- [ ] LICENSE_VALIDATION_ENABLED e LICENSE_KEY (se aplicável)
- [ ] PM2 ou systemd configurado para restart
- [ ] Health check em monitoramento externo
- [ ] Migrations executadas (`npm run migrate`)
- [ ] Seed inicial rodado se banco novo (`npm run seed`)

---

## 8. Suporte

📧 contato@impetus.com.br  
🌐 [https://impetusvrb.wixsite.com/impetus](https://impetusvrb.wixsite.com/impetus)
