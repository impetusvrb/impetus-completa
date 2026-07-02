# PLANO DE IMPLANTAÇÃO COMPLETA — IMPETUS Industrial
## Do diagnóstico ao Go Live e operação assistida

**Versão:** 1.0 · 2026-06-30  
**Classificação:** OPS / implantação enterprise  
**Âmbito:** Empresa real · tenant limpo · dados cadastrados no cliente  
**Stack canónica:** Node.js 20 · PostgreSQL 14+ · PM2 · Nginx · HTTPS  

> Este plano **não desenvolve novas funcionalidades**. Conduz instalação, configuração, integração, validação e operação com boas práticas MES / IIoT / Indústria 4.0.

**Referências no repositório:**
- [`INSTALACAO_INDUSTRIAL.md`](./INSTALACAO_INDUSTRIAL.md) — instalação técnica
- [`FUNCTIONAL_MATRIX.md`](./FUNCTIONAL_MATRIX.md) — telas → API → BD
- [`PLANO_MESTRE_LIGACAO_INDUSTRIAL_v2.md`](./PLANO_MESTRE_LIGACAO_INDUSTRIAL_v2.md) — gates certificação
- Script: `backend/scripts/ops/install-industrial.sh`
- Validação estrutural: `node backend/scripts/ops/validate-structural-readiness.js <company_id>`

---

# SUMÁRIO EXECUTIVO

| Fase | Duração típica | Objetivo |
|------|----------------|----------|
| 0 Diagnóstico | 3–5 dias | Entender fábrica e definir escopo |
| 1 Infraestrutura | 2–5 dias | Servidor pronto e seguro |
| 2 Instalação | 1–2 dias | IMPETUS online (limpo) |
| 3 Configuração empresa | 3–7 dias | Base Estrutural + RBAC |
| 4 Cadastro industrial | 5–15 dias | Máquinas, ativos, procedimentos |
| 5 Integrações | 5–20 dias | ERP, PLC, MQTT (conforme contrato) |
| 6 Segurança + IA | 2–5 dias | Hardening e chaves |
| 7 Testes / homologação | 5–7 dias | UAT + relatório |
| 8 Treinamento | 3–5 dias | Por perfil |
| 9 Piloto | 15–30 dias | 1 linha / 1 setor |
| 10 Go Live | 1 dia | Produção oficial |
| 11 Operação assistida | 60–90 dias | Suporte e ajustes |
| 12 Melhoria contínua | Contínuo | Evolução controlada |

**Duração total típica:** 8–14 semanas (piloto incluso).

---

# ETAPA 1 — DIAGNÓSTICO INICIAL

## 1.1 Levantamento (workshop 4–8 h)

| Dimensão | Perguntas / dados a recolher |
|----------|------------------------------|
| Segmento | Alimentos, metal, químico, têxtil, etc. |
| Funcionários | Total, administrativos, chão de fábrica |
| Plantas / filiais | Quantas unidades no tenant |
| Linhas / máquinas | Inventário preliminar |
| Setores | Produção, manutenção, qualidade, logística, RH, SST, ESG |
| Turnos | 1×8, 2×8, 3×8, contínuo |
| Estrutura org. | Organograma, cargos formais |
| Fluxo operacional | Ordem de produção, manutenção, NC, incidentes |
| Problemas actuais | Paradas, retrabalho, papel, planilhas |
| KPIs hoje | OEE, MTBF, NC, absenteísmo, custos |
| Objetivos | O que a diretoria quer em 6–12 meses |

## 1.2 Entregável — Relatório de diagnóstico (modelo)

```markdown
# Relatório de Diagnóstico — [Empresa]
Data: ____
Responsável integração: ____

## Resumo executivo (1 página)
## Contexto industrial
## Estrutura organizacional
## Processos críticos (AS-IS)
## Gaps tecnológicos
## Módulos IMPETUS contratados
## Riscos de implantação
## Recomendações e escopo do piloto
## Próximos passos
```

## 1.3 Decisões de escopo (obrigatório antes da Etapa 3)

- [ ] Módulos activos: Quality · SST · ManuIA · RH · ESG · Logística · Financeiro · PLC
- [ ] Piloto: qual **setor** + **quantos utilizadores**
- [ ] Integrações fase 1 vs fase 2
- [ ] On-premise vs cloud (VPS dedicado)

---

# ETAPA 2 — INFRAESTRUTURA

