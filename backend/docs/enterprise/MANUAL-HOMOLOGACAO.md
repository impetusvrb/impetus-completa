# Manual — Homologação Enterprise

**Certificação:** CERT-ONPREM-VALIDATION-01

---

## 1. Propósito

Este manual guia a **homologação oficial** da plataforma Enterprise — não é desenvolvimento.

**Proibido:** alterar código da aplicação durante homologação. Falhas → NC → certificação corretiva.

**Pré-requisito operacional:** spec `PROVISIONING-01` → VM staging `STAGING-01` APROVADA → `ROLLBACK-01` + `VALIDATION-01` → liberação `GOLIVE-01` ([`MANUAL-GOLIVE-ENTERPRISE.md`](./MANUAL-GOLIVE-ENTERPRISE.md)).

---

## 2. Instalação limpa PM2 (Parte 2)

### 2.1 Ambiente

- VM ou host dedicado (sem dados prévios IMPETUS)
- PostgreSQL 14+
- Node 20 LTS
- Nginx + PM2

### 2.2 Procedimento

```bash
export IMPETUS_HOME=/opt/impetus
# Seguir MANUAL-BOOTSTRAP.md + CERT-ONPREM-INFRA-01 Anexo A

cp docker/config/env.enterprise.example $IMPETUS_HOME/config/.env
# Perfil PM2: LISTEN_HOST=127.0.0.1 (sem ALLOW_PUBLIC_BIND)

cd /var/www/impetus-completa/backend
bash scripts/enterprise/install-enterprise.sh

pm2 start ../ecosystem.config.js --env production
pm2 save

curl -sf http://127.0.0.1:4000/health
bash scripts/enterprise/health-enterprise.sh
node scripts/enterprise/verify-enterprise.js
```

### 2.3 Checklist funcional

- [ ] Login admin bootstrap  
- [ ] Upload ficheiro + leitura `/uploads`  
- [ ] Licença `license-admin status`  
- [ ] Logs PM2 + paths IMPETUS_HOME  
- [ ] Event Backbone (modo env) — logs `[EVENT]`  
- [ ] Pulse / Controller — sem erro fatal no boot  

**Evidência:** capturas + JSON `validation-homologation.js --json`

---

## 3. Instalação limpa Docker (Parte 3)

```bash
export IMPETUS_HOME=/opt/impetus-docker-test
cp docker/config/env.enterprise.example $IMPETUS_HOME/config/.env
cp docker/config/compose.env.example .env

docker compose up -d --build
bash docker/scripts/container-smoke.sh

docker compose exec backend pm2 list
docker compose exec frontend pm2 list
```

Repetir checklist §2.3 via nginx (`http://localhost/`).

---

## 4. Compatibilidade PM2 × Docker (Parte 4)

Executar **os mesmos casos de teste** em ambos os ambientes:

| Caso | PM2 | Docker | Igual? |
|------|:---:|:------:|:------:|
| POST /api/auth/login | | | |
| GET /api/health | | | |
| WebSocket socket.io | | | |
| Upload + GET /uploads/x | | | |
| license-admin status | | | |
| Resposta 403 /api/impetus-admin (Docker nginx) | N/A host | | |

---

## 5. Persistência (Parte 5)

```bash
# Criar artefacto identificável
echo "validation-$(date +%s)" > $IMPETUS_HOME/uploads/homologation-marker.txt

# Reiniciar 3×
pm2 restart ecosystem.config.js --env production
# ou: docker compose restart backend frontend

# Verificar marker + data/ cognitivo intacto
cat $IMPETUS_HOME/uploads/homologation-marker.txt
node scripts/enterprise/verify-enterprise.js
```

---

## 6. Backup e restore (Parte 6)

```bash
node scripts/enterprise/backup-enterprise.js
# Anotar path do archive

# Em VM limpa ou diretório IMPETUS_HOME novo:
node scripts/enterprise/restore-enterprise.js --dry-run --archive=...
node scripts/enterprise/restore-enterprise.js --archive=... --yes

node scripts/enterprise/verify-enterprise.js
# Login admin, uploads, licença
```

---

## 7. Update A→B (Parte 7)

Simular ciclo de vida real:

1. **Versão A** operacional com dados (empresas, users, uploads, estado cognitivo)  
2. `update-precheck.js` + `backup-enterprise.js`  
3. Deploy **Versão B** (git tag / imagem)  
4. Migrations automáticas  
5. Verificar: BD, licença, uploads, `data/`, config  

**Docker:** `docker compose up -d --build` preservando volume.

---

## 8. Rollback (Parte 8)

Ver [`MANUAL-ROLLBACK.md`](./MANUAL-ROLLBACK.md).

---

## 9. Regressão cognitiva (Parte 9)

Validar **comportamento unchanged** (não optimizar):

- Controller Cognitivo — endpoint / fluxo representativo  
- Pulse — snapshot/memória conforme flags  
- Conversation Context Engine  
- Event Backbone — ingestão shadow ou active  
- Gêmeo Digital — load básico  
- ANAM — se `ANAM_API_KEY` configurada  
- Executive / Workflow — smoke navegação  

Registar logs antes/depois update (Parte 7).

---

## 10. Segurança operacional (Parte 10)

- JWT inválido → 401  
- RBAC role insuficiente → 403  
- `company_id` preservado em requests  
- CORS `ALLOWED_ORIGINS`  
- HTTPS (se configurado)  
- Rate limit nginx `/api/`  
- Upload path traversal negado  

---

## 11. Performance básica (Parte 11)

Medir e registar (sem alterar código):

| Métrica | PM2 | Docker |
|---------|-----|--------|
| Tempo boot → /health OK | | |
| Tempo migrations (BD vazia) | | |
| Tempo bootstrap | | |
| RSS backend (pm2 monit / docker stats) | | |
| p95 GET /health (10 req) | | |

---

## 12. Orquestrador

```bash
cd backend && npm run enterprise:homologation
```

Anexar JSON gerado em `docs/evidence/validation-01/` ao relatório final.

---

## Referências

- `CERT-ONPREM-VALIDATION-01.md`
- `MATRIZ-CONFORMIDADE-VALIDATION.md`
- `MANUAL-GO-LIVE.md`
- `MANUAL-ROLLBACK.md`
- `MANUAL-QUALIFICACAO-AMBIENTE.md`
- `MANUAL-STAGING.md`
- `MANUAL-PROVISIONAMENTO.md`
- `MANUAL-GOLIVE-ENTERPRISE.md`
- `CHECKLIST-GOLIVE.md`
- `GO-LIVE-DECISION-RECORD.md`
