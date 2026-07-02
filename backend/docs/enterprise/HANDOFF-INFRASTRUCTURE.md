# HANDOFF-INFRASTRUCTURE — Documento de Entrega para Fornecedor

**Produto:** IMPETUS Enterprise On-Premise  
**Certificação:** CERT-ENTERPRISE-PROVISIONING-01  
**Versão:** 1.0 · 2026-07-01

> Preencher todos os campos marcados com `[___]`. Entregar cópia preenchida à equipa IMPETUS antes de iniciar homologação.

---

## A. Identificação do ambiente

| Campo | Valor |
|-------|-------|
| **Fornecedor Cloud / Datacenter** | [___] |
| **Região / Zona** | [___] |
| **Tipo** | [ ] Homologação  [ ] Produção  [ ] Piloto |
| **Hostname** | [___] |
| **FQDN** | [___] |
| **Data provisionamento** | [___] |
| **Responsável infraestrutura** | [___] |
| **Contacto** | [___] |

---

## B. Especificação de hardware (confirmar conforme VM-SPECIFICATION.md)

| Recurso | Mínimo exigido | Provisionado | ✓ |
|---------|----------------|--------------|---|
| SO | Ubuntu 22.04/24.04 LTS | [___] | [ ] |
| vCPU | ≥ 2 (rec. 4) | [___] | [ ] |
| RAM | ≥ 8 GB (rec. 16 GB) | [___] | [ ] |
| Disco total | ≥ 40 GB SSD (rec. 80 GB NVMe) | [___] | [ ] |
| **Espaço livre** | **≥ 20 GB** | [___] | [ ] |

---

## C. Rede (Parte 2)

| Campo | Valor |
|-------|-------|
| **IP público** | [___] |
| **IP privado** | [___] |
| **Gateway** | [___] |
| **Máscara** | [___] |
| **DNS primário** | [___] |
| **DNS secundário** | [___] |
| **Domínio** | [___] |
| **Subdomínio API** | [___] (ex.: `api.factory.cliente.com`) |
| **Subdomínio app** | [___] (ex.: `impetus.factory.cliente.com`) |

### Portas a liberar (firewall)

| Porta | Protocolo | Serviço | Expor público? |
|-------|-----------|---------|----------------|
| 22 | TCP | SSH | [ ] Sim  [ ] Apenas VPN/bastion |
| 80 | TCP | HTTP → redirect HTTPS | [ ] |
| 443 | TCP | HTTPS (Nginx) | [ ] |
| 3000 | TCP | Frontend (loopback preferencial) | [ ] Não público |
| 4000 | TCP | Backend API (loopback preferencial) | [ ] Não público |
| 5432 | TCP | PostgreSQL | [ ] Apenas localhost |

### TLS / Certificado

| Campo | Valor |
|-------|-------|
| **Tipo certificado** | [ ] Let's Encrypt  [ ] Corporativo  [ ] Interno |
| **Emissor** | [___] |
| **Validade até** | [___] |
| **Path certificado** | [___] |
| **Path chave privada** | [___] |

### Proxy reverso

| Campo | Valor |
|-------|-------|
| **Nginx instalado** | [ ] Sim  [ ] Não |
| **Config path** | `/etc/nginx/sites-available/impetus` |
| **Upstream frontend** | `127.0.0.1:3000` |
| **Upstream backend** | `127.0.0.1:4000` |

---

## D. Acessos (Parte 3)

| Campo | Valor |
|-------|-------|
| **Porta SSH** | [___] (padrão 22) |
| **Login root SSH** | [ ] **Proibido** (exigido) |
| **Utilizador SSH Ops** | [___] |
| **Autenticação** | [ ] Chave pública apenas |
| **Chave pública (fingerprint)** | [___] |
| **Sudo** | [ ] Configurado para user Ops |
| **Utilizador dedicado IMPETUS** | `impetus` |
| **impetus no grupo docker** | [ ] Sim |

---

## E. Layout Enterprise — `/opt/impetus/` (Parte 4)

Confirmar criação e ownership `impetus:impetus`:

| Diretório | Criado | Permissão escrita |
|-----------|:------:|:-----------------:|
| `config/` | [ ] | [ ] |
| `uploads/` | [ ] | [ ] |
| `logs/` | [ ] | [ ] |
| `database/` | [ ] | [ ] |
| `backups/` | [ ] | [ ] |
| `runtime/` | [ ] | [ ] |
| `licenses/` | [ ] | [ ] |
| `certificates/` | [ ] | [ ] |
| `data/` | [ ] | [ ] |
| `monitoring/` | [ ] | [ ] |
| `scripts/` | [ ] | [ ] |
| `temp/` | [ ] | [ ] |
| `app/` | [ ] | [ ] |

```bash
# Comando de referência (não executar em produção sem aprovação)
sudo mkdir -p /opt/impetus/{config,uploads,logs,database,backups,runtime,licenses,certificates,data,monitoring,scripts,temp,app}
sudo chown -R impetus:impetus /opt/impetus
sudo chmod 750 /opt/impetus
```

