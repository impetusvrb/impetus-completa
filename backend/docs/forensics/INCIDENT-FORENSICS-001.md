# INCIDENT-FORENSICS-001 — Investigação Forense Digital (READ-ONLY)

> **Aviso legal-técnico:** Este relatório é documentação técnica de preservação e organização de evidências. **Não constitui perícia oficial** nem enquadramento jurídico. Destina-se a subsidiar Boletim de Ocorrência, representação e análise pelas autoridades (Polícia Civil / Polícia Cibernética). Conclusões limitam-se a factos técnicos observados, com graus de confiança explícitos. **Não atribui culpa a pessoas específicas.**

| Campo | Valor |
|-------|-------|
| Classificação | CRÍTICO — suspeita de acesso não autorizado, deleção de dados e possível exfiltração |
| Janela prioritária | 2026-07-02 00:00:00 → 2026-07-05 23:59:59 UTC |
| Expansão justificada | 2026-06-04 (incidente precursor) e 2026-07-03→04 (contenção/go-live) |
| Servidor | `srv1422313` / `72.61.221.152` |
| Repositório | `/var/www/impetus-completa` |
| Modo | READ-ONLY (consolidação documental) |
| Fonte de verdade | Auditorias CRITICAL-01, POST-01, EXFILTRATION-01 e dossiê operacional correlato (texto fornecido) |
| Consolidação | 2026-07-17 UTC |

---

## 1. Resumo executivo

No dia **03/07/2026** ocorreram **dois eventos técnicos distintos** no mesmo servidor:

### Evento A — Reconhecimento HTTP (02:04–02:06 UTC)
Scanner AWS `3.19.29.56` (AS16509) efectuou **151 pedidos** com wordlist de credenciais/configs. **Não houve exfiltração de código-fonte nem de `.env`.** Os HTTP 200 registados devolveram **sempre ~1020 bytes** (fallback SPA), não os ficheiros reais (ex.: `server.js` = 94 712 bytes).

### Evento B — Exclusão física de ficheiros (~14:32 UTC)
Remoção **selectiva** no filesystem de **~342 paths** rastreados pelo Git (cifra operacional do chamado: **359** — mesma ocorrência; ver §9). Restauro parcial via Cursor Agent às **~14:36 UTC**; na auditoria das 15:10 restavam **56**; posteriormente **HARDENING-01** restaurou **0 deleted**.

**Não há evidência conclusiva de comprometimento malicioso** (webshell, ransomware, SSH de terceiro, clone Git via HTTP). A hipótese principal (**~65%**) é **erro operacional** durante sessões SSH root de IPs **autorizados** (`170.246.208.159`, `186.225.70.212`), padrão similar ao incidente de **04/06/2026** (195 ficheiros).

**Exfiltração:** descartada via HTTP (confiança ALTA); via SSH **não comprovada e não descartável** (lacuna: ausência de auditd/netflow).

---

## 2. Escopo da investigação

- Origem técnica dos eventos 02–05/07
- IPs, utilizadores, sessões e credenciais
- Autoria/origem da exclusão (~342 / “359”)
- Tentativa/sucesso de exfiltração
- Preservação de evidências para autoridades

Fora de escopo: tipificação penal, atribuição de culpa nominal.

---

## 3. Metodologia

Correlação READ-ONLY de:

| Fonte | Utilização |
|-------|------------|
| nginx access.log | Scan 02:04; bytes; status |
| auth.log | SSH Accepted/Failed |
| stat / mtime | Janela exclusão/restauro |
| Git (status, reflog, ls-files --deleted, fsck) | Pico 342; integridade repo |
| PM2 /proc | Uptime; FD deleted; health |
| Transcripts Cursor | Detecção e `git checkout` restauro |
| PostgreSQL logs | Ausência de DROP |
| Documentação HARDENING/SEC | Contenção e recuperação posteriores |

Ferramentas: leitura de logs, `git`, `stat`, hashes documentados nas auditorias fonte. **Nenhuma alteração ao ambiente nesta consolidação.**

