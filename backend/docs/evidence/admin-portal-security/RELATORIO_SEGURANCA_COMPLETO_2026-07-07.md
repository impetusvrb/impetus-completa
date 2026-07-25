# Relatório Completo de Segurança — IMPETUS Plataforma

**Data do relatório:** 07 de julho de 2026, 00:26 UTC (21:26 BRT)  
**Domínio:** https://plataformaimpetus.com  
**Servidor:** VPS Hostinger `72.61.221.152`  
**Equipa:** Gustavo Júnior · Welligton Freitas Machado  
**Classificação geral:** **VERDE** (pilha técnica completa) · **AMARELO** (fecho operacional equipa)

---

## 1. Resumo executivo

O IMPETUS evoluiu de proteção sólida no servidor para **defesa em profundidade em três planos** (rede, servidor, software). A pilha está **implementada, activa e monitorizada**. O software está **online**, sem lockdown activo.

| Plano | Componentes | Estado |
|-------|-------------|--------|
| **Rede** | Cloudflare proxy, SSL strict, Bot Fight, Turnstile | ✅ Activo |
| **Servidor** | UFW, fail2ban (4 jails), threat-watch, lockdown automático | ✅ Activo |
| **Software** | MFA/2FA, JWT admin isolado, dispositivos+IPs, Centro de Segurança, IA SEC-01…21 | ✅ Ligado |

**Princípio operacional:** detectar cedo → banir IP → alertar só o sério (HIGH/CRITICAL) → **tirar software do ar** em invasão multi-camada confirmada.

**Pendências humanas (não técnicas):** activar 2FA nas 3 contas admin (0/3) e aprovar dispositivos de outros membros da equipa quando entrarem.

---

## 2. Estado actual em produção (snapshot 07/07/2026)

### 2.1 Serviços

| Processo PM2 | Estado |
|--------------|--------|
| `impetus-backend` | ✅ Online |
| `impetus-frontend` | ✅ Online |
| `impetus-admin-portal` | ✅ Online |

### 2.2 Lockdown de emergência

| Item | Estado |
|------|--------|
| Lockdown activo | **Não** |
| Último lockdown | 06/07/2026 22:54 UTC (falso positivo — login equipa) |
| Restauro | 06/07/2026 23:37 UTC via `impetus-emergency-restore.sh` |
| Motor corrigido | IPs equipa ignorados; ≥3 falhas para gatilho |

### 2.3 Firewall e banimentos

| Componente | Estado |
|------------|--------|
| UFW | ✅ Activo |
| fail2ban jails | 4 activas: `sshd`, `impetus-nginx-scan`, `nginx-limit-req`, `impetus-auth-fail` |
| IPs banidos (nginx-scan) | 4 activos |
| UFW DENY acumulados | 20+ IPs atacantes |

### 2.4 Threat-watch

- Ban automático de scanners e 404 flood
- Lockdown + WhatsApp durante incidente Welligton (corrigido)
- Vigilância contínua (cron */2 min)

---

## 3. Arquitectura — defesa em profundidade

```
Internet → Cloudflare (WAF, SSL, Turnstile)
         → VPS (nginx, UFW, fail2ban, threat-watch, lockdown)
         → Software (Backend, Frontend, Painel, MFA, Centro Segurança, IA)
         → WhatsApp (Gustavo + Welligton)
```

### Separação de planos

| Plano | Quem | URL | Auth |
|-------|------|-----|------|
| Cliente (tenant) | Empresas | plataformaimpetus.com | users + JWT app |
| Equipa IMPETUS | Staff interno | /painel/ | admin_users + JWT admin |
| Infra | Bots/scanners | Bloqueados na borda | UFW / fail2ban / CF |

---

## 4. Camada 1 — Cloudflare

| Item | Estado |
|------|--------|
| DNS A @ + CNAME www (Proxied) | ✅ |
| SSL Full (strict) | ✅ |
| Bot Fight Mode | ✅ |
| Turnstile painel | ✅ |
| Guard anti-bypass CF-RAY | ✅ |
| Certificado origem | Let's Encrypt — expira 04/out/2026 |

**URLs:** App · Painel · Centro Segurança · Dispositivos autorizados · 2FA conta

---

## 5. Camada 2 — Servidor

### fail2ban

