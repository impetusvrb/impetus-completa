# VM-SPECIFICATION — IMPETUS Enterprise On-Premise

**Certificação:** CERT-ENTERPRISE-PROVISIONING-01  
**Versão:** 1.0 · 2026-07-01  
**Contrato:** CERT-ONPREM-INFRA-01 · ADR-010–019

---

## 1. Sistema operacional

| Opção | Suportado | Notas |
|-------|:---------:|-------|
| Ubuntu Server 22.04 LTS | ✅ | **Recomendado** para homologação e produção |
| Ubuntu Server 24.04 LTS | ✅ | Compatível; validar PostgreSQL 14+ e Node 20 |
| Outras distribuições | ❌ | Não homologadas sem certificação adicional |

**Arquitetura:** `x86_64` (amd64). ARM64 apenas com validação explícita.

---

## 2. CPU

| Perfil | vCPUs | Uso |
|--------|-------|-----|
| **Mínimo** | 2 | Homologação, piloto single-fábrica |
| **Recomendado** | 4 | Homologação completa + Docker + PM2 |
| **Escalável** | 8 | Produção média |
| **Escalável** | 16 | Múltiplos módulos cognitivos ativos |
| **Escalável** | 32+ | Grande volume Event Backbone / telemetria |

---

## 3. Memória (RAM)

| Perfil | RAM | Uso |
|--------|-----|-----|
| **Mínimo** | 8 GB | Homologação |
| **Recomendado** | 16 GB | Homologação + restore DR |
| **Grande instalação** | 32 GB | Produção industrial |
| **Grande instalação** | 64 GB | Alta carga cognitiva + PostgreSQL local |

Reservar headroom para `pg_restore` e extract de backups (picos durante DR).

---

## 4. Disco

| Atributo | Especificação |
|----------|---------------|
| **Tipo** | SSD obrigatório; **NVMe preferencial** |
| **Mínimo** | 40 GB |
| **Recomendado** | 80 GB |
| **Produção industrial** | 160 GB+ |
| **Espaço livre antes homologação** | **≥ 20 GB** (obrigatório) |
| **Preferencial** | ≥ 40 GB livres |

### Cálculo DR (referência)

```
espaço_livre ≥ (2 × maior_backup_GB) + 1,75 GB
```

Exemplo: backup 2,5 GB → mínimo ~**7,25 GB** livres para teste restore; manter **≥ 20 GB** como margem operacional.

---

## 5. IMPETUS_HOME (obrigatório)

```
/opt/impetus/
```

Ver layout completo em `HANDOFF-INFRASTRUCTURE.md` § Layout Enterprise.

---

## 6. Utilizador dedicado

| Atributo | Valor |
|----------|-------|
| Username | `impetus` |
| Shell | `/bin/bash` |
| Grupos | `impetus`, `docker` |
| Serviços Enterprise | **Nunca** root |

---

## 7. Runtime (versões de referência)

| Componente | Versão mínima | Referência homologação |
|------------|---------------|------------------------|
| Node.js | 20.x LTS | v20.20+ |
| PM2 | 6.x | 6.0+ |
| PostgreSQL | 14+ | 14.23+ |
| Docker Engine | 24+ | CE estável |
| Docker Compose | v2 plugin | `docker compose` |
| OpenSSL | 3.x (Ubuntu 22.04+) | sistema |
| Git | 2.34+ | sistema |
| Nginx | 1.18+ | reverse proxy TLS |

---

## 8. Perfis de sizing por fornecedor (exemplos)

> Nomes de instância são **indicativos**. Equivaler vCPU/RAM/disco à tabela acima.

| Perfil | vCPU | RAM | Disco | Exemplos cloud |
|--------|------|-----|-------|----------------|
| Homologação mínima | 2 | 8 GB | 40 GB SSD | AWS t3.large, Azure B2s, DO 4GB, Hetzner CX22 |
| Homologação recomendada | 4 | 16 GB | 80 GB NVMe | AWS t3.xlarge, Azure D4s v5, DO 8GB, Hetzner CX32 |
| Produção industrial | 8+ | 32 GB+ | 160 GB+ NVMe | AWS m6i.2xlarge, Azure D8s v5, bare metal |

---

## 9. O que o fornecedor **não** precisa decidir

- Estrutura de pastas → fixa (`/opt/impetus/...`)
- Método de deploy canónico → PM2 (Docker adicional via CONTAINER-01)
- Formato backup → `backup-enterprise.js` + manifest SHA-256
- Licenciamento → offline Ed25519 (LICENSE-01)

Tudo definido nas certificações de produto; esta spec apenas dimensiona o host.
