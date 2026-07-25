# INCIDENT_MASTER_REPORT — Dossiê Oficial de Incidentes de Segurança IMPETUS

**Programa:** INCIDENT-KNOWLEDGE-BASE-01  
**Tipo:** Registro oficial permanente  
**Modo de criação:** Auditoria documental read-only (sem alteração de runtime)  
**Data de consolidação:** 2026-07-04  
**Servidor:** `srv1422313.hstgr.cloud` / `72.61.221.152`  
**Repositório:** `/var/www/impetus-completa`

---

## Propósito

Este dossiê responde definitivamente:

> **Tudo o que sabemos sobre todos os incidentes de segurança ocorridos no IMPETUS desde o início do projecto.**

Preserva conhecimento técnico, histórico, decisões, investigações forenses, evidências e lições aprendidas para auditorias futuras, conformidade e evolução da plataforma.

---

## Resumo executivo

| # | Incidente | Período | Severidade | Status |
|---|-----------|---------|------------|--------|
| 01 | Deleção filesystem (1.ª ocorrência) | 2026-06-04 | Crítico operacional | Recuperável via Git |
| 02 | Campanha scan AWS (Ohio) | 2026-07-02/03 | Médio (reconhecimento) | Contido — sem exfiltração HTTP comprovada |
| 03 | Scanner Vultr (2.º cloud scanner) | 2026-07 (SEC-03) | Baixo-médio | Campanha independente (não confirmada) |
| 04 | Deleção filesystem (2.ª ocorrência) | 2026-07-03 | Crítico operacional | Restaurado (HARDENING-01) |
| 05 | Campanha Silvy X Ran | 2026-07-04 | Médio (scan) | Mitigado (HARDENING-02) |

**Veredito global de exfiltração:** **NÃO comprovada via HTTP** (confiança alta). **INCONCLUSIVO via SSH** (lacuna auditd/netflow). Ver [`INCIDENT_FINAL_REPORT.md`](./INCIDENT_FINAL_REPORT.md).

---

## Mapa do dossiê

| Parte | Documento | Conteúdo |
|-------|-----------|----------|
| 1 | [`INCIDENT_TIMELINE.md`](./INCIDENT_TIMELINE.md) | Linha do tempo completa |
| 2–5 | [`INCIDENT_TECHNICAL_ANALYSIS.md`](./INCIDENT_TECHNICAL_ANALYSIS.md) | Incidentes 01–05 em profundidade |
| 6 | [`INCIDENT_EVIDENCE_INDEX.md`](./INCIDENT_EVIDENCE_INDEX.md) | Catálogo de evidências |
| 7 | [`INCIDENT_FINAL_REPORT.md`](./INCIDENT_FINAL_REPORT.md) | Conclusões técnicas (SIM/NÃO/PARCIAL/INCONCLUSIVO) |
| 8 | [`INCIDENT_RESPONSE_EVOLUTION.md`](./INCIDENT_RESPONSE_EVOLUTION.md) | Mecanismos HARDENING + SEC-01→20 |
| 9 | [`INCIDENT_SECURITY_EVOLUTION.md`](./INCIDENT_SECURITY_EVOLUTION.md) | Evolução de maturidade |
| 10 | [`INCIDENT_ARCHITECTURE_IMPACT.md`](./INCIDENT_ARCHITECTURE_IMPACT.md) | Impacto arquitectural |
| 11 | [`INCIDENT_LESSONS_LEARNED.md`](./INCIDENT_LESSONS_LEARNED.md) | Lições aprendidas |
| 12 | [`INCIDENT_KNOWLEDGE_BASE.md`](./INCIDENT_KNOWLEDGE_BASE.md) | IOCs, TTPs, procedimentos permanentes |

---

## PARTE 1 — Histórico cronológico (síntese)

Ver linha do tempo completa em [`INCIDENT_TIMELINE.md`](./INCIDENT_TIMELINE.md).

### Incidentes por data

1. **2026-06-04 ~02:09 UTC** — 195 ficheiros `backend/src`+`frontend/src` apagados fisicamente; Git íntegro; PM2 com código em memória.
2. **2026-07-02 21:42 UTC** — Último restart PM2 estável antes dos incidentes de Julho.
3. **2026-07-02/03 ~23:04→02:05** — Campanha HTTP ~23.000 requests (~127/min); reconhecimento automatizado.
4. **2026-07-03 02:04 UTC** — Scan concentrado `3.19.29.56` (AWS Ohio): 151 requests, 79× HTTP 200 com 1020 bytes (fallback SPA).
5. **2026-07-03 14:32 UTC** — ~342 paths apagados; SSH autorizado na janela; restauro 14:36.
6. **2026-07-03** — FORENSICS-EXFILTRATION-01 + HARDENING-01 + SECURITY-BASELINE-01.
7. **2026-07-03→04** — Programa SEC-01→SEC-20 (Enterprise Security v2).
8. **2026-07-04** — Campanha Silvy X Ran (~151 paths); HARDENING-02, fail2ban, bloqueios UFW.

---

## PARTE 2 — Incidente 01 (Deleção Jun/2026)