| Jail | Função |
|------|--------|
| sshd | Força bruta SSH |
| impetus-nginx-scan | Paths scanner |
| nginx-limit-req | Rate limit |
| impetus-auth-fail | Falhas login |

### threat-watch

- WhatsApp: **só HIGH e CRITICAL**
- IPs equipa: nunca banidos
- Cron */2 min

### Lockdown automático Fase 2

Gatilhos: invasão multi-camada, probes sensíveis, login após breach.  
Restauro: `sudo bash infra/scripts/impetus-emergency-restore.sh`

---

## 6. Camada 3 — Software

### MFA / 2FA

| Flag | Valor |
|------|-------|
| IMPETUS_MFA_ENABLED | true |
| IMPETUS_ADMIN_PORTAL_MFA_ENABLED | true |
| IMPETUS_ADMIN_JWT_SECRET | Configurado (isolado) |

**Enrolamento:** 0/3 contas com TOTP activo (pendente equipa).

### Dispositivos e IPs

| Flag | Valor |
|------|-------|
| IMPETUS_ADMIN_DEVICE_TRUST_ENABLED | true |
| IMPETUS_ADMIN_DEVICE_TRUST_MODE | enforce |

- 7 padrões IP globais equipa aprovados
- super_admin em IP equipa: auto-aprova dispositivo
- Outros perfis: aprovação em Dispositivos autorizados

### Centro de Segurança (Fases A/B/C)

- Fase A: Score 1000, Risk L0–L3, Attack Graph, auto-audit
- Fase B: Mapa mundial, SEC-02/03, playbooks, hardening
- Fase C: Gêmeo digital, simulador SEC-19, vault, promoção assist

### IA SEC-01…21

Modo observe + dry-run. Lockdown PM2 independente na infra.

---

## 7. Entregas 06/07/2026

Cloudflare · Turnstile · MFA · Centro Segurança · Lockdown Fase 2 · Device trust · JWT admin · Fases A/B/C · Correções login e lockdown equipa.

---

## 8. Incidente 06/07/2026

Lockdown falso positivo (login Welligton mobile) → restauro 23:37 UTC → motor e device trust corrigidos.

---

## 9. Matriz de resposta

| Severidade | UFW | WhatsApp | Lockdown |
|------------|-----|----------|----------|
| LOW | Não | Não | Não |
| MEDIUM | Sim | Não | Não |
| HIGH | Sim | Sim | Não* |
| CRITICAL | Sim | Sim | Sim** |

---

## 10. Auditoria painel (probe AP-01…AP-09)

8/9 PASS · 0 FAIL · 1 WARN (POST /api/companies público).

---

## 11. Riscos residuais

| Prioridade | Risco | Acção |
|------------|-------|-------|
| P1 | 2FA não activo (0/3) | Enrolar em /painel/conta-seguranca |
| P1 | Senha inicial fraca | Trocar |
| P2 | Dispositivos equipa | Aprovar quando entrarem |
| P2 | Onboarding API público | Restringir (futuro) |

---

## 12. Checklist fecho

**Feito:** pilha técnica completa.  
**Pendente:** 2FA equipa, aprovar dispositivos, trocar senha, revisão semanal Centro Segurança.

---

## 13. Veredicto

| Dimensão | Avaliação |
|----------|-----------|
| Perímetro | ✅ VERDE |
| Servidor | ✅ VERDE |
| Painel equipe | ✅ VERDE |
| Device trust | ✅ VERDE |
| Centro Segurança | ✅ VERDE |
| 2FA enrolamento | ⚠️ AMARELO |
| Onboarding API | ⚠️ AMARELO |

**Conclusão:** Segurança forte e bem estruturada. Fecho final = activar 2FA + aprovar dispositivos.

---

## 14. Referências

- `backend/docs/SEGURANCA_IMPETUS_PLATAFORMA_2026.md`
- `backend/docs/evidence/admin-portal-security/STACK_SEGURANCA_STATUS.md`
- `backend/docs/evidence/admin-portal-security/FAIL2BAN_RELATORIO_30D.md`
- `backend/docs/evidence/admin-portal-security/RELATORIO_SEGURANCA_IMPETUS_EQUIPA.md`

---

*Relatório gerado para Gustavo Júnior · Welligton Freitas Machado — IMPETUS Comunica IA.*