## 2.1 Requisitos mínimos (produção single-tenant)

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| SO | Ubuntu 22.04 LTS | Ubuntu 22.04 / 24.04 LTS |
| CPU | 4 vCPU | 8 vCPU |
| RAM | 8 GB | 16 GB |
| Disco | 80 GB SSD | 160 GB SSD NVMe |
| PostgreSQL | 14+ dedicado ou local | PostgreSQL 15+ |
| Rede | 100 Mbps estável | 1 Gbps LAN industrial |
| IP público | Sim (HTTPS) | Sim + DNS próprio |

## 2.2 Checklist infraestrutura

| Item | Verificar | Acção se falhar |
|------|-----------|-----------------|
| Servidor provisionado | CPU/RAM/disco OK | Upgrade antes de instalar |
| SO atualizado | `apt update && upgrade` | Patch de segurança |
| Node.js 20.x | `node -v` | Instalar via nvm/nodesource |
| PostgreSQL | `psql --version` | Instalar + user `impetus_app` |
| PM2 | `pm2 -v` | `npm i -g pm2` |
| Nginx | `nginx -t` | Restaurar site `impetus` |
| Firewall (UFW) | 22, 80, 443 apenas | Fechar portas DB/Node externas |
| DNS | A record → servidor | Configurar antes SSL |
| HTTPS / SSL | Certbot ou Cloudflare | Obrigatório Go Live |
| Backup BD | cron `pg_dump` diário | Script + teste restore |
| Nobreak / energia | UPS servidor | Documentar RTO |
| VPN (opcional) | Acesso remoto suporte | WireGuard/OpenVPN |
| Monitoramento | uptime, disco, PM2 | Uptime Kuma ou similar |

## 2.3 Docker — quando usar

| Cenário | Docker? |
|---------|---------|
| **Produção IMPETUS (canónico)** | **Não** — PM2 + Nginx (como em `install-industrial.sh`) |
| Lab MQTT/Modbus (dev) | Sim — `infra/industrial-lab/` (**OFF em produção**) |
| Observabilidade opcional | Sim — `infra/observability/` |

> Não misturar stack Docker de produção com stack PM2 sem runbook — escolher **um** modelo por ambiente.

---

# ETAPA 3 — INSTALAÇÃO DA PLATAFORMA

## 3.1 Sequência canónica

```bash
# 1. Clonar / copiar release para /var/www/impetus-completa
# 2. Configurar backend/.env (ver template abaixo)
# 3. Instalação automática
cd /var/www/impetus-completa
sudo bash backend/scripts/ops/install-industrial.sh
```

## 3.2 Componentes instalados

| Componente | Processo | Porta interna |
|------------|----------|---------------|
| Backend API | `impetus-backend` (PM2) | 4000 |
| Frontend | `impetus-frontend` (PM2, `dist/`) | 3000 |
| PostgreSQL | systemd | 5432 (localhost) |
| Nginx | reverse proxy | 80 / 443 |

## 3.3 Variáveis de ambiente críticas (`backend/.env`)

```env
NODE_ENV=production
PORT=4000
DB_HOST=127.0.0.1
DB_NAME=impetus_db
DB_USER=impetus_app
DB_PASSWORD=***
JWT_SECRET=***                    # gerar forte, único por cliente
FRONTEND_URL=https://empresa.dominio.com

# Instalação limpa (obrigatório)
IMPETUS_COGNITIVE_LIVING_ENRICHMENT=false
IMPETUS_INDUSTRIAL_LAB_ENABLED=false
IMPETUS_INDUSTRIAL_LAB_AUTO_E2E_ON_BOOT=false
IMPETUS_MODULE_ACCESS_GOVERNANCE=true

# IA (preencher conforme contrato)
OPENAI_API_KEY=***
ANTHROPIC_API_KEY=***
```

## 3.4 Persistência, logs, backup

| Item | Local / comando |
|------|-----------------|
| Dados | PostgreSQL `impetus_db` |
| Uploads / ficheiros | conforme `.env` e rotas storage |
| Logs PM2 | `~/.pm2/logs/` |
| Migrações | `node backend/scripts/run-all-migrations.js` |
| Backup diário | `pg_dump -Fc impetus_db > backup_$(date +%F).dump` |
| Retenção | 30 dias mínimo |

## 3.5 Validação pós-instalação

```bash
curl -s http://127.0.0.1:4000/health
node backend/scripts/ops/smoke-clean-install.js
cd backend && npm run test:contextual-modules && npm run test:domain-isolation
pm2 list   # impetus-backend + impetus-frontend online
```

