# CHECKLIST-PROVISIONAMENTO — IMPETUS Enterprise

**Certificação:** CERT-ENTERPRISE-PROVISIONING-01  
**Uso:** marcar `[x]` quando concluído. Arquivar cópia preenchida em `docs/evidence/provisioning-01/`.

---

## 1. VM e hardware

- [ ] Ubuntu Server 22.04 ou 24.04 LTS instalado
- [ ] ≥ 2 vCPUs (recomendado ≥ 4)
- [ ] ≥ 8 GB RAM (recomendado ≥ 16 GB)
- [ ] ≥ 40 GB disco SSD (recomendado 80 GB NVMe)
- [ ] **≥ 20 GB espaço livre** verificado (`df -h /`)
- [ ] Hostname e FQDN definidos
- [ ] Fuso horário configurado (UTC ou local da fábrica)

---

## 2. Rede e firewall

- [ ] IP público / privado documentados
- [ ] DNS apontando para o host
- [ ] Porta 22 (SSH) — bastion ou restrita
- [ ] Portas 80/443 abertas para Nginx
- [ ] Portas 3000/4000 **não** expostas publicamente (loopback)
- [ ] PostgreSQL 5432 apenas localhost
- [ ] UFW ou security group configurado
- [ ] Certificado TLS provisionado ou plano Let's Encrypt

---

## 3. Acessos

- [ ] Utilizador `impetus` criado
- [ ] `impetus` no grupo `docker`
- [ ] Login SSH root **desabilitado**
- [ ] Autenticação SSH por chave pública
- [ ] Utilizador Ops com sudo documentado

---

## 4. Layout `/opt/impetus/`

- [ ] `config/`
- [ ] `uploads/`
- [ ] `logs/` (+ subdirs backend, frontend, nginx)
- [ ] `database/`
- [ ] `backups/` (+ subdirs db, config, data, uploads)
- [ ] `runtime/`
- [ ] `licenses/`
- [ ] `certificates/`
- [ ] `data/` (+ subdirs cognitivos)
- [ ] `monitoring/`
- [ ] `scripts/`
- [ ] `temp/`
- [ ] `app/` (clone repositório)
- [ ] Ownership `impetus:impetus` em toda a árvore

---

## 5. Runtime e dependências

- [ ] Node.js 20.x LTS (`node -v`)
- [ ] npm (`npm -v`)
- [ ] PM2 global (`pm2 -v`)
- [ ] Docker Engine (`docker --version`)
- [ ] Docker Compose plugin (`docker compose version`)
- [ ] PostgreSQL 14+ (`psql --version`)
- [ ] OpenSSL (`openssl version`)
- [ ] Git (`git --version`)
- [ ] Nginx (`nginx -v`)

---

## 6. PostgreSQL

- [ ] Instância operacional
- [ ] Encoding UTF8
- [ ] Base de dados criada (limpa para homologação)
- [ ] Utilizador aplicação com permissões mínimas
- [ ] `DATABASE_URL` em `/opt/impetus/config/.env`
- [ ] **Sem** dados de produção na fase inicial

---

## 7. Configuração Enterprise

- [ ] `.env` baseado em `docker/config/env.enterprise.example`
- [ ] `IMPETUS_HOME=/opt/impetus`
- [ ] `JWT_SECRET` gerado (cofre seguro)
- [ ] `IMPETUS_ADMIN_JWT_SECRET` gerado
- [ ] Licença em `/opt/impetus/licenses/` (se aplicável)
- [ ] `FRONTEND_URL` / `ALLOWED_ORIGINS` alinhados ao domínio

---

## 8. Docker (sem alterar compose)

- [ ] `docker info` OK como user `impetus`
- [ ] `docker compose` disponível
- [ ] `docker-compose.yml` presente em `app/` (repo)
- [ ] Syntax YAML validada (`python3 -c "import yaml; ..."`)
- [ ] **Não** alterar Dockerfiles nem compose

---

## 9. PM2

- [ ] `ecosystem.config.js` no repositório
- [ ] Logs PM2 em path não-root (recomendado `/opt/impetus/logs/`)
- [ ] `pm2 startup` configurado para user `impetus` (produção)

---

## 10. Capacidade DR

- [ ] Espaço livre ≥ 2× maior backup esperado + 1,75 GB
- [ ] Diretório `backups/` com escrita
- [ ] `temp/` com escrita
- [ ] Procedimento backup documentado (`MANUAL-BACKUP.md`)

---

## 11. Validação automatizada (obrigatória)

Executar como user `impetus`:

```bash
export IMPETUS_HOME=/opt/impetus
cd /opt/impetus/app/backend
```

- [ ] `npm run enterprise:staging-provisioning` → **APROVADA**
- [ ] `npm run enterprise:env-qualification` → **APROVADA**
- [ ] `npm run enterprise:rollback-validation` → **APROVADA**
- [ ] `npm run enterprise:homologation` → **HOMOLOGADA**

---

## 12. Entrega

- [ ] `HANDOFF-INFRASTRUCTURE.md` preenchido
- [ ] Inventário JSON em `docs/evidence/provisioning-01/`
- [ ] Evidências STAGING em `docs/evidence/staging-01/`
- [ ] Assinatura fornecedor / cliente

---

**Referência:** `MANUAL-PROVISIONAMENTO.md` · `VM-SPECIFICATION.md`
