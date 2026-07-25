# CADEIA DE CUSTÓDIA — INCIDENT-FORENSICS-001

> Documentação técnica de preservação e organização de evidências. **Não substitui perícia oficial.** Destina-se a subsidiar Boletim de Ocorrência e investigação pela Polícia Civil / Polícia Cibernética.

---

## 1. Dados da consolidação documental

| Campo | Valor |
|-------|-------|
| Data/hora da consolidação (UTC) | 2026-07-17 17:19:48 UTC |
| Timezone | UTC (servidor); eventos do incidente também documentados em BRT (UTC−3) |
| Hostname | `srv1422313` |
| IP público documentado | `72.61.221.152` |
| Sistema operacional | Ubuntu 22.04.5 LTS (Jammy) |
| Kernel | Linux 5.15.0-185-generic x86_64 |
| Node.js | v20.20.0 |
| npm | 10.8.2 |
| PostgreSQL | 14.23 (Ubuntu 14.23-0ubuntu0.22.04.1) |
| nginx | 1.18.0 (Ubuntu) |
| PM2 | 6.0.14 |
| Repositório | `/var/www/impetus-completa` |
| Método | Consolidação READ-ONLY de evidências já colectadas em auditorias de 2026-07-03 e documentos correlatos (sem alteração do ambiente) |

**Declaração:** este dossiê **não executa** remediação, reinício, alteração de logs, banco ou configuração. O texto-fonte fornecido pelo operador constitui a **fonte de verdade factual** sobre o incidente 02–05/07/2026.

---

## 2. Fontes primárias (cadeia de custódia documental)

| ID | Documento / artefacto fonte | Data da coleta original | Conteúdo relevante |
|----|----------------------------|-------------------------|--------------------|
| S1 | `INCIDENT-FORENSICS-CRITICAL-01` | 2026-07-03 ~15:10 UTC | Perda física ~342 paths; 56 remanescentes; janela 14:32–14:36 |
| S2 | `INCIDENT-FORENSICS-POST-01` | 2026-07-03 | Correlação SSH/Cursor; IPs autorizados; lacunas auditd |
| S3 | `FORENSICS-EXFILTRATION-01` | 2026-07-03 | Scan HTTP 3.19.29.56; sem exfiltração HTTP; lacuna SSH |
| S4 | `WORKING_TREE_FORENSIC_REPORT.md` | 2026-06-04 | Incidente precursor (195 ficheiros) |
| S5 | Transcript Cursor `b1c1917a-0e13-4479-82a8-be04b47fd25b` | 2026-07-03 | Detecção ~342 deleted; `git checkout HEAD` restauro |
| S6 | Transcript Cursor `7d8f329d-cf32-44fb-aa70-e43ecb267cb5` | 2026-07-03 | Auditoria continuidade read-only |
| S7 | HARDENING-01 / SECURITY-BASELINE-01 / SEC-01→21C / OPERATIONAL-GO-LIVE-01 | 2026-07-03 a 2026-07-04 | Contenção, recuperação e go-live posteriores |

---

## 3. Localização física das evidências (servidor)

| Fonte | Caminho |
|-------|---------|
| Logs nginx | `/var/log/nginx/access.log*` (scan 02:04 UTC 03/Jul) |
| Auth / SSH | `/var/log/auth.log*` |
| PM2 | `~/.pm2/logs/*`, `~/.pm2/dump.pm2`, PID documentado `4027145` |
| Git | `/var/www/impetus-completa/.git` — HEAD à data do incidente: `daf338657` |
| Histórico shell | `/root/.bash_history` (sem HISTTIMEFORMAT — limitação) |
| Transcripts Cursor | `agent-transcripts/` (IDs `b1c1917a…`, `7d8f329d…`) |
| Backups | `deploy_backups/20260601_2259/`, `backups/recovery_20260603_225426/`, `.env.pre-promotion-*` |
| Nginx config backup | `/etc/nginx/sites-available/impetus.bak.20260621151006` |

---

## 4. Hashes e identificadores imutáveis (documentados nas auditorias fonte)

| Artefacto | Identificador | Observação |
|-----------|---------------|------------|
| Git HEAD (incidente) | `daf338657` (2026-07-02 19:26 UTC) | Fonte canónica de restauro |
| `backend/src/server.js` | MD5 `6552c028…` = HEAD | Íntegro pós-restauro 14:36 |
| Pico Git deleted | **~342** paths | Medido `git ls-files --deleted \| wc -l` (transcript `b1c1917a`) |
| Remanescentes na auditoria 15:10 | **56** paths | Após restauro parcial |
| Pós HARDENING-01 | **0** deleted | Recuperação completa documentada |

> **Nota sobre “359”:** a medição técnica do pico foi **~342**. A cifra “359” do chamado operacional é tratada neste dossiê como **referência aproximada ao mesmo evento de exclusão em massa** (variação de contagem entre sessões/momentos). Ver `INCIDENT-FILES-359.csv`.

---

## 5. Limitações forenses (transparência obrigatória)

1. **auditd / inotify:** não estavam instalados na janela do incidente — processo/`unlink` exacto **não identificável** retroactivamente.
2. **bash_history:** sem `HISTTIMEFORMAT` — comandos não datáveis com precisão.
3. **Comando destrutivo exacto:** não capturado em transcripts Cursor nem history datado.
4. **Canal SSH (exfiltração outbound):** sem netflow/auditd — **lacuna** (não se prova nem se descarta cópia).
5. **Journal:** retenção limitada em auditorias posteriores — priorizar cópia forense de disco pelas autoridades.

---

## 6. Declaração de integridade desta consolidação

Durante a geração deste dossiê consolidado (2026-07-17):

- Nenhum ficheiro de evidência original foi apagado ou truncado.
- Nenhum banco de dados foi alterado.
- Nenhum serviço foi reiniciado.
- Nenhuma configuração de segurança foi modificada.
- Nenhuma remediação foi aplicada.

*Recomendação às autoridades:* imagem bit-a-bit (`dd`) do disco e preservação de `/var/log`, `.git`, transcripts e dumps PM2 com hash SHA-256 calculado no momento da apreensão.