---

# ETAPA 4 — CONFIGURAÇÃO DA EMPRESA

## 4.1 Ordem obrigatória (Base Estrutural)

```
1. Criar empresa (Setup Empresa ou POST /api/companies)
2. Admin root + alteração de senha
3. /app/admin/structural — departamentos
4. /app/admin/structural — setores (por departamento)
5. /app/admin/structural — cargos (company_roles) com:
   - department_id, sector_id
   - dashboard_functional_hint (hr, quality, maintenance, executive…)
   - hierarchy_level
   - recommended_permissions / hidden_themes
6. /app/admin/users — cada utilizador com company_role_id
7. Validar structural_complete por utilizador
```

## 4.2 RBAC — regra IMPETUS

| Camada | O que controla |
|--------|----------------|
| `users.role` | Guard de rota (CEO, admin, operador…) |
| `company_roles` | **Menu e módulos** (fonte principal) |
| `moduleAccessGovernanceEngine` | visible_modules autoritário |
| `dashboardProfiles` | Widgets e layout do dashboard |

**Regra de ouro:** sem `company_role_id` → menu inconsistente.

## 4.3 Perfis mínimos a criar

| Cargo formal | functional_hint | Módulos típicos |
|--------------|-----------------|-----------------|
| CEO / Diretor | executive | dashboard, operational, audit, biblioteca |
| Gerente produção | production / operations | operational, quality (se contratado) |
| Supervisor | production | operational, pulse gestão |
| Operador | production | operational, manuia (se contratado) |
| Mecânico | maintenance | manuia, operational |
| Qualidade | quality | quality_intelligence |
| SST | safety | safety_intelligence |
| RH | hr | hr_intelligence |
| TI / Admin | admin | admin, audit |

## 4.4 Turnos e equipes

- Turnos: cadastrar em estrutura operacional / equipes (`/app/admin/equipes-operacionais`)
- Escalas: conforme módulo RH contratado
- Validar Pulse Gestão / Pulse RH por perfil após cadastro

---

# ETAPA 5 — CADASTRO INDUSTRIAL

## 5.1 Sequência recomendada

| Ordem | O quê | Onde no IMPETUS |
|-------|-------|-----------------|
| 1 | Biblioteca de equipamentos | `/app/admin/equipment-library` |
| 2 | Máquinas / ativos | Admin + mapa industrial |
| 3 | Pontos monitorados | Centro operações industrial |
| 4 | Procedimentos / manuais | Biblioteca |
| 5 | Planos preventivos (TPM) | Dashboard manutenção |
| 6 | Checklists qualidade | Quality operational |
| 7 | QR / identificação campo | ManuIA / inspeções |

## 5.2 Sensores / CLPs (fase piloto)

- MQTT / Modbus / OPC-UA: **OFF por defeito** — activar só após teste em ambiente controlado
- Flags: `IMPETUS_MQTT_*`, `IMPETUS_MODBUS_*`, `IMPETUS_OPCUA_*`
- Edge agent: apenas se contratado e documentado

## 5.3 Critério “cadastro suficiente para piloto”

- [ ] ≥1 departamento + ≥1 setor + cargos piloto
- [ ] ≥5 utilizadores piloto com `company_role_id`
- [ ] ≥3 máquinas ou equipamentos cadastrados (se módulo industrial activo)
- [ ] ≥1 fluxo Quality **ou** ManuIA **ou** SST definido para testar

---

# ETAPA 6 — INTEGRAÇÕES

## 6.1 Matriz de integrações

| Sistema | Método IMPETUS | Estado típico | Documentar |
|---------|----------------|---------------|------------|
| ERP (pedidos, OP) | API / `mesErpIntegrationService` | Por projeto | Mapeamento campos |
| PostgreSQL externo | ETL / views | Opcional | Schema, frequência |
| CLP / PLC | `plcCollector`, MQTT | Opt-in | IP, tags, scan rate |
| Sensores IoT | MQTT broker | Opt-in | Tópicos, tenant_id |
| E-mail | SMTP (`impetus-lab-smtp` dev) | Configurar prod | SPF/DKIM |
| WhatsApp | API terceiros | Por contrato | Webhook |
| Billing | Asaas webhook | Se SaaS | `/api/webhooks/asaas` |
| SSO / OIDC | Lab OIDC | Enterprise | SAML/OIDC |

## 6.2 Documento por integração

Para cada uma, preencher:

