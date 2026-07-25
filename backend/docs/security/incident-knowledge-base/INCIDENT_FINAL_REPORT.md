# INCIDENT_FINAL_REPORT — Conclusões Técnicas Definitivas

**Programa:** INCIDENT-KNOWLEDGE-BASE-01  
**Data:** 2026-07-04  
**Base:** FORENSICS-EXFILTRATION-01, INCIDENT-FORENSICS-CRITICAL-01, WORKING_TREE_FORENSIC, HARDENING-01, SEC-01→20

---

## Tabela de vereditos obrigatórios

Cada resposta indica **SIM**, **NÃO**, **PARCIAL** ou **INCONCLUSIVO** com evidência correspondente.

| # | Pergunta | Veredito | Evidência |
|---|----------|----------|-----------|
| 1 | Houve exfiltração? | **NÃO** (HTTP) / **INCONCLUSIVO** (SSH) | HTTP: 0 downloads >10 KB, 79×1020 bytes uniformes, total 92 KB (`EV-NGX-01`, FORENSICS-EXFILTRATION-01). SSH: root activo sem auditd/netflow |
| 2 | Houve leitura do código? | **NÃO** (atacante HTTP) | `/server.js` logado 1020 B vs 94 712 B reais; zero bytes de código backend (`EV-NGX-01`) |
| 3 | Houve leitura do `.env`? | **NÃO** (HTTP) | Todos paths `.env` → 404 nginx (`EV-NGX-03`) |
| 4 | Houve download? | **NÃO** (código/credenciais) | 0 HTTP 206; 0 responses >10 KB do IP AWS (`EV-NGX-01`) |
| 5 | Houve comprometimento? | **NÃO** (infra maliciosa) / **PARCIAL** (destruição local) | Sem novos users/keys/cron; deleção ~342 paths confirmada (`EV-FS-01`, `EV-GIT-01`) |
| 6 | Houve persistência? | **NÃO** | Sem backdoor, webshell, cron ou systemd anómalo (FORENSICS-EXFILTRATION-01 P10) |
| 7 | Houve backdoor? | **NÃO** | Sem evidência em users, authorized_keys, cron (FORENSICS-EXFILTRATION-01) |
| 8 | Houve reprodução do produto? | **NÃO** (via scan) / **PARCIAL** (bundles públicos) | Scan: ~92 KB HTML. Bundles `dist/` públicos por desenho — insuficientes para produto completo |
| 9 | Houve perda de vantagem competitiva? | **PARCIAL** | HTTP scan: impacto mínimo. Blueprint apagado localmente: perda interna. SSH: incerteza |

---

## Classificação global do incidente

```
RECONHECIMENTO (HTTP confirmado)
+ TENTATIVA FRUSTRADA (credenciais/código via HTTP)
+ INCIDENTE OPERACIONAL DESTRUIÇÃO LOCAL (filesystem)
+ LACUNA FORENSE SSH (não comprovada exfiltração outbound)
```

**Grau de comprometimento infra:** **Não comprovado**  
**Grau exfiltração HTTP:** **Tentativa frustrada** — confiança **alta** na negativa  
**Grau exfiltração SSH:** **Não comprovada** — confiança **baixa** na negativa

---

## Respostas expandidas

### Exfiltração

| Vector | Veredito | Confiança |
|--------|----------|-----------|
| HTTP código-fonte | **NÃO** | Alta |
| HTTP credenciais | **NÃO** | Alta |
| HTTP Git (.git) | **NÃO** | Alta |
| HTTP backups (.sql, .tar) | **NÃO** | Alta |
| SSH cópia repo | **INCONCLUSIVO** | Baixa |
| Exfiltração documentação Blueprint | **INCONCLUSIVO** | Média — apagada, não servida HTTP |

### Leitura e download

O falso positivo **HTTP 200 + 1020 bytes** foi o achado forense mais crítico. Scanners externos interpretam 200 como sucesso; forense prova que era **fallback SPA idêntico** para todos os paths.

### Comprometimento