---

## F. Dependências instaladas (Parte 5)

| Componente | Instalado | Versão registada |
|------------|:---------:|------------------|
| Node.js 20 LTS | [ ] | [___] |
| npm | [ ] | [___] |
| PM2 | [ ] | [___] |
| Docker Engine | [ ] | [___] |
| Docker Compose (plugin) | [ ] | [___] |
| PostgreSQL 14+ | [ ] | [___] |
| OpenSSL | [ ] | [___] |
| Git | [ ] | [___] |
| Nginx | [ ] | [___] |

---

## G. Segurança (Parte 6)

> **Não** incluir segredos neste documento em trânsito. Usar cofre seguro para valores reais.

| Campo | Configurado | Local / Notas |
|-------|:-----------:|---------------|
| `JWT_SECRET` | [ ] | `/opt/impetus/config/.env` |
| `IMPETUS_ADMIN_JWT_SECRET` | [ ] | idem |
| `LICENSE_PUBLIC_KEY` / ficheiro licença | [ ] | `/opt/impetus/licenses/` |
| Firewall (ufw/iptables/security group) | [ ] | [___] |
| TLS / HTTPS | [ ] | [___] |
| DNS resolvendo FQDN | [ ] | [___] |
| Backups agendados | [ ] | cron + `backup-enterprise.js` |
| User dedicado (não root) | [ ] | `impetus` |
| Permissões IMPETUS_HOME | [ ] | `impetus:impetus` |

---

## H. Docker (Parte 7) — documentação apenas

| Item | Valor / Estado |
|------|----------------|
| Docker Engine | [___] |
| Compose | `docker compose` v2 |
| Volumes nomeados | conforme `docker-compose.yml` (não alterar) |
| Redes | `impetus-internal` (conforme CONTAINER-01) |
| Restart policy | `unless-stopped` |
| Healthchecks | conforme compose certificado |
| Logs Docker | `json-file` + rotação recomendada |

**Nota:** não modificar `docker-compose.yml` nem Dockerfiles durante provisionamento.

---

## I. PostgreSQL (Parte 8)

| Campo | Valor |
|-------|-------|
| **Versão** | [___] |
| **Encoding** | UTF8 |
| **Locale** | [___] |
| **Host** | `127.0.0.1` (recomendado) |
| **Porta** | `5432` |
| **Database homologação** | `impetus_staging` ou `impetus_db` |
| **Utilizador aplicação** | [___] |
| **Senha** | [cofre seguro — não documentar em claro] |
| **Backup** | `backup-enterprise.js` → `/opt/impetus/backups/` |
| **Restore** | `restore-enterprise.js` |

**Homologação:** base **limpa** — sem dump de produção até fase controlada ROLLBACK-01.

---

## J. Checklist homologação (Parte 9)

Preencher após provisionamento. Comandos em `/opt/impetus/app/backend`.

| Etapa | Data | Responsável | Resultado | Observações |
|-------|------|-------------|-----------|-------------|
| **STAGING-01** `enterprise:staging-provisioning` | [___] | [___] | [ ] APROVADA / [ ] REPROVADA | [___] |
| **ENV-QUALIFICATION** `enterprise:env-qualification` | [___] | [___] | [ ] APROVADA / [ ] REPROVADA | [___] |
| **ROLLBACK-01** `enterprise:rollback-validation` | [___] | [___] | [ ] APROVADA / [ ] REPROVADA | [___] |
| **VALIDATION-01** `enterprise:homologation` | [___] | [___] | [ ] HOMOLOGADA / [ ] NÃO HOMOLOGADA | [___] |
| **GO-LIVE** | [___] | [___] | [ ] Autorizado / [ ] Proibido | [___] |

---

## K. Inventário consolidado (Parte 10)

| Campo | Valor |
|-------|-------|
| Fornecedor Cloud | [___] |
| Região | [___] |
| Hostname | [___] |
| CPU (vCPUs) | [___] |
| RAM (GB) | [___] |
| Disco (GB / tipo) | [___] |
| Docker (versão) | [___] |
| PM2 (versão) | [___] |
| PostgreSQL (versão) | [___] |
| IP público | [___] |
| DNS / FQDN | [___] |
| Certificado TLS | [___] |
| Utilizador SSH | [___] |
| Data provisionamento | [___] |
| Responsável | [___] |

---

## L. Assinaturas

| Papel | Nome | Data | Assinatura |
|-------|------|------|------------|
| Fornecedor / Infra cliente | [___] | [___] | [___] |
| Equipa IMPETUS | [___] | [___] | [___] |

---

## Anexos

- `VM-SPECIFICATION.md`
- `CHECKLIST-PROVISIONAMENTO.md`
- `MANUAL-PROVISIONAMENTO.md`
- `docker/config/env.enterprise.example`

**Evidências pós-provisionamento:** `backend/docs/evidence/provisioning-01/`