1. Nome e versão do sistema legado  
2. Direção (entrada / saída / bidirecional)  
3. Protocolo e autenticação  
4. Frequência e volume  
5. Responsável cliente / IMPETUS  
6. Plano de teste e rollback  

---

# ETAPA 7 — SEGURANÇA

## 7.1 Checklist pré-Go Live

| # | Item | Como validar |
|---|------|--------------|
| 1 | HTTPS obrigatório | Sem HTTP plano em produção |
| 2 | JWT_SECRET único | Não reutilizar entre clientes |
| 3 | DB não exposto | `ss -tlnp` — 5432 só localhost |
| 4 | Rate limit Nginx | `/api/auth/` limitado |
| 5 | RBAC por cargo | Teste 4 personas (CEO, RH, op, admin) |
| 6 | Auditoria | `/app/admin/audit-logs` activo |
| 7 | LGPD / DSR | Fluxo pedido titular testado |
| 8 | Política senhas | Mín. 8 caracteres, troca no 1º acesso |
| 9 | Backup + restore | Restore em ambiente de teste < 4 h |
| 10 | `.env` fora do git | Permissões 600 no servidor |
| 11 | Lab industrial OFF | PM2 lab stopped |
| 12 | Enrichment sintético OFF | `smoke-clean-install.js` |

## 7.2 Comandos úteis

```bash
npm run test:security          # backend
npm run cert:drift             # matriz funcional
ufw status
```

---

# ETAPA 8 — INTELIGÊNCIA ARTIFICIAL

## 8.1 Princípios na implantação

1. **IA só com dados autorizados** — `secureContextBuilder` + tenant scope  
2. **Sem dados inventados** — `IMPETUS_COGNITIVE_LIVING_ENRICHMENT=false`  
3. **Chaves API** por cliente, com quota e monitorização  
4. **ManuIA** — diagnóstico vinculado a equipamentos reais cadastrados  
5. **Chat** — política de uso assinada pelo cliente  

## 8.2 Módulos IA por domínio

| Domínio | Funcionalidade | Pré-requisito cadastro |
|---------|----------------|------------------------|
| Operacional | Alertas, cérebro operacional | Alertas / eventos reais |
| Manutenção | ManuIA, OS, preventiva | Equipamentos + biblioteca |
| Qualidade | NC, CAPA, inspeção | Planos inspeção |
| SST | Incidentes, treinamentos | Colaboradores + setores |
| ESG | Emissões, resíduos | Pontos ambientais |
| Executivo | Dashboard, pulso | Base Estrutural completa |

## 8.3 Configuração

- Definir providers no `.env` (OpenAI, Anthropic, Gemini conforme contrato)
- Testar `/app/chatbot` com utilizador piloto
- Validar que respostas citam fonte BD ou declaram ausência de dados

---

# ETAPA 9 — TESTES E HOMOLOGAÇÃO

## 9.1 Matriz de testes

| Área | Teste | Comando / evidência |
|------|-------|---------------------|
| Login | 10 utilizadores piloto | Manual + log auth |
| Permissões | Menu por cargo | `test:contextual-modules` + browser |
| BD | Integridade tenant | Queries `company_id` |
| APIs | Health + rotas P0 | `curl /health`, FUNCTIONAL_MATRIX |
| IA | 20 perguntas operacionais | Registro sem alucinação crítica |
| Upload | Biblioteca / anexos | Manual |
| Notificações | Alertas operacionais | Criar alerta → ver no painel |
| Integrações | PLC/ERP se activas | Teste ponta-a-ponta |
| Performance | 20 users simultâneos | k6 ou JMeter (opcional) |
| Segurança | `test:security` | Relatório |
| Backup | Restore | `pg_restore` em staging |
| Falha | `pm2 restart` | Recovery < 2 min |

## 9.2 Relatório de homologação (modelo)

```markdown
# Relatório de Homologação — [Empresa]
Período: ____ a ____
Ambiente: produção / staging

## Resumo: APROVADO / APROVADO COM RESSALVAS / REPROVADO
## Testes executados (tabela pass/fail)
## Bugs abertos (P0/P1/P2)
## Ressalvas aceites pelo cliente
## Assinaturas: cliente + integrador
```

## 9.3 Critério mínimo Go Live

- **0 bugs P0** (bloqueador login, perda dados, menu errado para todos)
- **≤3 bugs P1** com workaround documentado
- Smoke + governança **100%** nos testes automáticos
- Piloto **≥14 dias** sem incidente crítico