---

## 4. Cadeia de custódia

Ver `CHAIN-OF-CUSTODY.md`.

Marcos: HEAD `daf338657`; `server.js` MD5 `6552c028…` = HEAD; pico 342; remanescentes 56 → 0 pós-HARDENING-01.

Limitações: sem auditd/inotify; bash_history sem timestamp; journal limitado em auditorias posteriores.

---

## 5. Linha do tempo completa

Ver `INCIDENT-TIMELINE.csv`. Marcos críticos:

| UTC | BRT | Evento |
|-----|-----|--------|
| 02/07 21:42 | 18:42 | Último restart PM2 (pré-incidente) |
| **03/07 02:04–02:06** | 23:04–23:06 | **Scan HTTP** `3.19.29.56` — sem exfiltração |
| 03/07 14:30–14:31 | 11:30–11:31 | SSH root `170.246.208.159` |
| **03/07 14:32:15** | **11:32** | **Exclusão ~342 paths** (mtime) |
| 03/07 14:32:48 | 11:32 | SSH root `186.225.70.212` |
| **03/07 14:36** | **11:36** | **Restauro parcial** Cursor (`git checkout HEAD`) |
| 03/07 15:10 | 12:10 | Auditoria CRITICAL-01 — 56 em falta |
| 03/07+ | — | HARDENING-01: 0 deleted; nginx 403; baseline |
| 04/07 | — | fail2ban/UFW; SEC-21C; OPERATIONAL-GO-LIVE-01 |

---

## 6. Inventário dos IPs envolvidos

Ver `INCIDENT-IP-INVENTORY.csv`.

| IP | Papel | Risco |
|----|-------|-------|
| `3.19.29.56` | Scanner AWS — Evento A | ALTO (reconhecimento; sem sucesso) |
| `35.153.53.215` / `170.64.137.227` | Probes auxiliares | ALTO |
| `170.246.208.159` | SSH autorizado na janela B | BAIXO (autorizado; correlação temporal) |
| `186.225.70.212` | SSH autorizado | BAIXO |
| `27.79.*` / `49.49.240.250` | Brute-force SSH falhado | ALTO (contido) |
| `216.238.69.243` | Sem logs neste servidor | — (descartado) |

---

## 7. Inventário das sessões

| Sessão | IP | Hora UTC | Resultado |
|--------|-----|----------|-----------|
| SSH PID 4074602 | 170.246.208.159 | 14:30:19–14:31:09 | Autorizada |
| SSH PID 4075369 | 170.246.208.159 | 14:31:43→ | Autorizada (aberta na exclusão) |
| SSH PID 4076556 | 186.225.70.212 | 14:32:48 | Autorizada |
| Cursor `b1c1917a` | via SSH equipa | 14:33+ | Detecção + restauro |
| PM2 backend | — | desde 02/07 21:42 | Online sem restart no dia |

**Veredito SSH (POST-01):** apenas **2 IPs** com login root bem-sucedido no dia — limiar “>3 IDs” **não ultrapassado**. Sem terceiro ID invasor confirmado.

---

## 8. Inventário dos utilizadores

| Identidade | Contexto | Observação técnica |
|------------|----------|-------------------|
| `root` (SSH) | IPs ranges allowlist | Sessões legítimas documentadas |
| Agente Cursor | Restauro `git checkout` | Acção pós-detecção, não exclusão |
| wellington M.F | Autor commit `daf338657` | Commit 02/07 — não é a exclusão do disco |
| Contas inventadas (`user`,`docker`,…) | Brute-force | Falharam |

---

## 9. Inventário dos arquivos afectados (“359”)

Ver `INCIDENT-FILES-359.csv`.

| Momento | Quantidade | Conteúdo |
|---------|------------|----------|
| Pico (~14:32) | **~342** (chamado: **359**) | Incl. `server.js`, `frontend/src`, ecosystem, docs, scripts |
| Auditoria 15:10 | **56** | Scripts audit/ops, blueprint docs, deploy, vite.config, CI |
| Pós HARDENING-01 | **0** | Recuperação completa via Git |