**Referência completa:** [`INCIDENT_TECHNICAL_ANALYSIS.md#incidente-01`](./INCIDENT_TECHNICAL_ANALYSIS.md#incidente-01)

| Aspecto | Conclusão |
|---------|-----------|
| Como aconteceu | Remoção física selectiva no filesystem (~02:08–02:09 UTC) |
| Causa | **Não determinada** — compatível com erro operacional/sincronização IDE |
| Impacto | 195 paths críticos (server.js, App.jsx, serviços cognitivos) |
| Comprometimento malicioso | **Sem evidência** |
| Correcções | Recuperação manual via Git documentada em WORKING_TREE_FORENSIC |

---

## PARTE 3 — Incidente 02 AWS

**Referência completa:** [`INCIDENT_TECHNICAL_ANALYSIS.md#incidente-02-aws`](./INCIDENT_TECHNICAL_ANALYSIS.md#incidente-02-aws)

| Métrica | Valor |
|---------|-------|
| IP | `3.19.29.56` |
| ASN | AS16509 (Amazon) |
| Região | us-east-2 (Ohio) |
| Volume campanha | ~23.000 requests / ~3 h |
| Taxa | ~127/min, ~2,1/s |
| Scan isolado | 151 requests / ~2 min |
| Respostas 200 | 79× com **exactamente 1020 bytes** (fallback SPA) |
| `.env` | 404 — bloqueado |
| Exfiltração | **Não comprovada** |

---

## PARTE 4 — Segundo scanner (Vultr)

**Referência completa:** [`INCIDENT_TECHNICAL_ANALYSIS.md#incidente-03-vultr`](./INCIDENT_TECHNICAL_ANALYSIS.md#incidente-03-vultr)

- Provider Vultr (`45.32.x` e prefixos relacionados)
- **Diferenças vs AWS:** ASN distinto, infraestrutura Vultr vs EC2 Ohio
- **Semelhanças:** padrão `CLOUD_SCANNER`, credential scan, enumeração
- **Campanha mesma que AWS?** **Não confirmada** (SEC-03: Possible/Unknown)

---

## PARTE 5 — Incidente de deleção (Jul/2026)

**Referência completa:** [`INCIDENT_TECHNICAL_ANALYSIS.md#incidente-04-deleção`](./INCIDENT_TECHNICAL_ANALYSIS.md#incidente-04-deleção)

| Fase | Detalhe |
|------|---------|
| Pico | ~342 paths Git ausentes no disco |
| Pós-auditoria | 56 paths em falta |
| HARDENING-01 | 56 ficheiros restaurados; 0 deleted remanescente |
| PM2 | Online sem restart durante incidente |
| SSH | 2 IPs autorizados na janela 14:30–14:36 |
| Ligação ao scan AWS | **Sem evidência causal** (+12,5 h, canal diferente) |

---

## PARTE 6 — Evidências

Catálogo completo: [`INCIDENT_EVIDENCE_INDEX.md`](./INCIDENT_EVIDENCE_INDEX.md)

---

## PARTE 7 — Conclusões técnicas

Tabela definitiva: [`INCIDENT_FINAL_REPORT.md`](./INCIDENT_FINAL_REPORT.md)

---

## PARTE 8 — Mecanismos pós-incidente

Inventário: [`INCIDENT_RESPONSE_EVOLUTION.md`](./INCIDENT_RESPONSE_EVOLUTION.md)

Inclui: HARDENING-01/02, SECURITY-BASELINE-01, SEC-01→SEC-20, fail2ban, scripts `scripts/security/`.

---

## PARTE 9 — Evolução da maturidade

[`INCIDENT_SECURITY_EVOLUTION.md`](./INCIDENT_SECURITY_EVOLUTION.md)

---

## PARTE 10 — Lições aprendidas

[`INCIDENT_LESSONS_LEARNED.md`](./INCIDENT_LESSONS_LEARNED.md)

---

## PARTE 11 — Recomendações futuras

Ver [`INCIDENT_LESSONS_LEARNED.md#recomendações`](./INCIDENT_LESSONS_LEARNED.md#recomendações-futuras) e [`INCIDENT_FINAL_REPORT.md`](./INCIDENT_FINAL_REPORT.md).

---

## PARTE 12 — INCIDENT KNOWLEDGE BASE

[`INCIDENT_KNOWLEDGE_BASE.md`](./INCIDENT_KNOWLEDGE_BASE.md) — IOCs, TTPs, procedimentos permanentes.

---

## Fontes primárias consolidadas

| ID | Documento / Origem |
|----|-------------------|
| GIT-FORENSIC-02 | `backend/docs/WORKING_TREE_FORENSIC_REPORT.md` |
| ENV-FORENSIC-02 | `backend/docs/ENV_FORENSIC_02.md` |
| LOGIN-FORENSIC-01 | `backend/docs/LOGIN_FORENSIC_01.md` |
| CERT-ONPREM-FORENSICS-01 | `backend/docs/CERT-ONPREM-FORENSICS-01.md` |
| INCIDENT-FORENSICS-CRITICAL-01 | Transcript agente 88c672c4 (2026-07-03) |
| INCIDENT-FORENSICS-POST-01 | Transcript agente 88c672c4 (2026-07-03) |
| FORENSICS-EXFILTRATION-01 | Transcript agente 88c672c4 (2026-07-03) |
| HARDENING-01 | `backend/docs/HARDENING-01_REPORT.md` |
| HARDENING-02 / Silvy | `backend/docs/INCIDENT-HARDENING-SILVY-RAN.md` |
| SECURITY-BASELINE-01 | `backend/docs/evidence/security-baseline-01/` |
| SEC-01→20 | `backend/docs/SEC_*_REPORT.md`, `evidence/sec-*/` |

---

## Restrições respeitadas nesta consolidação

- ✅ Apenas documentação criada/actualizada
- ✅ Sem alteração de código, runtime, PM2, EG, ECO, Baseline, módulos SEC
- ✅ Evidências existentes preservadas (não modificadas)
- ✅ Certificações existentes não alteradas (apenas referências adicionadas nos índices)

---

*Dossiê Oficial de Incidentes — registro permanente do projecto IMPETUS.*
