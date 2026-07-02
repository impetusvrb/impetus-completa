# Manual — Provisionamento Enterprise (Multi-Cloud)

**Certificação:** CERT-ENTERPRISE-PROVISIONING-01  
**Audiência:** Infraestrutura, fornecedores cloud, datacenter do cliente

---

## 1. Propósito

Este manual é o **guia operacional** para provisionar uma VM IMPETUS Enterprise compatível com todas as certificações de produto.

- **Não altera** código, Docker, PM2 nem arquitectura
- **Complementa** `HANDOFF-INFRASTRUCTURE.md` (documento de entrega)
- **Precede** a certificação STAGING-01 (validação da VM criada)

---

## 2. Ordem correcta do fluxo

```
1. Ler VM-SPECIFICATION.md + HANDOFF-INFRASTRUCTURE.md
2. Provisionar VM (fornecedor / Ops)
3. Preencher CHECKLIST-PROVISIONAMENTO.md
4. npm run enterprise:staging-provisioning  → APROVADA
5. npm run enterprise:env-qualification
6. npm run enterprise:rollback-validation
7. npm run enterprise:homologation
8. Go-Live (apenas se HOMOLOGADA + GOLIVE-01 AUTORIZADO)
```

---

## 3. Documentos do pacote de provisionamento

| Documento | Quando usar |
|-----------|-------------|
| `VM-SPECIFICATION.md` | Dimensionamento e sizing |
| `HANDOFF-INFRASTRUCTURE.md` | Entrega formal ao fornecedor |
| `CHECKLIST-PROVISIONAMENTO.md` | Verificação campo a campo |
| `MANUAL-STAGING.md` | Comandos de instalação na VM |
| `MANUAL-QUALIFICACAO-AMBIENTE.md` | Após VM criada |
| `docker/config/env.enterprise.example` | Template `.env` |

---

## 4. Requisitos por perfil

### Homologação (mínimo)

- 2 vCPU · 8 GB RAM · 40 GB SSD · ≥ 20 GB livres
- Ubuntu 22.04 LTS
- `/opt/impetus` + user `impetus`
- Docker + PM2 + PostgreSQL 14+

### Homologação (recomendado)

- 4 vCPU · 16 GB RAM · 80 GB NVMe · ≥ 40 GB livres

### Produção industrial

- 8+ vCPU · 32+ GB RAM · 160+ GB NVMe
- Mesmo layout; backups diários; monitorização

---

## 5. Provisionamento por tipo de fornecedor

### Cloud pública (AWS, Azure, GCP, OCI)

1. Criar VM conforme `VM-SPECIFICATION.md`
2. Security group: 22 (restrito), 80, 443
3. Disco SSD/NVMe separado se possível
4. Seguir `MANUAL-STAGING.md` §3 na instância

### VPS (Hetzner, OVH, Vultr, DigitalOcean)

1. Seleccionar plano com RAM/disco conforme spec
2. Ubuntu 22.04 image
3. Anexar volume adicional se disco root < 80 GB

### Bare metal / datacenter cliente

1. Confirmar Ubuntu 22.04/24.04
2. RAID/storage conforme política cliente
3. Entregar `HANDOFF-INFRASTRUCTURE.md` preenchido

---

## 6. Layout Enterprise (obrigatório)

```
/opt/impetus/
├── config/          # .env Enterprise
├── app/             # clone repositório IMPETUS
├── uploads/
├── data/            # estado cognitivo JSON
├── database/        # dados PG locais (se aplicável)
├── backups/
├── logs/
├── licenses/
├── certificates/
├── runtime/
├── temp/
├── monitoring/
└── scripts/
```

Referência canónica: `CERT-ONPREM-INFRA-01.md` · `impetusHome.js` (DATA-01).

---

## 7. Variáveis críticas (não commitar)

Gerar em cofre seguro; gravar em `/opt/impetus/config/.env`:

| Variável | Obrigatória homologação |
|----------|:-----------------------:|
| `IMPETUS_HOME` | ✅ |
| `DATABASE_URL` | ✅ |
| `JWT_SECRET` | ✅ |
| `IMPETUS_ADMIN_JWT_SECRET` | ✅ |
| `FRONTEND_URL` | ✅ |
| `ALLOWED_ORIGINS` | ✅ |

Template: `docker/config/env.enterprise.example`

---

## 8. Docker e PM2

- **PM2** é runtime canónico de produção (INFRA-01, CONTAINER-01)
- **Docker** é distribuição adicional — não substitui PM2
- **Proibido** alterar `docker-compose.yml` ou Dockerfiles durante provisionamento
- Validar com `enterprise:staging-provisioning` (Parte 5 e 7)

---

## 9. Evidências

Após provisionamento, arquivar em `backend/docs/evidence/provisioning-01/`:

```
inventory-{hostname}-{YYYY-MM-DD}.json   # cópia do inventário HANDOFF §K
handoff-filled-{date}.md                 # HANDOFF preenchido (sem segredos)
```

Resultados de validação vão para `staging-01/`, `environment-qualification-01/`, etc.

### Template inventário JSON

```json
{
  "certification": "CERT-ENTERPRISE-PROVISIONING-01",
  "hostname": "",
  "provider": "",
  "region": "",
  "provisioned_at": "",
  "responsible": "",
  "cpu_vcpus": 0,
  "ram_gb": 0,
  "disk_gb": 0,
  "disk_free_gb": 0,
  "docker_version": "",
  "pm2_version": "",
  "postgresql_version": "",
  "public_ip": "",
  "fqdn": "",
  "tls_issuer": "",
  "ssh_user": "",
  "impetus_home": "/opt/impetus"
}
```

---

## 10. O que não fazer

- Não usar host de produção como homologação
- Não restaurar dump de produção na VM staging inicial
- Não executar serviços como root
- Não modificar código ou scripts Enterprise durante provisionamento
- Não avançar para Go-Live sem VALIDATION-01 HOMOLOGADA

---

## Referências

- `CERT-ENTERPRISE-PROVISIONING-01.md`
- `CERT-ENTERPRISE-STAGING-01.md`
- `CERT-ONPREM-INFRA-01.md`
- `MANUAL-HOMOLOGACAO.md` · `MANUAL-GO-LIVE.md`