**Tipo de operação:** exclusão física selectiva (não commit, não `rm -rf` total comprovado).  
**Mesmo evento:** SIM (pico → remanescentes → restauro).  
**Reconciliação 359≈342:** mesma ocorrência; diferença de contagem entre momentos/sessões.

---

## 10. Evidências colectadas

Índice E01–E14 em `INCIDENT-EVIDENCE-INDEX.md`.

---

## 11. Análise técnica

### Cadeia de eventos (Evento B — exclusão)

```
Origem: sessão remota SSH root (IP autorizado 170.246.208.159 — correlação)
    ↓
Autenticação: password SSH root (authorized_keys vazio)
    ↓
Sessão: PID 4075369 aberta às 14:31:43
    ↓
Endpoint/API: NÃO — exclusão não via HTTP/API (0 DELETE nginx)
    ↓
Ação: unlink/remoção selectiva de ~342 paths (comando exacto NÃO capturado)
    ↓
Processo: NÃO IDENTIFICADO (sem auditd)
    ↓
SO: filesystem working tree
    ↓
Banco de dados: NÃO afectado
    ↓
Sistema de arquivos: paths ausentes; Git objects intactos
    ↓
Resultado: degradação parcial; restauro Git ~14:36; produção PM2 manteve-se online
```

### Cadeia de eventos (Evento A — scan)

```
Origem: 3.19.29.56 (AWS) → Cloudflare/nginx
    ↓
Autenticação: nenhuma
    ↓
Endpoints: wordlist (.env, server.js, docker-compose…)
    ↓
Resultado: 404 / 1020-byte SPA fallback — ZERO código real
```

### Origem da exclusão (canais avaliados)

| Canal | Evidência de exclusão? |
|-------|------------------------|
| Interface web / API REST | NÃO |
| SSH / Terminal / Cursor | CORRELAÇÃO TEMPORAL — comando exacto ausente |
| Docker exec | NÃO evidenciado |
| Cron (`impetus-disk-monitor`) | NÃO — só alerta |
| Commit Git | NÃO |
| Exploit web / RCE | NÃO evidenciado |

---

## 12. Hipóteses com níveis de confiança

| # | Hipótese | Prob. | Confiança | Base |
|---|----------|-------|-----------|------|
| H1 | Erro operacional / Cursor / SSH legítimo | **~65%** | MÉDIA-ALTA | SSH na janela; padrão selectivo; Jun/04 similar; restauro minutos depois |
| H2 | Script deploy/`rsync --delete` mal executado | ~20% | MÉDIA | Histórico com rsync; scripts ausentes | 
| H3 | `git clean` acidental | ~15% | MÉDIA | Compatível; reflog sem clean |
| H4 | Comprometimento SSH de terceiro | ~8% | BAIXA | Root password + SSH aberto; mas só 2 IPs autorizados |
| H5 | Falha de disco | ~2% | BAIXA | Padrão selectivo; sem I/O errors |
| H6 | Scan HTTP causou a exclusão | **DESCARTADA** | ALTA | Δ 12h28m; canal diferente |
| H7 | Exfiltração HTTP de código | **DESCARTADA** | ALTA | Bytes 1020 uniformes |

**Causa raiz mais provável (com ressalvas):** remoção física selectiva durante **sessão operacional remota** (humano ou automação IDE), **não** ataque externo confirmado. Actor exacto **inconclusivo** (lacuna forense).

---

## 13. Impacto identificado

| Dimensão | Avaliação |
|----------|-----------|
| Disponibilidade | OK no momento (PM2 online, health 200) |
| Integridade código | Degradada temporariamente; recuperável/recuperada via Git |
| Confidencialidade | Sem prova de exfiltração HTTP; risco residual SSH + exposição PM2 dump (credenciais) |
| BD / uploads | Não afectados |
| Documentação enterprise | Destruída localmente (56 paths) — impacto interno |
| Vantagem competitiva via scan | **Baixa** (~92 KB HTML vazio) |

