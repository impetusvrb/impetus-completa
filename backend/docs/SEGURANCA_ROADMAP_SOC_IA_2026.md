# IMPETUS — Visão SOC/IA × Estado Actual × Roadmap

**Data:** 06 de julho de 2026  
**Referência base:** `SEGURANCA_IMPETUS_PLATAFORMA_2026.md`  
**Autores visão:** Gustavo · Welligton  
**Objectivo:** alinhar as 12 camadas + reforços corporativos ao que já está no código e ao que vem a seguir.

---

## 1. Síntese

A arquitectura que descreveram é **correcta e enterprise-grade**. O IMPETUS **já tem ~70% do motor** no backend (módulos SEC-01…21C), mas hoje opera sobretudo em modo **observe/advise** — com excepção da **infra** (Cloudflare, fail2ban, threat-watch, lockdown), que já actua.

A evolução não é “mais bloqueios aleatórios”; é **unificar vigilância + score + grafo + governança** num SOC visível para a diretoria.

---

## 2. Mapa das 12 camadas

| # | Sua camada | O que faz | IMPETUS hoje | Gap principal |
|---|------------|-----------|--------------|---------------|
| **1** | Vigilância 24/7 (risco 0–3) | Observa logs, CF, F2B, API, sessões… | **Parcial** — SEC-01 observatory, nginx ingest, threat-watch, Centro Segurança | Unificar fontes; score 0–3 explícito; sessões/uploads/BD contínuos |
| **2** | IA analítica + relatório | O quê, onde, quem, repetição | **Parcial** — SEC-02 correlação, SEC-03 threat intel, SEC-06 resposta | Relatório automático em linguagem natural; UI “incidente explicado” |
| **3** | Motor contenção (políticas) | Brute → IP → CAPTCHA → notify | **Parcial** — UFW, fail2ban, Turnstile, WhatsApp, lockdown | Políticas declarativas YAML; escalar CAPTCHA no app cliente |
| **4** | IA aprendizado histórico | Padrões, ASN, “97% igual há 42 dias” | **Início** — incidentes JSON, classificador determinístico | Base histórica + similaridade (sem LLM obrigatório) |
| **5** | Hardening inteligente (aprovação) | Recomenda rate limit, MFA, RBAC… | **Parcial** — SEC-11 adaptive protection, SEC-09 promotion | Fila de recomendações com approve/reject na UI |
| **6** | Gêmeo digital | Testar ataques antes de prod | **Início** — SEC-19 simulação, red team baseline 04/07 | Ambiente homolog dedicado; nunca atacar prod |
| **7** | Score de segurança | Dashboard 98,7% | **Início** — `impetus-security-stack-verify.sh`, SOC SEC-07 | **Security Score 1000** unificado (ver secção 4) |
| **8** | IA preditiva | Sobe proteção antes do ataque | **Início** — SEC-10 active defense (threat level) | Pre-warm: Bot Fight, rate limit, Turnstile app |
| **9** | Auto auditoria | SSL, DNS, portas, deps… | **Parcial** — certbot, stack-verify, SEC-04 integridade | Cron auditoria + diff hash ficheiros críticos |
| **10** | Base conhecimento | Playbook por incidente | **Início** — `/var/lib/impetus/incidents/`, cursor_prompt | Playbooks versionados + busca “ataque parecido” |
| **11** | SOC (mapa, tempo real) | Tela única operacional | **Parcial** — `/painel/seguranca` (super_admin) | Mapa mundial, attack graph, métricas por minuto |
| **12** | Governança 🟢🟡🔴 | Auto / semi / manual | **Alinhado** — dry-run, approval required, lockdown só crítico | Formalizar modos na UI e em políticas |

---

## 3. Os 12 reforços corporativos × estado

| Reforço | Descrição | Já temos | Próximo passo |
|---------|-----------|----------|---------------|
| **1. Security Score 1000** | Índice único diretoria | Verificação por checks booleanos | Fórmula ponderada + API + card no painel |
| **2. Attack Graph** | Caminho IP→CF→nginx→API→ban | Logs separados | Motor grafo a partir de incidente JSON |
| **3. Baseline inteligente** | Normal vs anómalo | SEC-04, métricas SEC-01 | Baseline 7d logins/países/APIs |
| **4. Risk Engine** | Pontos por evento | Classificador SEC-01 | Tabela pesos + threshold 0–3 |
| **5. Threat Intelligence** | IOCs externos | SEC-03 (consultivo) | Feed AbuseIPDB/CF + cache |
| **6. Integridade ficheiros** | Hash backend/scripts | SEC-04 runtime integrity | Cron hash `routes/`, `server.js` |
| **7. Vault segredos** | Rotação chaves | `.env` no servidor | HashiCorp Vault / CF Secrets (fase 2) |
| **8. Simulador ataques** | Semanal em homolog | Red team baseline, probe scripts | Pipeline semanal CI homolog |
| **9. Auditoria cognitiva** | “Por que bloqueou X?” | Logs + threat-watch | Endpoint + chat SOC “explain incident” |
| **10. Mapa mundial** | Origem ataques | Geo IP no dashboard | Mapa no Centro Segurança |
| **11. Auto hardening** | detect→simulate→apply→rollback | SEC-13 controlled execution | Workflow approve + rollback PM2/nginx |
| **12. Gêmeo digital** | 1000 testes antes prod | SEC-19, SEC-21C go-live | VM homolog espelho |

---

## 4. Security Score 1000 — proposta concreta

