# INCIDENT_TIMELINE — Linha do Tempo Oficial de Incidentes IMPETUS

**Certificação documental:** INCIDENT-KNOWLEDGE-BASE-01  
**Modo:** Consolidação read-only  
**Última actualização:** 2026-07-04  
**Git HEAD de referência:** `daf338657`

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| 🔴 | Incidente crítico |
| 🟠 | Incidente alto |
| 🟡 | Reconhecimento / scan |
| 🟢 | Recuperação / hardening |
| 📋 | Certificação / baseline |

---

## Linha do tempo global

```
2026-06-03 ── PM2 backend arranca (server.js presente)
2026-06-04 ── 🔴 INCIDENTE 01 — Deleção filesystem (195 paths)
2026-06-04 ── GIT-FORENSIC-02 / ENV-FORENSIC-02 / LOGIN-FORENSIC-01
2026-06-30 ── 📋 CERT-ONPREM-FORENSICS-01 (laudo arquitectural)
2026-07-02 ── Último restart PM2 estável (21:42 UTC)
2026-07-02→03 ── 🟡 Campanha AWS ~23.000 requests (relatório Gustavo)
2026-07-03 02:04 ── 🟡 Scan AWS 3.19.29.56 (151 requests, 2 min)
2026-07-03 14:32 ── 🔴 INCIDENTE DELEÇÃO — ~342 paths apagados
2026-07-03 14:36 ── 🟢 Restauro parcial git checkout (Cursor Agent)
2026-07-03 15:10 ── INCIDENT-FORENSICS-CRITICAL-01
2026-07-03 17:00 ── FORENSICS-EXFILTRATION-01
2026-07-03 ── 🟢 HARDENING-01 (56 ficheiros + nginx + SSH + integridade)
2026-07-03 ── 📋 SECURITY-BASELINE-01 congelado
2026-07-03→04 ── SEC-01 → SEC-20 (Enterprise Security v2)
2026-07-04 ── 🟡 Campanha Silvy X Ran (~151 paths, User-Agent conhecido)
2026-07-04 ── 🟢 HARDENING-02 + fail2ban + UFW bloqueios adicionais
2026-07-04 ── 📋 SEC-20 Enterprise Security v2 certificado
2026-07-04 ── 📋 INCIDENT-KNOWLEDGE-BASE-01 (este dossiê)
```

---

## Incidente 01 — Deleção filesystem (Jun/2026)

| Campo | Valor |
|-------|-------|
| **ID** | INC-2026-06-04-FS-01 |
| **Data** | 2026-06-04 |
| **Horário (UTC)** | ~02:08–02:09 (janela mtime) |
| **Duração** | Segundos a minutos (operação em massa) |
| **Origem** | Filesystem local — vector não identificado conclusivamente |
| **Contexto** | PM2 arrancou 2026-06-03 22:54 com `server.js` válido; remoção ocorreu ~3h15 depois |
| **Estado do software** | Runtime industrial parcial; módulos cognitivos/dashboard afectados |
| **Certificações existentes** | Pré-SEC; EG/ECO em evolução |
| **Módulos existentes** | actionRuntime, workflow parcialmente intactos; 195 paths em `backend/src`+`frontend/src` ausentes |

**Evidência principal:** `backend/docs/WORKING_TREE_FORENSIC_REPORT.md`

---

## Incidente 02 — Campanha AWS (scan HTTP)

| Campo | Valor |
|-------|-------|
| **ID** | INC-2026-07-AWS-01 |
| **Data** | 2026-07-02/03 (campanha); pico documentado 2026-07-03 02:04 UTC |
| **Horário (UTC)** | Campanha ampla: 23:04→02:05 (~3 h); scan IP único: 02:04:40→02:06:39 (~2 min) |
| **Duração** | ~3 horas (Gustavo); ~2 minutos (IP 3.19.29.56 isolado) |
| **Origem** | AWS EC2 — AS16509, região us-east-2 (Ohio) |
| **IP principal** | `3.19.29.56` |
| **IPs relacionados** | `35.153.53.215`, `216.238.69.243` (mencionado, zero logs neste host) |
| **User-Agent** | Padrão scanner automatizado (campanha); Silvy X Ran é campanha posterior distinta |
| **Volume** | ~23.000 requests / ~3 h (~127/min, ~2,1/s); IP 3.19.29.56: 151 requests |
| **Contexto** | Nginx activo; dotfiles bloqueados; fallback SPA ~1020 bytes para paths inexistentes |
| **Estado do software** | HEAD `daf338657`; PM2 online desde 02/Jul |
| **Certificações** | Pré-SECURITY-BASELINE-01 |
| **Módulos** | Stack completa em produção; SEC-01→20 ainda não implementados |

