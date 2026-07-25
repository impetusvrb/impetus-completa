# INTEGRITY_LIMITATIONS_REGISTER

**Emitido em:** 2026-07-23 16:01 UTC  
**Fase de origem:** SEC-BASELINE-002  
**Baseline de referência:** IMPETUS-INTEGRITY-BASELINE-v2  

---

## Visão Geral

As limitações abaixo foram identificadas durante o ciclo SEC-COVERAGE-002 → SEC-CERT-002 e formalmente incorporadas no baseline consolidado. Todas as limitações são conhecidas, documentadas e com mitigação activa ou plano de evolução definido. Nenhuma representa um gap P0 (crítico sem mitigação).

---

## LIM-001 — Cobertura Parcial do auditd

| Campo | Valor |
|---|---|
| ID | LIM-001 |
| Risco | P1 |
| Tipo | Cobertura de detecção |
| Status | ACEITE COM MITIGAÇÃO |

**Descrição:** O daemon `auditd` não possui regras activas para 4 directórios de alto valor:
- `/etc/nginx/` — configuração do servidor web
- `/etc/fail2ban/` — configuração de protecção contra brute-force
- `/etc/letsencrypt/` — certificados TLS
- `/etc/cron.d/` — tarefas agendadas do sistema

**Impacto:** Alterações nestes directórios não geram eventos `auditd` em tempo real, introduzindo latência entre a mudança e a detecção.

**Mitigação activa:** `IntegrityHashChecker` cobre ficheiros individuais críticos dentro destes directórios com verificação periódica (heartbeat hash). A detecção ocorre no próximo ciclo de scan (configurável, padrão 5 min).

**Plano de evolução:** Adicionar regras auditd para estes directórios num ciclo posterior com novo ciclo OBS → COVERAGE → CERT → BASELINE.

---

## LIM-002 — Monitorização de Directórios MEDIUM sem Watchers em Tempo Real

| Campo | Valor |
|---|---|
| ID | LIM-002 |
| Risco | P2 |
| Tipo | Cobertura temporal |
| Status | ACEITE |

**Descrição:** 12 activos de criticidade MEDIUM são monitorizados via scan periódico apenas (sem `fs.watch` ou auditd dedicado). A janela de detecção é maior do que para activos CRITICAL/HIGH.

**Impacto:** Baixo. Activos MEDIUM têm menor impacto operacional e são colocados em scan frequente suficiente para os SLOs definidos.

**Mitigação activa:** Scan periódico IntegrityHashChecker com intervalo configurável.

**Plano de evolução:** Avaliar adição de watchers para MEDIUM em ciclo futuro, caso análise de risco o justifique.

---

## LIM-003 — GID não Monitorizado por IntegrityPermChecker

| Campo | Valor |
|---|---|
| ID | LIM-003 |
| Risco | P2 |
| Tipo | Cobertura de atributos |
| Status | ACEITE |

**Descrição:** `IntegrityPermChecker` monitoriza alterações de UID e permissões de acesso (`chmod`), mas não monitoriza alterações de GID (`chgrp`). Uma mudança de grupo proprietário não gera evento de integridade.

**Impacto:** Baixo. Alterações de GID sem alteração de UID ou permissões são eventos raros e de menor risco operacional no contexto IMPETUS.

**Mitigação activa:** Alterações de GID que causem acesso não autorizado serão detectadas pela alteração efectiva das permissões de acesso ou por anomalias de acesso.

**Plano de evolução:** Expandir `resolveUid()` para incluir GID num ciclo posterior.

---

## LIM-004 — Activos Fora do Escopo do Motor de Integridade

| Campo | Valor |
|---|---|
| ID | LIM-004 |
| Risco | P2 |
| Tipo | Escopo de cobertura |
| Status | DOCUMENTADO — fora do escopo actual |

**Descrição:** Os seguintes domínios estão explicitamente fora do escopo da camada INTEGRITY v2:
- Memória do processo (runtime heap/stack)
- Firmware e BIOS
- Hardware (TPM, discos físicos)
- Containers e imagens Docker
- Dependências npm (node_modules)
- Snapshots de bases de dados

**Impacto:** O motor de integridade cobre o baseline de ficheiros de configuração e código crítico. Os domínios acima exigem ferramentas e abordagens distintas.

**Plano de evolução:** Cada domínio pode ser coberto por uma camada dedicada em fases futuras independentes.

---

## Sumário de Risco Residual

| ID | Risco | Probabilidade | Impacto | Mitigação | Revisão |
|---|---|---|---|---|---|
| LIM-001 | P1 | Baixa | Médio | HashChecker periódico | Ciclo pós-BASELINE-002 |
| LIM-002 | P2 | Baixa | Baixo | Scan periódico | Ciclo futuro |
| LIM-003 | P2 | Muito baixa | Baixo | Monitorização indirecta | Ciclo futuro |
| LIM-004 | P2 | N/A | Variável | Ferramentas dedicadas | Roadmap futuro |

**Avaliação:** Nenhuma limitação compromete a operação da plataforma IMPETUS. O risco residual total é **ACEITE** no contexto do ciclo actual.
