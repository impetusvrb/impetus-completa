# Relatório de Segurança — IMPETUS Equipa (Painel Comercial)

**Data:** 2026-07-05  
**Âmbito:** Painel administrativo interno (`/painel/`) + API `/api/impetus-admin`  
**URL produção:** https://srv1422313.hstgr.cloud/painel/  
**Classificação geral:** **VERDE_AMARELO** (8/9 probes PASS, 0 FAIL, 1 WARN)

---

## 1. Resumo executivo

O **IMPETUS Equipa** (painel comercial para cadastro de empresas, gestão interna e suporte) está **operacional e protegido** para uso pela equipa IMPETUS. Os testes controlados de invasão no painel **passaram em 8 de 9 cenários**. Não foi detetada invasão externa nas criações de empresas de teste (RT) — origem confirmada: scripts internos no servidor (`127.0.0.1`).

| Indicador | Valor |
|-----------|-------|
| Score probe dedicado | **VERDE_AMARELO** |
| Falhas críticas no painel | **0** |
| Empresas na BD | **4** (reais) |
| Contas admin activas | **1** |
| Anti-robô no login | **Activo** |
| JWT separado do cliente | **Sim** |

**Único ponto de atenção (WARN):** a rota pública `POST /api/companies` (onboarding cliente) continua aberta na internet — **não é o painel equipe**, mas partilha o mesmo backend.

---

## 2. Arquitectura de segurança do painel equipe

```mermaid
flowchart TB
  subgraph internet [Internet]
    U[Utilizador equipa IMPETUS]
    B[Bot / atacante]
  end
  subgraph edge [Borda]
    NGX[Nginx HTTPS + rate limit auth]
    F2B[fail2ban]
  end
  subgraph painel [Painel Equipa]
    UI[/painel/ React]
    BOT[Verificação humana + honeypot]
  end
  subgraph api [API interna]
    ADM[/api/impetus-admin]
    JWT[JWT IMPETUS_ADMIN exclusivo]
    RBAC[super_admin / comercial / suporte]
  end
  subgraph data [Dados]
    AU[(admin_users)]
    AL[(admin_logs)]
  end
  U --> NGX --> UI --> BOT --> ADM
  B --> NGX
  ADM --> JWT --> RBAC --> AU
  ADM --> AL
```

### Separação do app cliente

| Plano | Quem | Login | Tabela |
|-------|------|-------|--------|
| **IMPETUS Equipa** | Staff IMPETUS | `/painel/login` | `admin_users` |
| **Cliente (tenant)** | Empresas | `https://…/` app | `users` |

Não há partilha de sessão nem de JWT entre os dois planos.

---

## 3. Camadas de protecção activas

### 3.1 Rede e servidor

