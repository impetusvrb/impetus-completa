# CERT-ENTERPRISE-PROVISIONING-01 — Especificação Oficial de Provisionamento da VM Enterprise

**Tipo:** Certificação Operacional (exclusivamente documental)  
**Prioridade:** Alta  
**Data:** 2026-07-01  
**Status:** **CERTIFICADO**  
**Código alterado:** **Nenhum**

---

## Declaração

Esta certificação **não instala nem configura infraestrutura**. Entrega a **especificação oficial e reutilizável** para qualquer fornecedor (AWS, Azure, OCI, Hetzner, OVH, Vultr, DigitalOcean, bare metal ou datacenter do cliente) provisionar uma VM compatível com a arquitetura Enterprise certificada.

Encerra a **fase de preparação documental** do produto Enterprise. A partir daqui, o fluxo é **execução operacional** em ambiente provisionado.

---

## Pré-requisitos (certificações de produto)

| Certificação | Status |
|--------------|:------:|
| FORENSICS-01 | ✅ |
| ARCHITECTURE-01 | ✅ |
| INFRA-01 | ✅ |
| DATA-01 | ✅ |
| LICENSE-01 | ✅ |
| CONTAINER-01 | ✅ |
| BACKUP-01 | ✅ |
| ROLLBACK-01 | ⚠️ executada (re-exec em staging) |
| ENV-QUALIFICATION-01 | ⚠️ executada (re-exec em staging) |
| STAGING-01 | ⚠️ orquestrador pronto; VM pendente |

---

## Sequência operacional (ordem corrigida)

```
Certificações de produto ✅
        ↓
ENV-QUALIFICATION (requisitos mínimos definidos)
        ↓
PROVISIONING-01 ✅  ← especificação oficial (este documento)
        ↓
STAGING-01        ← VM criada conforme spec → APROVADA
        ↓
ROLLBACK-01 (re-exec) → VALIDATION-01 (re-exec) → GO-LIVE
```

**Regra:** a especificação existe **antes** da VM ser certificada como staging oficial.

---

## Artefactos entregues (Parte 12)

| Documento | Path | Função |
|-----------|------|--------|
| Certificação | `docs/CERT-ENTERPRISE-PROVISIONING-01.md` | Este documento |
| Manual | `docs/enterprise/MANUAL-PROVISIONAMENTO.md` | Guia completo Ops |
| Checklist | `docs/enterprise/CHECKLIST-PROVISIONAMENTO.md` | Verificação campo a campo |
| VM Spec | `docs/enterprise/VM-SPECIFICATION.md` | Sizing e SO |
| Handoff | `docs/enterprise/HANDOFF-INFRASTRUCTURE.md` | Documento para fornecedor |
| Evidências | `docs/evidence/provisioning-01/` | Inventários preenchidos pós-provisionamento |

---

## PARTE 1 — Especificação da VM (resumo)

Ver `VM-SPECIFICATION.md` para detalhe completo.

| Recurso | Mínimo | Recomendado | Industrial |
|---------|--------|-------------|------------|
| SO | Ubuntu 22.04 / 24.04 LTS | 22.04 LTS | 22.04 LTS |
| CPU | 2 vCPUs | 4 vCPUs | 8–32+ vCPUs |
| RAM | 8 GB | 16 GB | 32–64 GB |
| Disco | 40 GB SSD | 80 GB NVMe | 160 GB+ NVMe |
| Livre pré-homologação | ≥ 20 GB | ≥ 40 GB | conforme RPO/RTO |

---

## PARTE 2–10

Campos editáveis, checklists e tabelas de inventário estão em:

- `HANDOFF-INFRASTRUCTURE.md` — rede, acessos, segurança, banco, homologação
- `CHECKLIST-PROVISIONAMENTO.md` — verificação operacional
- `MANUAL-PROVISIONAMENTO.md` — procedimentos e referências cruzadas

---

## PARTE 11 — Evidências

Após provisionamento real, arquivar em `docs/evidence/provisioning-01/`:

| Ficheiro sugerido | Conteúdo |
|-------------------|----------|
| `inventory-{hostname}-{date}.json` | Inventário preenchido (template em HANDOFF) |
| `handoff-signed-{date}.pdf` | Handoff assinado pelo fornecedor (opcional) |
| `staging-provisioning-*.json` | Resultado STAGING-01 após VM criada |

---

## Critérios de aceite

| Critério | Atendido |
|----------|:--------:|
| Nenhum código alterado | ✅ |
| Nenhuma configuração alterada | ✅ |
| Nenhum script modificado | ✅ |
| Especificação reutilizável multi-cloud | ✅ |
| Layout `/opt/impetus` conforme INFRA-01 | ✅ |
| Checklist homologação com campos Data/Responsável/Resultado | ✅ |

**CERT-ENTERPRISE-PROVISIONING-01: CERTIFICADO**

---

## Pendências antes da homologação

| Item | Responsável | Estado |
|------|-------------|--------|
| Provisionar VM conforme HANDOFF | Infra / Cliente | ⏳ Pendente |
| Preencher inventário | Infra | ⏳ |
| `enterprise:staging-provisioning` → APROVADA | Ops | ⏳ |
| `enterprise:env-qualification` → APROVADA | Ops | ⏳ |
| `enterprise:rollback-validation` → APROVADA | Ops | ⏳ |
| `enterprise:homologation` → HOMOLOGADA | QA/Ops | ⏳ |
| Go-Live | Produto + Cliente | ⏳ Estrutura GOLIVE-01 pronta; **proibido** até homologação |

---

## Referências

- `CERT-ONPREM-INFRA-01.md` · `CERT-ONPREM-DATA-01.md` · `CERT-ONPREM-CONTAINER-01.md`
- `CERT-ENTERPRISE-STAGING-01.md` · `MANUAL-STAGING.md`
- `docker/config/env.enterprise.example`
