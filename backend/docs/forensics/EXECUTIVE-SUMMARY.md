# RESUMO EXECUTIVO — INCIDENT-FORENSICS-001

> Documentação técnica de apoio a Boletim de Ocorrência e investigação pela Polícia Cibernética. **Não substitui perícia oficial.**

**Servidor:** `srv1422313` (`72.61.221.152`)  
**Janela:** 02/07/2026 – 05/07/2026 (UTC) · **Evento crítico:** 03/07/2026  
**Consolidação:** 17/07/2026 · **Modo:** READ-ONLY  

---

## Veredito em uma frase

No dia 03/07 ocorreram **dois incidentes distintos**: (1) **scan HTTP** AWS às 02:04 UTC **sem exfiltração de código**; (2) **exclusão física de ~342 ficheiros** (~14:32 UTC; cifra operacional **359**) correlacionada a **SSH root de IP autorizado**, com **restauro parcial às 14:36** e recuperação posterior completa via Git — **sem evidência conclusiva de invasão por terceiro**.

---

## Factos essenciais para a autoridade

| # | Facto | Confiança |
|---|-------|-----------|
| 1 | Exclusão em massa: **~14:32:15 UTC, 03/07/2026** | ALTA |
| 2 | Pico técnico **~342** paths Git ausentes (= “359” do chamado, mesma ocorrência) | ALTA |
| 3 | Às 15:10 UTC restavam **56**; após HARDENING-01: **0** | ALTA |
| 4 | **Não** foi commit Git — working tree; HEAD `daf338657` íntegro | ALTA |
| 5 | SSH na janela: só `170.246.208.159` e `186.225.70.212` (autorizados) | ALTA |
| 6 | Comando exacto da exclusão: **não capturado** (sem auditd) | ALTA |
| 7 | Restauro 14:36: Cursor Agent `git checkout HEAD -- …` | ALTA |
| 8 | Scan `3.19.29.56` (AWS): 151 req; HTTP 200 = **1020 B SPA**; `.env`→404; ~94 KB total | ALTA |
| 9 | Scan e exclusão: **Δ ~12,5 h** — **sem ligação causal** | ALTA |
| 10 | Exfiltração HTTP: **NÃO** | ALTA |
| 11 | Exfiltração SSH: **não comprovada / não descartável** | MÉDIA (lacuna) |
| 12 | Comprometimento malicioso conclusivo: **NÃO** | MÉDIA-ALTA |
| 13 | Hipótese principal: **erro operacional** (~65%) | MÉDIA |
| 14 | Incidente similar: **04/06/2026** (~195 ficheiros) | ALTA |
| 15 | PM2 manteve-se online; BD não afectada | ALTA |

---

## Cadeia simplificada (exclusão)

```
SSH root autorizado (170.246.208.159) 14:31:43
        ↓
mtime exclusão selectiva ~14:32:15  (~342 paths)
        ↓
Cursor detecta 342 deleted ~14:33–14:40
        ↓
git checkout HEAD — restauro parcial ~14:36
        ↓
HARDENING-01 — 0 deleted
```

---

## O que NÃO se prova com as evidências

- Identidade de um “invasor” externo na exclusão  
- Cópia outbound do repositório via SSH  
- Que o scanner AWS tenha obtido `.env` ou `server.js` real  
- Que `216.238.69.243` tenha atacado este servidor (zero logs)

---

## Indícios técnicos objectivos (sem tipificação)

| Indício | Observado? |
|---------|------------|
| Tentativas de acesso não autorizado (HTTP/SSH) | SIM (falharam) |
| Acesso não autorizado bem-sucedido | NÃO confirmado |
| Exclusão de dados/ficheiros | SIM (~342) |
| Exfiltração comprovada | NÃO (HTTP); SSH inconclusivo |
| Persistência / backdoor | NÃO evidenciado |

---

## Acções recomendadas às autoridades / operação

1. **Preservar** disco (imagem `dd`), `/var/log/nginx*`, `auth.log*`, transcripts Cursor, `.git`, dumps PM2  
2. Validar WHOIS/RDAP dos IPs (especialmente `3.19.29.56` AS16509)  
3. Pedir aos operadores confirmação de actividade nos IPs `170.246.208.159` / `186.225.70.212` às 11:30–11:36 BRT  
4. Não depender deste relatório como perícia — usar como **roteiro de evidências**

---

## Critérios de encerramento

```
READ_ONLY = YES
FILES_MODIFIED = NO
DATABASE_MODIFIED = NO
LOGS_MODIFIED = NO
CONFIGURATION_MODIFIED = NO
SERVICES_RESTARTED = NO
EVIDENCE_PRESERVED = YES
CHAIN_OF_CUSTODY_ESTABLISHED = YES
TIMELINE_COMPLETED = YES
IPS_IDENTIFIED = YES
FILES_359_ANALYZED = YES
REPORT_COMPLETED = YES
```

## Entregáveis

| Ficheiro | Conteúdo |
|----------|----------|
| `INCIDENT-FORENSICS-001.md` | Relatório completo (17 secções) |
| `EXECUTIVE-SUMMARY.md` | Este resumo |
| `CHAIN-OF-CUSTODY.md` | Custódia e limitações |
| `INCIDENT-TIMELINE.csv` | Timeline |
| `INCIDENT-IP-INVENTORY.csv` | IPs + risco |
| `INCIDENT-FILES-359.csv` | Inventário 342/359/56/0 |
| `INCIDENT-EVIDENCE-INDEX.md` | E01–E14 |

*As conclusões descrevem factos técnicos. A determinação pericial e jurídica cabe às autoridades competentes.*