**Evidência principal:** FORENSICS-EXFILTRATION-01 (transcript 88c672c4), `SEC_01_REPORT.md`, nginx `access.log`

---

## Incidente 03 — Scanner Vultr (segundo scanner)

| Campo | Valor |
|-------|-------|
| **ID** | INC-2026-07-VULTR-01 |
| **Data** | Documentado em SEC-03 (2026-07-03); janela exacta nos logs nginx não isolada neste dossiê |
| **Origem** | Vultr — prefixos `45.32.x`, `45.33.x`, `45.76.x` (provider registry SEC-03) |
| **Geolocalização** | Infraestrutura Vultr (frequentemente associada a México/LATAM em relatórios operacionais) |
| **IP exemplo (testes)** | `45.32.100.10` |
| **Contexto** | Campanha independente do AWS Ohio — ASN diferente |
| **Classificação SEC-03** | `CLOUD_SCANNER` + `provider: vultr` |
| **Relação com AWS** | **Campanhas não confirmadas como mesma** (regra Gustavo, evidência Possible/Unknown) |

**Evidência principal:** `SEC_03_REPORT.md`, `SEC_03_CAMPAIGN_ANALYSIS.md`, `providerRegistry.js`

---

## Incidente 04 — Deleção filesystem (Jul/2026)

| Campo | Valor |
|-------|-------|
| **ID** | INC-2026-07-03-FS-02 |
| **Data** | 2026-07-03 |
| **Horário (UTC)** | Exclusão: 14:32:15–14:32:19; restauro: 14:36:17–14:36:18 |
| **Duração** | ~4 minutos (deleção → restauro parcial) |
| **Origem** | Filesystem local; SSH root autorizado na mesma janela |
| **Contexto** | Sessões SSH `170.246.208.159` (14:30, 14:31) e `186.225.70.212` (14:32) |
| **Paths afectados (pico)** | ~342 paths Git rastreados ausentes no disco |
| **Paths remanescentes pós-auditoria** | 56 (restaurados 56 adicionais em HARDENING-01) |
| **Estado do software** | PM2 online 17h+ sem restart; código em memória pré-incidente |
| **Certificações** | Pré-HARDENING-01 |
| **Recuperação** | `git checkout HEAD -- $(git ls-files --deleted)` (HARDENING-01) |

**Evidência principal:** INCIDENT-FORENSICS-CRITICAL-01, FORENSICS-EXFILTRATION-01, `HARDENING-01_REPORT.md`

---

## Incidente 05 — Campanha Silvy X Ran (Jul/2026)

| Campo | Valor |
|-------|-------|
| **ID** | INC-2026-07-SILVY-01 |
| **Data** | 2026-07-04 (pós SEC-20) |
| **Origem** | Scanner automatizado — User-Agent `Silvy X Ran` |
| **Volume** | ~151 paths (wordlist credenciais/cloud/Docker) |
| **Contexto** | Pós-HARDENING-01; lacuna `.env` 644; nginx HARDENING-02 pendente |
| **Resultado HTTP** | 404/403 — nenhum ficheiro real exposto |
| **Resposta** | HARDENING-02, fail2ban, UFW, chmod 600 `.env` |

**Evidência principal:** `INCIDENT-HARDENING-SILVY-RAN.md`, `infra/nginx/impetus-hardening-locations.conf`

---

## Marcos de maturidade (pós-incidente)

| Data | Marco |
|------|-------|
| 2026-07-03 | HARDENING-01 |
| 2026-07-03 | SECURITY-BASELINE-01 |
| 2026-07-03→04 | SEC-01 → SEC-20 |
| 2026-07-04 | HARDENING-02 + fail2ban |
| 2026-07-04 | INCIDENT-KNOWLEDGE-BASE-01 |

---

## Referências cruzadas

| Documento | Conteúdo |
|-----------|----------|
| [`INCIDENT_MASTER_REPORT.md`](./INCIDENT_MASTER_REPORT.md) | Índice executivo |
| [`INCIDENT_TECHNICAL_ANALYSIS.md`](./INCIDENT_TECHNICAL_ANALYSIS.md) | Análise por incidente |
| [`INCIDENT_EVIDENCE_INDEX.md`](./INCIDENT_EVIDENCE_INDEX.md) | Catálogo de evidências |
| [`INCIDENT_FINAL_REPORT.md`](./INCIDENT_FINAL_REPORT.md) | Vereditos finais |

---

*Linha do tempo congelada em INCIDENT-KNOWLEDGE-BASE-01 — alterações futuras devem append-only neste ficheiro.*