---

# ETAPA 10 — TREINAMENTO

## 10.1 Planos por perfil

| Perfil | Duração | Conteúdo | Material |
|--------|---------|----------|----------|
| Diretoria | 2 h | Dashboard executivo, KPIs, pulso | Slides + demo CEO |
| Gerência | 3 h | Operacional, relatórios, aprovações | Hands-on |
| Supervisão | 3 h | Pulse gestão, alertas, equipes | Hands-on |
| Operadores | 2 h | Tarefas, registro, QR | Guia 1 página |
| Manutenção | 4 h | ManuIA, OS, preventiva | Guia ManuIA |
| Qualidade | 4 h | NC, CAPA, inspeção | Fluxo certificado |
| RH | 2 h | Pulse RH, cadastros | Admin RH |
| TI | 4 h | Admin, backup, users, logs | `INSTALACAO_INDUSTRIAL.md` |

## 10.2 Cronograma tipo (semana de treino)

| Dia | Manhã | Tarde |
|-----|-------|-------|
| Seg | TI + Admin | Gerência |
| Ter | Qualidade + SST | Manutenção |
| Qua | Operadores turno 1 | Operadores turno 2 |
| Qui | RH + Diretoria | Retake / dúvidas |
| Sex | Avaliação + certificado presença | — |

## 10.3 Objetivo por perfil

Cada participante deve conseguir: **login → encontrar o seu módulo → executar 1 tarefa real do dia-a-dia**.

---

# ETAPA 11 — PROJETO PILOTO

## 11.1 Escopo piloto recomendado

- **1 setor** (ex.: embalagem, linha 2)
- **5–15 utilizadores** (supervisor + operadores + 1 manutenção + 1 qualidade)
- **1 fluxo principal:** NC **ou** OS ManuIA **ou** incidente SST
- **Duração:** 15–30 dias

## 11.2 Registo diário (planilha ou ticket)

| Data | Problema | Severidade | Acção | Responsável | Estado |
|------|----------|------------|-------|-------------|--------|

## 11.3 Indicadores piloto

- Uptime sistema (%)
- Tickets suporte / semana
- Utilizadores activos / dia
- Tarefas concluídas no IMPETUS vs manual
- Tempo médio registro NC ou OS

## 11.4 Gate expansão

- [ ] Piloto ≥14 dias estável
- [ ] Bugs P0/P1 piloto resolvidos
- [ ] Treino piloto concluído
- [ ] Cliente assina acta de expansão

---

# ETAPA 12 — GO LIVE

## 12.1 Checklist D-Day (T-0)

| Hora | Actividade |
|------|------------|
| T-24h | Backup completo BD + `.env` |
| T-12h | Freeze deploy (sem releases) |
| T-2h | Smoke final + PM2 estável |
| T-1h | Comunicado interno cliente |
| T-0 | Activar todos os utilizadores |
| T+2h | War room suporte (chat/telefone) |
| T+24h | Relatório dia 1 |
| T+72h | Retrospectiva |

## 12.2 Go Live — garantias

- [ ] Sistema estável (PM2 <5 restarts/dia)
- [ ] Utilizadores treinados
- [ ] Backup automático activo
- [ ] Monitoramento (uptime + disco + PM2)
- [ ] Equipe suporte em escala
- [ ] Plano contingência impresso

## 12.3 Plano de contingência (resumo)

| Cenário | Acção |
|---------|-------|
| Backend down | `pm2 restart impetus-backend`; se persistir, restore BD |
| BD corrompida | Restore último `pg_dump` |
| Internet cliente | Modo degradado documentado (cache local se PWA) |
| Erro massivo menu | Rollback frontend `dist/` anterior |

---

# ETAPA 13 — OPERAÇÃO ASSISTIDA (60–90 dias)

## 13.1 Rotina integrador

| Frequência | Actividade |
|------------|------------|
| Diária | Verificar PM2, logs erro, tickets |
| Semanal | Reunião 30 min com cliente + indicadores |
| Quinzenal | Revisão cadastros / cargos novos |
| Mensal | Relatório operação + melhorias |

## 13.2 SLA sugerido (ajustar contrato)

| Prioridade | Exemplo | Tempo resposta |
|------------|---------|----------------|
| P0 | Sistema inacessível | 2 h |
| P1 | Módulo crítico inutilizável | 8 h |
| P2 | Bug menor / UX | 48 h |
| P3 | Melhoria | Backlog |

---

