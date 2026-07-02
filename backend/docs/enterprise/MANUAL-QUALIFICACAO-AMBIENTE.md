# Manual — Qualificação do Ambiente de Homologação

**Certificação:** CERT-ENTERPRISE-ENV-QUALIFICATION-01

---

## 1. Objectivo

Comprovar que o host (ou VM) destinado à homologação Enterprise possui recursos e serviços suficientes **antes** de executar VALIDATION-01 ou re-executar ROLLBACK-01.

Esta qualificação **não altera software** — apenas audita infraestrutura.

---

## 2. Quando executar

- **Antes** da primeira homologação Enterprise num host novo
- **Antes** de re-executar ROLLBACK-01 após reprovação por infraestrutura
- **Antes** de re-executar VALIDATION-01 completa
- Após alterações significativas de disco, Docker ou PostgreSQL no host

---

## 3. Pré-requisitos mínimos

| Recurso | Mínimo | Preferencial |
|---------|--------|--------------|
| Disco livre | ≥ 10 GB | ≥ 20 GB |
| RAM | ≥ 4 GB | ≥ 8 GB |
| CPU | ≥ 2 cores | ≥ 4 cores |
| Node.js | 20.x LTS | 20.x LTS |
| PostgreSQL | 14+ | 14+ |
| PM2 | instalado | instalado |
| Docker Engine | instalado | instalado |
| Docker Compose | v2+ | v2+ |

### Capacidade DR

Espaço livre ≥ **2× maior backup** + ~1,75 GB (temp + WAL + logs).

Exemplo: backup 2,4 GB → requer ~**6,5 GB** livres para restore completo.

---

## 4. Execução

```bash
cd backend
npm run enterprise:env-qualification
npm run enterprise:env-qualification -- --json
```

**Exit code 0** = ambiente **APROVADO** para homologação.  
**Exit code 1** = **REPROVADO** — consultar NCs no relatório JSON.

Evidências: `docs/evidence/environment-qualification-01/`

---

## 5. Checklist manual (complementar)

- [ ] `IMPETUS_HOME` definido (recomendado `/opt/impetus`) ou layout legacy documentado
- [ ] User dedicado `impetus` (não root) para homologação final
- [ ] `config/`, `uploads/`, `data/`, `backups/`, `logs/`, `licenses/`, `runtime/` com escrita
- [ ] Backup válido existente para testes DR
- [ ] Firewall e portas documentadas
- [ ] Variáveis sensíveis presentes (`JWT_SECRET`, `DATABASE_URL`, etc.)

---

## 6. Interpretação de NCs

| NC típica | Significado | Acção |
|-----------|-------------|-------|
| NC-EQ001 | Disco insuficiente | Libertar espaço ou migrar VM |
| NC-EQ002 | Docker ausente | Instalar Docker Engine |
| NC-EQ003 | Capacidade DR | Aumentar disco ou reduzir retenção backups |
| NC-EQ004 | Execução como root | Criar user `impetus` (INFRA-01) |

**NCs de ambiente não exigem certificação corretiva de código.**

---

## Sequência recomendada

```
1. PROVISIONING-01 (spec) — HANDOFF-INFRASTRUCTURE.md
2. Provisionar VM (fornecedor)
3. npm run enterprise:staging-provisioning  → APROVADA
4. npm run enterprise:env-qualification       → APROVADA
5. npm run enterprise:rollback-validation     → APROVADA
6. npm run enterprise:homologation            → HOMOLOGADA
7. Go-Live (MANUAL-GO-LIVE.md)
```

---

## Referências

- `CERT-ENTERPRISE-ENV-QUALIFICATION-01.md`
- `CERT-ENTERPRISE-ROLLBACK-01.md`
- `CERT-ONPREM-VALIDATION-01.md`
- `CERT-ONPREM-INFRA-01.md` (layout IMPETUS_HOME)
- `MANUAL-DR.md`