- **SSH Jul/03:** apenas 2 IPs autorizados (`170.246.208.159`, `186.225.70.212`)
- **Bots SSH falhados:** não constituem invasão
- **Deleção:** compatível com erro operacional recorrente (Jun + Jul)

### Persistência e backdoor

Investigação não encontrou indicadores de persistência maliciosa. Vector de risco documentado separadamente: **PM2 dump.pm2 com segredos em texto claro** (ENV-FORENSIC-02).

### Reprodução do produto

| Dimensão | Obtido pelo scan | Suficiente? |
|----------|------------------|-------------|
| Código backend | 0 bytes | **NÃO** |
| Código frontend source | 0 bytes | **NÃO** |
| Arquitectura / Blueprint | 0 bytes HTTP | **NÃO** via HTTP |
| Bundles minificados | Não pelo scanner AWS | **PARCIAL** se outro crawler |
| Operação (DB, credenciais) | 0 | **NÃO** |

### Vantagem competitiva

- **Via scan HTTP AWS:** risco **baixo comprovado**
- **Via bundles públicos:** risco **médio estrutural** (exposição client-side por desenho)
- **Via SSH hipotético:** **incerteza** — mitigado por hardening posterior

---

## Hipóteses descartadas

| Hipótese | Estado | Evidência |
|----------|--------|-----------|
| Scan HTTP copiou código-fonte | **Descartada** | Bytes uniformes 1020 |
| Scan obteve `.env` | **Descartada** | Todos 404 |
| Scan clonou Git via HTTP | **Descartada** | `.git` 404/444 |
| `216.238.69.243` atacou este host | **Descartada** | Zero logs |
| Invasão SSH não autorizada Jul/03 | **Descartada** | Apenas 2 IPs |
| PM2 só em memória pós-restauro | **Descartada** | server.js disco = HEAD |
| Commit Git causou deleção disco | **Descartada** | WORKING_TREE_FORENSIC |
| Scan HTTP causou deleção 14:32 | **Descartada** | +12,5 h, canal diferente |

---

## Probabilidades (linguagem calibrada)

| Evento | Estimativa qualitativa |
|--------|------------------------|
| Exfiltração HTTP código | < 5% (evidência negativa forte) |
| Exfiltração HTTP credenciais | < 5% |
| Exfiltração SSH repo completo | 10–40% (lacuna — não quantificável com logs actuais) |
| Erro operacional causa deleção | 60–80% (recorrência, IPs autorizados, sem malware) |
| Ataque targeted exclusivo IMPETUS | 20–40% (padrão industry-wide compatível) |

---

## Acções já executadas (pós-incidente)

1. ✅ HARDENING-01 — restauro 56 ficheiros, nginx anti-SPA-fallback, SSH drop-in
2. ✅ HARDENING-02 — 403 paths sensíveis, log `impetus_detailed`, rate limit
3. ✅ SECURITY-BASELINE-01 congelado
4. ✅ SEC-01→SEC-20 implementados (flags OFF)
5. ✅ fail2ban + UFW bloqueios scanners
6. ✅ chmod 600 `.env`
7. ✅ INCIDENT-KNOWLEDGE-BASE-01 (este dossiê)

---

## Acções recomendadas remanescentes

| Prioridade | Acção |
|------------|-------|
| P0 | Activar auditd com regras `impetus_delete` |
| P0 | Rotacionar credenciais PM2 dump |
| P1 | SSH `PasswordAuthentication no` + chaves |
| P1 | Cloudflare WAF + Bot Fight |
| P2 | Arquivar/apagar backups `.env` em disco |
| P2 | Activar SEC flags em staging (SEC-09 plano) |

---

## Limitações desta conclusão

1. Auditoria baseada em logs e documentação disponíveis em 2026-07-04
2. Sem netflow/auditd na janela crítica SSH
3. FORENSICS-EXFILTRATION-01 não foi persistido como ficheiro `.md` no repo — conteúdo preservado neste dossiê via transcript
4. Certificações SEC reflectem implementação, não activação em produção (flags OFF)

---

*Vereditos finais — referência para auditorias e conformidade IMPETUS.*
