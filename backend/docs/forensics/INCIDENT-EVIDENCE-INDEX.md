# ÍNDICE DE EVIDÊNCIAS — INCIDENT-FORENSICS-001

Cada conclusão do dossiê referencia pelo menos um item abaixo. Fonte de verdade: auditorias `INCIDENT-FORENSICS-CRITICAL-01`, `POST-01`, `FORENSICS-EXFILTRATION-01` e documentos correlatos (2026-07-03).

---

## E01 — Pico de exclusão (~342 paths / cifra operacional 359)

- **Fonte:** transcript Cursor `b1c1917a` L3840; `INCIDENT-FORENSICS-CRITICAL-01` §2
- **Timestamp:** detecção ~14:33–14:40 UTC; exclusão mtime **14:32:15–14:32:19 UTC** 03/Jul/2026
- **Evidência:** `git ls-files --deleted | wc -l` → **342**; auditoria 15:10 UTC → **56** ainda em falta
- **Explicação:** remoção **física selectiva** no working tree; repositório Git `daf338657` **íntegro**
- **Confiança:** ALTA

## E02 — Janela temporal da exclusão

- **Fonte:** `stat` de `scripts/`, `backend/scripts/audit/`; CRITICAL-01 §1
- **Timestamp:** **2026-07-03 14:32:15–14:32:19 UTC** (11:32 BRT)
- **Explicação:** mtime das pastas coincide com exclusão; restauro mtime **14:36:17–14:36:18**
- **Confiança:** ALTA

## E03 — Sessões SSH na janela crítica

- **Fonte:** `/var/log/auth.log` (POST-01 §0–1)
- **Evidência:**
  ```
  14:30:19 — Accepted password root from 170.246.208.159 (PID 4074602)
  14:31:43 — Accepted password root from 170.246.208.159 (PID 4075369) — sessão aberta
  14:32:15 — mtime exclusão
  14:32:48 — Accepted password root from 186.225.70.212 (PID 4076556)
  ```
- **Explicação:** apenas **2 IPs autorizados** (ranges UFW Gustavo Vero / Welligton Next). Correlação temporal com exclusão; **não prova** comando destrutivo desse IP
- **Confiança:** ALTA (existência das sessões); MÉDIA (atribuição causal do `unlink`)

## E04 — Restauro pelo Cursor Agent

- **Fonte:** transcript `b1c1917a` L3842+; mtime `backend/src`
- **Comando:** `git checkout HEAD -- backend/src frontend/src ecosystem.config.js …`
- **Timestamp:** ~14:36 UTC
- **Explicação:** único comando Git de massa na sessão é **restaurador**, **depois** da detecção — não é a causa da exclusão
- **Confiança:** ALTA

## E05 — Scan HTTP AWS (incidente distinto)

- **Fonte:** `FORENSICS-EXFILTRATION-01`; nginx `access.log`
- **IP:** `3.19.29.56` (AS16509 AWS us-east-2)
- **Timestamp:** **02:04:40–02:06:39 UTC** 03/Jul (~12h28m **antes** da exclusão)
- **Evidência decisiva:** 79 respostas HTTP 200 com **exactamente 1020 bytes** (fallback SPA); `/server.js` real = 94 712 bytes → **não foi servido**; `.env` → **404**; egress total **~93 824 bytes**
- **Confiança:** ALTA (exfiltração HTTP **não ocorreu**)

## E06 — Configuração nginx anti-dotfiles

- **Fonte:** `/etc/nginx/sites-available/impetus.bak.20260621151006`
- **Evidência:** `location ~ /\. { deny all; return 404; }`
- **Confiança:** ALTA

## E07 — PM2 íntegro durante o incidente

- **Fonte:** CRITICAL-01 §3; EXFILTRATION §11
- **Evidência:** PID `4027145`; started **2026-07-02 21:42:34**; **0 FD `(deleted)`**; `/health` 200; `server.js` MD5 = HEAD
- **Confiança:** ALTA

## E08 — Git não foi a causa da exclusão

- **Fonte:** `git reflog` Jul/03; `git fsck`
- **Evidência:** sem `reset`/`clean`/`checkout` destrutivo; remote GitHub intacto; `.git` via HTTP → 404/444
- **Confiança:** ALTA

## E09 — PostgreSQL / BD não afectados

- **Fonte:** CRITICAL-01 §5
- **Evidência:** sem DROP/TRUNCATE; uploads não afectados
- **Confiança:** ALTA

## E10 — Sem comando destrutivo capturado

- **Fonte:** POST-01 §1.2–1.3; `.bash_history` sem timestamps
- **Evidência:** transcripts sem `rm`/`git clean` na janela 14:30–14:36; auditd/inotify **ausentes**
- **Explicação:** mecanismo exacto (`rm`, sync IDE, outro terminal, `HISTCONTROL=ignorespace`) **inconclusivo**
- **Confiança:** ALTA quanto à lacuna; BAIXA quanto à identificação do processo

## E11 — Sem webshell / ransomware / persistência

- **Fonte:** CRITICAL-01 §12; EXFILTRATION §10
- **Evidência:** authorized_keys vazio; sem novos users; cron só `impetus-disk-monitor.sh`; padrão inconsistente com ransomware (Git intacto, recuperação trivial)
- **Confiança:** MÉDIA-ALTA (investigação de binários não exaustiva)

## E12 — Incidente precursor Jun/2026

- **Fonte:** `WORKING_TREE_FORENSIC_REPORT.md`
- **Evidência:** ~195 ficheiros apagados ~02:08 UTC 04/Jun; padrão selectivo similar
- **Explicação:** sugere **causa sistémica operacional** (workflow Cursor/deploy), não ataque único
- **Confiança:** ALTA (existência); MÉDIA (mesma causa raiz)

## E13 — Recuperabilidade

- **Fonte:** CRITICAL-01 §13; HARDENING-01
- **Evidência:** 56 paths → 0 via `git checkout HEAD -- $(git ls-files --deleted)`; Blueprint 11/11
- **Confiança:** ALTA

## E14 — Contenção posterior (04/Jul)

- **Fonte:** fail2ban/UFW logs documentados; HARDENING-02
- **Evidência:** ban `3.19.29.56`, `170.64.137.227`, `195.178.110.199`, etc.; nginx 403 paths sensíveis
- **Confiança:** ALTA

---

## Matriz de suporte às conclusões

| Conclusão | Evidências |
|-----------|------------|
| Exclusão em massa ~14:32 UTC 03/Jul | E01, E02 |
| ~342 ≈ “359” do chamado | E01 + nota metodológica CSV |
| SSH autorizados na janela | E03 |
| Restauro Cursor ~14:36 | E04 |
| Scan HTTP sem exfiltração | E05, E06 |
| Dois incidentes distintos | E05 + E01 (Δ 12h28m) |
| Sem comprometimento conclusivo | E03, E08, E11 |
| Hipótese operacional principal | E03, E10, E12 |
| Código recuperável / recuperado | E07, E13 |