---

## 14. Controles de segurança que falharam / a reforçar

| Controlo | Estado no incidente |
|----------|---------------------|
| SSH password root + `authorized_keys` vazio | **Falha de hardening** — amplia superfície |
| UFW SSH aberto a qualquer IP (à data) | **Falha** — depois restringido |
| auditd / HISTTIMEFORMAT | **Ausentes** — prejudicam atribuição |
| nginx SPA fallback em paths de ficheiro | **Falso positivo 200** — corrigido em HARDENING-01/02 (404/403) |
| Controles que funcionaram | Bloqueio `.env` (404); Git íntegro; PM2 sem restart; recuperação Git |

---

## 15. Recomendações de contenção

*(Documentação apenas — não executadas nesta consolidação.)*

1. Confirmar legitimidade dos 2 IPs operadores.
2. SSH chave-only; restringir UFW aos ranges autorizados.
3. fail2ban / ban scanners (já documentado pós-04/Jul).
4. Rotacionar credenciais expostas em dump PM2.
5. Evitar `git clean -fdx` / `rsync --delete` em produção sem backup.

---

## 16. Recomendações de preservação de evidências

1. Imagem forense `dd` do disco pelas autoridades.
2. Preservar: nginx logs, auth.log, PM2 dump/jlist, `/proc` do backend (se contemporâneo), transcripts Cursor, `git status`/deleted list, `.bash_history`, backups `.env`.
3. Calcular SHA-256 no momento da apreensão.
4. Activar auditd + HISTTIMEFORMAT para incidentes futuros.

---

## 17. Conclusão

1. **Por que houve “perda de 359 ficheiros”?** — Exclusão física selectiva no disco em **03/07/2026 ~14:32 UTC**, com pico técnico **~342** paths Git (cifra operacional 359 = mesmo evento).
2. **Quem/o quê?** — Processo exacto **não identificado**; correlacionado com SSH root de IP **autorizado** `170.246.208.159`. Restauro atribuível ao Cursor Agent.
3. **Comprometimento?** — **Sem evidência conclusiva** de invasão por terceiro.
4. **Exfiltração?** — **Não via HTTP** (confiança ALTA). Canal SSH: **lacuna forense**.
5. **Scan AWS?** — Reconhecimento real, **exfiltração falhada**; **independente** da exclusão (12,5 h antes).

Este dossiê organiza factos técnicos verificáveis para apoio a BO e perícia oficial. A determinação definitiva cabe às autoridades competentes.

---

## Critérios de encerramento

```
READ_ONLY = YES
FILES_MODIFIED = NO          (consolidação documental apenas)
DATABASE_MODIFIED = NO
LOGS_MODIFIED = NO
CONFIGURATION_MODIFIED = NO
SERVICES_RESTARTED = NO
EVIDENCE_PRESERVED = YES
CHAIN_OF_CUSTODY_ESTABLISHED = YES
TIMELINE_COMPLETED = YES
IPS_IDENTIFIED = YES
FILES_359_ANALYZED = YES     (≈342 pico; inventário completo)
REPORT_COMPLETED = YES
```

## Possíveis indícios técnicos (sem tipificação penal)

| Indício técnico observado | Presente? |
|---------------------------|-----------|
| Acesso não autorizado bem-sucedido | **Não confirmado** (só IPs allowlist) |
| Tentativas de acesso não autorizado (SSH/HTTP) | **Sim** (bots/scanner — falharam) |
| Exclusão de dados / ficheiros | **Sim** (~342 paths) |
| Tentativa de ocultação | **Não evidenciada** |
| Exfiltração de informações | **Não comprovada** (HTTP descartada; SSH inconclusiva) |
| Comprometimento de contas | **Não comprovado** |

---

*Fim do relatório INCIDENT-FORENSICS-001 (consolidação 2026-07-17).*