Índice **único** recalculado a cada 15 min (sem `Math.random` — só checks reais):

| Domínio | Peso | Fonte de verdade |
|---------|------|------------------|
| Cloudflare | 120 | DNS proxy, SSL strict, Bot Fight, Turnstile |
| Servidor | 120 | fail2ban, UFW, threat-watch, lockdown config |
| Banco | 100 | RLS tenants, conexão, backups recentes |
| APIs | 100 | Rate limit, auth fail jail, health |
| JWT / sessão | 100 | Secrets definidos, refresh tokens, expiração |
| 2FA | 80 | % contas admin com TOTP activo |
| Backups | 100 | Último backup < 24h |
| Observabilidade | 100 | SEC-01 activo, ingest nginx |
| IA / SOC | 80 | SEC-02/07 activos, incidentes correlacionados |
| Integridade | 100 | SEC-04 sem drift crítico |

**Penalizações:** lockdown activo (−50), certificado < 14 dias (−30), 2FA piloto 0% (−40).

**API proposta:** `GET /api/impetus-admin/security-dashboard/score`  
**UI:** card topo do Centro de Segurança — `987 / 1000`.

---

## 5. Níveis de risco 0–3 (Camada 1)

| Nível | Nome | Critério (Risk Engine) | Acção automática 🟢 |
|-------|------|------------------------|---------------------|
| **0** | Normal | Score acumulado < 20 | Observar |
| **1** | Suspeito | 20–49 | Log + métrica SEC-01 |
| **2** | Ataque | 50–99 | UFW + fail2ban + WhatsApp se HIGH |
| **3** | Crítico | ≥ 100 ou multi-camada | Lockdown PM2 + WhatsApp imediato |

*Já implementado na infra para nível 3 (lockdown). Falta unificar score na app.*

---

## 6. Governança (Camada 12) — modos oficiais

| Modo | Cor | Pode fazer sozinho | Exemplos IMPETUS |
|------|-----|-------------------|------------------|
| **Automático** | 🟢 | Sim | Ban IP, rate limit temp, encerrar sessão suspeita, lockdown crítico |
| **Semi-automático** | 🟡 | Recomenda → humano aprova | Nova regra UFW, MFA obrigatório tenant, fechar rota pública |
| **Manual** | 🔴 | Nunca auto | RBAC, schema BD, remover user, mudar JWT secret |

Flags actuais que **já reflectem** isto:

- `SECURITY_DRY_RUN_ONLY=true` — protege 🟡/🔴 na app  
- `SECURITY_MANUAL_APPROVAL_REQUIRED=true`  
- `IMPETUS_AUTO_LOCKDOWN_ENABLED=true` — só 🟢 crítico na infra  

---

## 7. Attack Graph (exemplo)

```
IP 20.48.255.163
  → Cloudflare (proxied) — permitido
  → Nginx — GET /wp-admin.php
  → 444 / 404
  → threat-watch ALERT HIGH
  → fail2ban impetus-nginx-scan
  → UFW DENY
  → [se 200 em .env] → LOCKDOWN PM2
```

**Implementação:** cada incidente em `/var/lib/impetus/incidents/*.json` ganha campo `attack_graph[]` gerado no pós-processamento.

---

## 8. Roadmap recomendado (sem greenfield)

### Fase A — Consolidar (2–4 semanas) — *máximo valor, mínimo risco*

1. **Security Score 1000** no Centro de Segurança  
2. **Risk Engine 0–3** unificado (threat-watch + SEC-01)  
3. **Attack Graph** por incidente  
4. **Auditoria cognitiva** — “por que bloqueou?” (endpoint + texto)  
5. **Auto auditoria** cron (SSL, DNS, cert, portas, backup)  
6. Activar **2FA** nas 5 contas → sobe score real  

### Fase B — Corporativo (1–2 meses)

7. Mapa mundial + SOC tempo real (expandir `/painel/seguranca`)  
8. Threat Intelligence feeds (SEC-03 operacional)  
9. Baseline comportamental (logins, países, APIs)  
10. Playbooks automáticos (Camada 10)  
11. Fila **semi-auto hardening** (Camada 5)  

### Fase C — Enterprise (3+ meses)

12. Gêmeo digital / homolog espelho + simulador semanal  
13. Vault de segredos + rotação  
14. IA preditiva (pre-warm proteção)  
15. Promover SEC-14…18 de observe → assist com aprovação  

---

## 9. O que NÃO fazer

- Ataques simulados em **produção** (só homolog)  
- LLM a **alterar** RBAC/BD sem humano  
- Bloquear tudo ao primeiro 404 (já corrigido)  
- Score inventado sem checks (proibido por regra de gráficos/dados reais)  

---

## 10. Conclusão

| Pergunta | Resposta |
|----------|----------|
| A visão faz sentido? | **Sim** — é SOC moderno + governança |
| Já temos isso? | **Motor ~70%** no backend; **UI ~25%**; **infra ~90%** |
| O que falta mais? | Score 1000, grafo, risk 0–3, SOC visual, playbooks, homolog twin |
| Prioridade imediata? | **Fase A** — score + risk + grafo + explicabilidade |

A base de hoje (jul/2026) não é “segurança fraca” — é **segurança forte com cérebro ainda em modo observador**. A visão de vocês é o manual para **ligar o cérebro** com governança 🟢🟡🔴.

---

*Documento de alinhamento estratégico — não substitui `FUNCTIONAL_MATRIX` nem aprovação de novos módulos FEAT.*
