# Manual — Provisionamento do Ambiente Staging Enterprise

**Certificação:** CERT-ENTERPRISE-STAGING-01  
**Pré-requisito:** `CERT-ENTERPRISE-PROVISIONING-01` — spec oficial em `HANDOFF-INFRASTRUCTURE.md` e `VM-SPECIFICATION.md`  
**Referências:** INFRA-01 · DATA-01 · ENV-QUALIFICATION-01 · MANUAL-PROVISIONAMENTO.md

---

## 1. Objectivo

Provisionar uma **VM dedicada** para homologação Enterprise — separada da produção.

**Ordem:** PROVISIONING (spec) → criar VM → **este manual** → `enterprise:staging-provisioning` até APROVADA.

Este manual descreve passos **operacionais** executados por infra/Ops. O orquestrador **valida**; não provisiona automaticamente.

---

## 2. Especificação da VM

Ver **`VM-SPECIFICATION.md`** para sizing completo e exemplos multi-cloud.

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| SO | Ubuntu Server 22.04 LTS | 22.04 LTS |
| vCPU | 2 | 4 |
| RAM | 8 GB | 16 GB |
| Disco | 40 GB | 80 GB SSD |
| Livre p/ homologação | ≥ 20 GB | ≥ 40 GB |

**Hostname sugerido:** `impetus-staging`  
**IMPETUS_HOME:** `/opt/impetus`  
**User:** `impetus`

---

## 3. Provisionamento — ordem recomendada

### 3.1 SO e pacotes base

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw nginx postgresql postgresql-contrib \
  ca-certificates gnupg lsb-release
```

### 3.2 Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x
```

### 3.3 PM2

```bash
sudo npm install -g pm2
pm2 -v
```

### 3.4 Docker Engine + Compose

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
docker --version
docker compose version
```

### 3.5 Utilizador dedicado

```bash
sudo useradd -r -m -s /bin/bash impetus
sudo usermod -aG docker impetus
```

### 3.6 IMPETUS_HOME

```bash
sudo mkdir -p /opt/impetus/{config,uploads,logs,database,data,runtime,temp,backups,certificates,licenses,monitoring,scripts,app}
sudo chown -R impetus:impetus /opt/impetus
sudo chmod 750 /opt/impetus
```

### 3.7 PostgreSQL (ambiente limpo)

```bash
sudo -u postgres createuser -P impetus
sudo -u postgres createdb -O impetus impetus_staging
# NÃO restaurar dump de produção nesta fase
```

Configurar `DATABASE_URL` em `/opt/impetus/config/.env` (copiar de `docker/config/env.enterprise.example`).

### 3.8 Código da aplicação

```bash
sudo -u impetus git clone <repo-url> /opt/impetus/app
cd /opt/impetus/app/backend && sudo -u impetus npm ci
cd /opt/impetus/app/frontend && sudo -u impetus npm ci && sudo -u impetus npm run build
```

### 3.9 Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 4. Validação (sem subir produção)

Como user `impetus`:

```bash
export IMPETUS_HOME=/opt/impetus
cd /opt/impetus/app/backend

npm run enterprise:staging-provisioning
npm run enterprise:staging-provisioning -- --json
```

**Exit 0** = staging **APROVADO**.

Evidências: `docs/evidence/staging-01/`

---

## 5. Sequência pós-aprovação

```bash
npm run enterprise:env-qualification      # confirmação
npm run enterprise:rollback-validation    # DR
npm run enterprise:homologation           # VALIDATION-01 completa
```

---

## 6. O que NÃO fazer

- Não usar host de produção como staging
- Não restaurar dump de produção na VM staging (até fase controlada de ROLLBACK-01)
- Não executar homologação como `root`
- Não alterar código/Dockerfiles durante provisionamento

---

## 7. Troubleshooting NCs comuns

| NC | Resolução |
|----|-----------|
| NC-ST001 | Aumentar disco ou libertar espaço (≥ 20 GB) |
| NC-ST002/003 | Instalar Docker (§3.4) |
| NC-ST004+ | Criar árvore `/opt/impetus` (§3.6) |
| NC-ST017/018 | Criar user `impetus`; executar cert como impetus |
| NC-ST019 | BD limpa — recriar `impetus_staging` vazia |

---

## Referências

- `CERT-ENTERPRISE-PROVISIONING-01.md`
- `HANDOFF-INFRASTRUCTURE.md` · `CHECKLIST-PROVISIONAMENTO.md`
- `CERT-ENTERPRISE-STAGING-01.md`
- `MANUAL-PROVISIONAMENTO.md` · `MANUAL-QUALIFICACAO-AMBIENTE.md`
- `MANUAL-HOMOLOGACAO.md`
- `CERT-ONPREM-INFRA-01.md`