| Camada | Estado | Detalhe |
|--------|--------|---------|
| HTTPS (Let's Encrypt) | ✅ | `srv1422313.hstgr.cloud` |
| Nginx hardening | ✅ | Paths scanner → 403/404; headers segurança |
| Rate limit `/painel/` | ✅ | Zona `impetus_auth` (10 req burst) |
| Rate limit `/api/` | ✅ | 60 req/min por IP |
| fail2ban | ✅ | `impetus-nginx-scan`, `sshd` |
| threat-watch + WhatsApp | ✅ | Cron */2 min; alertas CallMeBot |
| auditd | ✅ | Regras `impetus_*`; cron audit-watch */3 min |
| IP directo bloqueado | ✅ | `default_server` → 444 |

### 3.2 Autenticação painel (`/api/impetus-admin`)

| Controlo | Estado | Implementação |
|----------|--------|---------------|
| JWT exclusivo | ✅ | `IMPETUS_ADMIN_JWT_SECRET` (≠ `JWT_SECRET` cliente) |
| Expiração token | ✅ | 8 horas |
| Issuer | ✅ | `impetus-admin-portal` |
| Verificação humana (anti-robô) | ✅ | Desafio matemático + token JWT 5 min |
| Honeypot | ✅ | Campo `_hp` — preenchimento = `BOT_DETECTED` |
| Rate limit login | ✅ | 10 tentativas / 15 min / IP (`adminPortalLoginLimiter`) |
| Logs de auth | ✅ | `admin_logs`: login, login_falhou, login_bloqueado_bot |
| Debug invite link produção | ✅ OFF | `ADMIN_PORTAL_DEBUG_INVITE_LINK=false` |

### 3.3 Autorização (RBAC)

| Perfil | Permissões típicas |
|--------|-------------------|
| `super_admin` | Tudo + governança IA + recuperação tenant |
| `admin_comercial` | Empresas (criar/editar), dashboard |
| `admin_suporte` | Leitura, logs, recuperação tenant (com super) |

Rotas sensíveis usam `requireAdminAuth`, `requireCommercialOrSuper`, `requireAdminProfiles`.

### 3.4 PM2 / disponibilidade

| Processo | Porta | Função |
|----------|-------|--------|
| `impetus-admin-portal` | 127.0.0.1:5174 | UI `/painel/` (Vite preview) |
| `impetus-backend` | 127.0.0.1:4000 | API `/api/impetus-admin` |

---

## 4. Resultados do probe dedicado (2026-07-05 04:40 UTC)

Script: `backend/src/securityApplicationValidation/adminPortalSecurityProbe.js`  
Evidência JSON: `probe-latest.json`

| ID | Cenário | Resultado | HTTP / código |
|----|---------|-----------|---------------|
| AP-01 | GET `/auth/me` sem token | **PASS** | 401 |
| AP-02 | GET `/companies` sem token | **PASS** | 401 |
| AP-03 | Login sem verificação humana | **PASS** | 403 `HUMAN_CHECK_REQUIRED` |
| AP-04 | Honeypot preenchido | **PASS** | 403 `BOT_DETECTED` |
| AP-05 | Resposta humana errada | **PASS** | 403 `HUMAN_CHECK_FAILED` |
| AP-06 | Senha errada (human OK) | **PASS** | 401 |
| AP-07 | JWT adulterado | **PASS** | 401 |
| AP-08 | POST `/api/companies` público | **WARN** | 201 — onboarding aberto* |
| AP-09 | HTTPS `/painel/login` | **PASS** | 200 |

\* Empresa de teste criada pelo probe foi **apagada** imediatamente após o teste.

**Comando para repetir:**

```bash
/var/www/impetus-completa/infra/scripts/impetus-admin-portal-probe.sh
```

---

## 5. Auditoria forense — empresas RT (04/Jul/2026)

| Pergunta | Resposta |
|----------|----------|
| Ataque externo? | **Não** |
| IP das criações RT | **100% `127.0.0.1`** (scripts no servidor) |
| User-Agent | `curl/7.81.0` / Node (red team) |
| Acesso a dashboards após criação? | **Não** — GET internos → 401 |
| Empresas RT actuais | **Apagadas** (21 removidas) |
| Empresas reais restantes | **4** (Fresh & Fit, find fish, industria de teste) |

---

## 6. Actividade recente (`admin_logs`, 7 dias)

| Acção | Quantidade |
|-------|------------|
| `login` (sucesso) | 6 |
| `login_bloqueado_bot` | 3 |
| `login_falhou` | 1 |

Último login: `admin@impetus.local` (super_admin) — 2026-07-05 ~02:30 UTC.

---

## 7. Alertas WhatsApp (teste 2026-07-05)

| Destinatário | Resultado |
|--------------|-----------|
| Welligton | ✅ HTTP 200 — mensagem entregue |
| Gustavo | ❌ HTTP 208 — quota CallMeBot |

Relatório do probe enviado automaticamente pelo script `impetus-admin-portal-probe.sh`.

---

## 8. Riscos residuais e recomendações

| Prioridade | Risco | Recomendação | Estado |
|------------|-------|--------------|--------|
| **P1** | Senha inicial `123456` | Trocar + criar contas pessoais | ⏳ Pendente |
| **P2** | `POST /api/companies` público | Fechar ou restringir a IP equipa | ⏳ Pendente |
| **P3** | Sem MFA no painel equipe | Activar MFA admin (futuro) | ⏳ Planeado |
| **P3** | Sem Cloudflare Turnstile | Configurar chaves Turnstile (opcional) | ⏳ Opcional |
| **P4** | Sem restrição IP no `/painel/` | Allowlist Vero/Next no nginx | ⏳ Opcional |
| **P4** | Quota WhatsApp Gustavo | Renovar/registar CallMeBot | ⏳ Operacional |

---

## 9. Veredicto final

| Dimensão | Avaliação |
|----------|-----------|
| **Painel equipe IMPETUS** | **APTO para uso interno** — VERDE |
| **Anti-automação / bots** | **APTO** — VERDE |
| **Autenticação / JWT** | **APTO** — VERDE |
| **Isolamento do cliente** | **APTO** — VERDE |
| **Onboarding público (API paralela)** | **ATENÇÃO** — AMARELO |
| **Higiene credenciais** | **ATENÇÃO** — AMARELO |

### Conclusão

**Pode confiar no IMPETUS Equipa para operação comercial diária.** O painel está protegido contra acesso anónimo, bots no login, JWT falsificado e brute-force básico. Não houve evidência de invasão externa nas empresas de teste. Os dois pontos amarelos (senha inicial e onboarding público separado) não invalidam o painel — são melhorias recomendadas para endurecimento total.

---

*Gerado automaticamente com base em probe AP-01…AP-09, auditoria de logs, estado da BD e configuração de produção.*