# ETAPA 14 — MELHORIA CONTÍNUA

## 14.1 Ciclo trimestral

1. Auditoria segurança (`test:security`, patches SO)  
2. Revisão `FUNCTIONAL_MATRIX` / novos módulos contratados  
3. Expansão telemetria (PLC, MQTT) se piloto OK  
4. Formação reciclagem novos colaboradores  
5. Backup restore test trimestral  

## 14.2 Evolução controlada

- Novos módulos: apenas após aprovação explícita (architecture freeze em certificação)  
- Actualizações: janela de manutenção + rollback plan  
- Novas unidades: repetir Etapas 4–5 por filial  

---

# ENTREGÁVEIS (10 documentos)

| # | Entregável | Secção neste plano |
|---|------------|-------------------|
| 1 | Plano completo de implantação | Documento integral |
| 2 | Cronograma por fases | Sumário executivo + tabelas por etapa |
| 3 | Checklist técnico | Etapas 2, 3, 7, 9 |
| 4 | Checklist operacional | Etapas 4, 5, 11 |
| 5 | Checklist segurança | Etapa 7 |
| 6 | Plano de treinamento | Etapa 10 |
| 7 | Plano Go Live | Etapa 12 |
| 8 | Plano de contingência | Etapa 12.3 |
| 9 | Plano suporte pós-implantação | Etapa 13 |
| 10 | Relatório riscos e recomendações | Abaixo |

---

# RELATÓRIO DE RISCOS E RECOMENDAÇÕES

| Risco | Prob. | Impacto | Mitigação |
|-------|-------|---------|-----------|
| Cadastro estrutural incompleto | Alta | Alto | Etapa 4 obrigatória; script validação `company_role_id` |
| Menu errado por cargo | Média | Alto | Testes automáticos + UAT 4 personas |
| Servidor subdimensionado | Média | Médio | Monitor RAM/CPU primeira semana |
| Integração PLC prematura | Média | Alto | Piloto sem telemetria; activar na fase 2 |
| Resistência utilizadores | Alta | Médio | Piloto pequeno + campeões por setor |
| Chaves IA expostas | Baixa | Crítico | `.env` 600, rotação trimestral |
| Backup não testado | Média | Crítico | Restore obrigatório antes Go Live |

**Recomendações finais:**

1. **Nunca** Go Live sem Base Estrutural completa nos utilizadores piloto.  
2. **Sempre** tenant limpo — cliente cadastra dados reais (sem enrichment sintético).  
3. **Piloto pequeno** antes de planta inteira.  
4. **Um ambiente de produção** — PM2 canónico; lab Docker só em dev.  
5. **Homologação assinada** antes de cobrança recorrente plena.

---

# CRONOGRAMA VISUAL (GANTT SIMPLIFICADO)

```
Semana:  1    2    3    4    5    6    7    8    9   10   11   12
         |----|----|----|----|----|----|----|----|----|----|----|
Diag     ████
Infra         ████
Install            ██
Config             ████████
Industrial              ████████████
Integrações                  ████████████████
Seg+IA                            ████
Testes                               ██████
Treino                                  ████
Piloto                                     ████████████████████
Go Live                                                         █
Operação assistida                                              ████████████████████████████
```

---

# ANEXO A — CHECKLIST TÉCNICO (imprimível)

```
[ ] Servidor Ubuntu 22.04+ provisionado
[ ] Node 20 + PM2 + PostgreSQL 14+
[ ] Nginx + SSL activo
[ ] install-industrial.sh executado com sucesso
[ ] smoke-clean-install.js OK
[ ] test:contextual-modules OK
[ ] test:domain-isolation OK
[ ] Lab PM2 parado
[ ] LIVING_ENRICHMENT=false
[ ] Backup pg_dump agendado
[ ] Restore testado
[ ] Firewall configurado
[ ] Health 200 público via HTTPS
```

---

# ANEXO B — CHECKLIST OPERACIONAL (imprimível)

```
[ ] Empresa cadastrada
[ ] Departamentos criados
[ ] Setores criados
[ ] Cargos (company_roles) com hint e hierarquia
[ ] Todos utilizadores com company_role_id
[ ] Equipamentos / máquinas piloto cadastrados
[ ] 1 fluxo Quality ou ManuIA ou SST definido
[ ] Treino concluído por perfil piloto
[ ] Acta piloto assinada
[ ] Go Live comunicado
```

---

*IMPETUS Industrial · Plano de Implantação Completa v1.0 · OPS/CERT*
