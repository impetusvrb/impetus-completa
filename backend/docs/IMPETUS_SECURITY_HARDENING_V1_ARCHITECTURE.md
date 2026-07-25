# IMPETUS Security Hardening V1 — Arquitetura de Autoproteção

**Tipo:** Avaliação arquitetural (sem implementação)  
**Data:** 2026-07-04  
**Princípio:** Defense in Depth · aditivo · zero regressão · respostas defensivas (nunca ofensivas)

---

## 1. Auditoria da arquitetura atual

### 1.1 Stack e superfície

| Camada | Tecnologia | Notas |
|--------|------------|-------|
| Edge | nginx + Cloudflare (parcial) | HARDENING-02: 403 paths sensíveis, rate limit, log TLS |
| Frontend | React + Vite | `sourcemap: false`; assets com hash em `/assets/` |
| Backend | Node.js + Express | `backend/src/server.js`; PM2 |
| Dados | PostgreSQL | Multi-tenant `company_id` |
| Eventos | Industrial Outbox + Event Governance | Congelado |
| Cognitivo | Cognitive Core + ECO + AIOI | Congelado |

### 1.2 Domínios de segurança já certificados

- **SECURITY-BASELINE-01** → baseline de ficheiros, config, processos, comunicação
- **SEC-01→20** → Enterprise Security v2 (observatório, correlação, integridade runtime, SOC, exfiltração, certificação)
- **HARDENING-01/02** → pós-incidente Silvy (nginx, integridade SHA256, fail2ban, `.env` 600)
- **Event Governance v1** · **ECO-08** · **Enterprise Baseline v1** — congelados

### 1.3 Lacunas identificadas (gap analysis)

| Área | Estado actual | Gap |
|------|---------------|-----|
| Integridade contínua | Scripts periódicos + SEC-04 (flag OFF) | Sem watcher em tempo real; sem Merkle/assinatura |
| Self-healing | `git checkout` manual (incidente) | Sem restauro automático validado |
| Criptografia em repouso | KMS Governance (OFF); uploads em disco claro | Cobertura parcial |
| Anti-tamper runtime | SEC-04 consultivo | Sem bloqueio de execução automático |
| Download seguro | `secureStaticUploads` + RBAC | Sem URLs temporárias assinadas |
| Anti-cópia | `licenseEnforcement` | Sem binding criptográfico de instalação |
| Canary / honeypot ficheiros | SEC-16 (lógico) | Sem canary físico no filesystem |
| mTLS interno | Não | Serviços comunicam em localhost sem mTLS |

---

## 2. O que já existe (inventário reutilizável)

### Integridade e baseline

| Componente | Path | Capacidade |
|------------|------|------------|
| `integrity-check.sh` | `scripts/` | SHA-256 manifest, drift report JSON |
| SEC-04 Runtime Integrity | `securityRuntimeIntegrity/` | Hash, config, runtime, filesystem, network validators |
| SECURITY-BASELINE-01 | `evidence/security-baseline-01/` | Manifests, snapshots PM2/UFW/portas |
| AIOI Baseline services | `services/aioi/runtime/aioiBaseline*` | Freeze, recovery, traceability, registry |
| BASELINE-LOCK-01 | `tests/audit/` | Certificação baseline enterprise |

### Criptografia e chaves

| Componente | Path | Capacidade |
|------------|------|------------|
| KMS Governance | `services/kms/kmsGovernanceService.js` | AES-256-GCM, envelope, rotação, tenant isolation |
| AWS/GCP key material | `services/kms/awsKmsKeyMaterial.js` | Integração cloud KMS (stubs/providers) |
| `crypto` nativo | Node.js | JWT, hashing, GCM |

### Auditoria e forense

| Componente | Path | Capacidade |
|------------|------|------------|
| Universal Audit | `middleware/universalAuditMiddleware.js` | Hash chain, P0 allowlist, LGPD-safe |
| SEC-01 Observatory | `securityObservatory/` | Buckets HTTP, métricas |
| SEC-02 Correlation | `securityCorrelation/` | Incidentes, timeline |
| `requestAccessLog` | `middleware/requestAccessLog.js` | IP, rota, status (produção) |
| `correlationId` | `middleware/correlationId.js` | X-Request-Id |

### Acesso e anti-cópia

| Componente | Path | Capacidade |
|------------|------|------------|
| RBAC + multi-tenant | `middleware/auth.js`, `moduleAccessGovernanceEngine` | Permissões por módulo |
| License enforcement | `middleware/licenseEnforcement.js` | Validação licença, grace period |
| Uploads protegidos | `middleware/secureStaticUploads.js` | Auth + `userCanReadUpload` |
| Executive Baseline Pack | `services/executiveBaselinePack.js` | Baseline executivo aditivo |
| Dashboard Engine V2 | `dashboardEngineV2/` | Composição, auditoria, telemetria |

### Produção e edge

| Componente | Capacidade |
|------------|------------|
| nginx HARDENING-02 | 403 scanner paths, rate limit, log forense |
| fail2ban | sshd + impetus-nginx-scan + nginx-limit-req |
| UFW | SSH/HTTP restritos; scanners bloqueados |
| `globalRateLimit` | Rate limit por IP/user |
| `helmet` + CSP | `config/security.js` |
| `sendSafeError` | Sem stack trace em produção |
| Obfuscator | `scripts/obfuscate.js` (opcional, não produção default) |

### Resposta defensiva (SEC v2)

SEC-14→18: blocking adaptativo, anti-scanner, deception, exfiltração, runtime protection — **todos consultivos** (`auto_execute: false`).

---

## 3. O que pode ser reutilizado (sem alteração)

1. **SEC-04** como motor de integridade runtime — expandir manifest, não reescrever validators  
2. **KMS Governance** como Camada 5 — activar progressivamente (`audit` → `on`)  
3. **Universal Audit** como backbone forense Camada 10  
4. **integrity-check.sh** + manifests HARDENING-01 como seed da Camada 1  
5. **SEC-02 incident DTO** para correlacionar tamper + scan + integridade  
6. **licenseEnforcement** como base Camada 7  
7. **secureStaticUploads** + futuro envelope KMS para Camada 4/11  
8. **fail2ban + nginx** como Camada 13 (já operacional)  
9. **AIOI baseline recovery** como referência de self-healing documental  
10. **Dashboard Engine V2 audit** (`contextIdentityAudit`) para UI de integridade

---

## 4. Riscos

| Risco | Severidade | Mitigação |
|-------|------------|-----------|
| Self-healing automático sobrescreve deploy legítimo | Alta | Aprovação humana + assinatura release; healing só em paths congelados |
| KMS ON quebra uploads legados | Alta | Modo `audit`; migração lazy; fallback staging |
| Anti-tamper bloqueia boot após patch | Alta | Degraded mode; flag kill-switch; N-1 rollback |
| Obfuscação dificulta debug e aumenta bundle | Média | Só build “enterprise”; source maps internos seguros |
| Merkle tree em runtime Node impacta CPU | Média | Check incremental; amostragem; off-peak |
| Falso positivo integridade (git dirty) | Média | Separar “deploy drift” de “attack drift” |
| Binding anti-cópia bloqueia DR/migração | Média | Break-glass license + export key ceremony |
| Canary files expostos revelam defesa | Baixa | Honeypots lógicos (SEC-16) sem ficheiro real |

---

## 5. Impacto de desempenho (estimativa)

| Mecanismo | Overhead estimado | Frequência |
|-----------|-------------------|------------|
| SHA-256 incremental (1k ficheiros) | 50–200 ms | 60 s |
| Merkle rebuild completo | 500 ms–2 s | 5 min |
| KMS encrypt/decrypt (4 KB) | 1–5 ms | por I/O |
| Watcher inotify | <1% CPU | contínuo |
| Assinatura Ed25519 verify | <1 ms | por ficheiro crítico |
| Audit forense append | <2 ms | por write P0 |

**Recomendação:** integridade pesada em **worker separado** (PM2 `impetus-integrity-worker`) — zero impacto no hot path HTTP.

---

## 6. Compatibilidade com arquitetura actual

### Invioláveis (não alterar)

- Event Governance · ECO · Cognitive Core · Enterprise Baseline v1  
- Módulos SEC-01→20 (apenas consumo read-only)  
- Contratos API públicos · DTOs certificados  
- Fluxo PM2/nginx actual como default

### Padrão aditivo obrigatório

```
backend/src/impetusSelfProtection/     ← novo pacote (proposto)
  config/flags.js                      ← tudo OFF por defeito
  integrity/                           ← Camada 1, 9
  healing/                             ← Camada 2
  tamper/                              ← Camada 3
  encryption/                          ← Camada 4 (wrapper KMS)
  audit/                               ← Camada 10 (extensão universal)
  assets/                              ← Camada 8 (critical asset guard)
  index.js                             ← init() no server.js (try/catch)
```

Integração apenas via:
- `server.js` → `require('./impetusSelfProtection').init()`  
- `routes/audit.js` → novo endpoint read-only  
- Flags `.env` → `IMPETUS_SELF_PROTECTION=false`

---

## 7. Plano de implementação em fases

### Fase SH-01 — File Integrity Monitor (4–6 semanas)

- Worker PM2: watcher + SHA-256 manifest expandido  
- Merkle tree sobre manifest (root hash em `evidence/integrity/`)  
- Integração SEC-04 + SEC-02 incidentes em drift CRITICAL  
- Endpoint `GET /api/audit/self-protection/integrity`

### Fase SH-02 — Self-Healing Controlado (3–4 semanas)

- Restauro **apenas** de paths em manifest assinado (git tag release)  
- Quarentena antes de restore (`*.quarantine.TIMESTAMP`)  
- Nunca auto-restore em `.env`, `node_modules`, uploads utilizador  
- Manual approval queue para healing em produção (SEC-18 pattern)

### Fase SH-03 — Anti-Tamper Runtime (3 semanas)

- Verificação bundle frontend hash vs manifest no boot  
- Bloqueio módulo comprometido (degraded: API up, feature OFF)  
- Canary files (0-byte markers) em paths não servidos

### Fase SH-04 — Encryption at Rest (6–8 semanas)

- KMS Governance `audit` → `on` por tenant piloto  
- Upload pipeline: encrypt on write, decrypt stream on read  
- Chaves temporárias em memória; zero persistência plaintext

### Fase SH-05 — Secure Download & Anti-Exfil (4 semanas)

- URLs assinadas HMAC (TTL 5–15 min)  
- Limite downloads/IP/hora  
- Integração SEC-17 read-only

### Fase SH-06 — Anti-Copy & License Binding (4 semanas)

- Instalação assinada (Ed25519) + `instance_id`  
- Validação ambiente (hostname, opcional TPM)  
- Extensão `licenseEnforcement` — sem remover fluxo actual

### Fase SH-07 — Obfuscation Enterprise Build (2 semanas)

- Pipeline CI `build:enterprise` separado de dev  
- Source maps guardados em vault interno, nunca públicos

### Fase SH-08 — Certificação SH-V1 (2 semanas)

- Testes + evidências `evidence/sh-01/`  
- Regressão SEC-01→20 + EG + ECO

---

## 8. Priorização (MoSCoW)

| Prioridade | Item | Justificação |
|------------|------|--------------|
| **P0** | Integridade contínua + alertas | Incidente Silvy provou gap |
| **P0** | Healing controlado (git-signed) | 56 ficheiros apagados no incidente |
| **P0** | KMS uploads + docs sensíveis | Exfiltração era risco #1 |
| **P1** | Anti-tamper bundle/backend | Integridade execução |
| **P1** | Download tokens + audit forense | DLP consultivo |
| **P1** | Canary + SEC-16 linkage | Detecção precoce |
| **P2** | Anti-cópia binding | Comercial / on-prem enterprise |
| **P2** | Obfuscation build | RE resistance (não segurança real) |
| **P3** | mTLS interno | Complexidade vs benefício em single-node |
| **P3** | HSM físico | Só clientes regulados |

---

## 9. Tecnologias recomendadas

| Função | Recomendação | Alternativa |
|--------|--------------|-------------|
| Hash ficheiros | SHA-256 (baseline) + BLAKE3 (performance) | SHA-512 |
| Árvore integridade | Merkle tree custom Node | `merkletreejs` |
| Assinatura | Ed25519 (`crypto.sign`) | RSA-PSS (legado) |
| Criptografia repouso | AES-256-GCM (já KMS) | ChaCha20-Poly1305 |
| Envelope keys | KMS Governance existente | AWS KMS / GCP KMS |
| HSM | AWS CloudHSM / GCP HSM | HashiCorp Vault |
| Filesystem watch | `chokidar` em worker | inotify via `fs.watch` |
| Healing source | Git signed tags + manifest | Restic backup (off-site) |
| WAF | Cloudflare (já parcial) | ModSecurity |
| Obfuscation | `javascript-obfuscator` (já) | Bytenode (backend) |

---

## 10. Comparação entre alternativas

### 10.1 Integridade: polling vs inotify vs Merkle

| Critério | Polling (actual) | inotify + SHA | Merkle incremental |
|----------|------------------|---------------|-------------------|
| Detecção | Minutos | Segundos | Segundos |
| CPU | Baixo | Médio | Médio-alto |
| Prova forense | Fraca | Boa | Excelente (root hash) |
| Complexidade | Baixa | Média | Alta |
| **Escolha** | Manter como fallback | **SH-01 primary** | **SH-01 para releases** |

### 10.2 Self-healing: git vs backup vs replica

| Critério | Git checkout | Backup Restic | Réplica standby |
|----------|--------------|---------------|-----------------|
| Velocidade | Rápido | Médio | Instantâneo |
| Integridade | Commit assinado | Snapshot hash | Sync lag |
| Risco overwrite | Alto se mal configurado | Baixo | Médio |
| **Escolha** | **Healing P0 files** | **DR completo** | Futuro multi-node |

### 10.3 Criptografia: app-level vs filesystem vs DB TDE

| Critério | App KMS (actual) | LUKS/dm-crypt | PostgreSQL TDE |
|----------|------------------|---------------|----------------|
| Granularidade | Por ficheiro/tenant | Volume inteiro | Tabelas |
| Portabilidade | Alta | Baixa | Média |
| **Escolha** | **Camada 4 primary** | Infra opcional | Complementar DB |

### 10.4 Anti-cópia: license vs hardware binding

| Critério | License middleware | TPM/Instance ID | Online activation |
|----------|-------------------|-----------------|-------------------|
| Já existe | Sim | Não | Parcial |
| UX offline | Boa | Média | Ruim |
| **Escolha** | **Manter + assinatura** | Enterprise tier | SaaS only |

---

## 11. Riscos de regressão

| Área | Risco | Controle |
|------|-------|----------|
| Boot server | init() falha | try/catch; flag OFF |
| Uploads | decrypt fail | Dual-read plaintext+cipher durante migração |
| Dashboard | latency | Worker isolado |
| Testes SEC | timeout | SH tests separados; não nested em SEC-19 |
| Git dirty | false tamper | Whitelist `M` em dev; baseline só em CI/prod |
| License | false block | grace + whitelist health |

**Gate obrigatório:** cada fase SH requer regressão SEC-01→20 + EG smoke + `integrity-check.sh` PASS.

---

## 12. Estratégia de testes

```
tests/selfProtection/
  SH_01_FILE_INTEGRITY.test.js      — manifest, merkle, drift detection
  SH_02_SELF_HEALING.test.js        — quarantine, restore, no .env touch
  SH_03_ANTI_TAMPER.test.js         — bundle mismatch → degraded
  SH_04_ENCRYPTION_AT_REST.test.js  — roundtrip KMS mock
  SH_05_SECURE_DOWNLOAD.test.js     — TTL, signature, replay
  SH_06_ANTI_COPY.test.js           — license + instance binding
  SH_INTEGRATION_SEC.test.js        — SEC-04/17/02 consume only
  SH_REGRESSION_BASELINE.test.js    — EG/ECO/Cognitive untouched
```

- **Simulação:** alterar ficheiro em `/tmp` manifest; apagar ficheiro P2; probe canary  
- **Stress:** 10k hash checks < 30 s  
- **Chaos:** kill worker → supervisor restart; zero HTTP drop

---

## 13. Estratégia de rollback

1. **Flag OFF:** `IMPETUS_SELF_PROTECTION=false` + PM2 restart  
2. **Por fase:** `IMPETUS_SH_INTEGRITY=false`, `IMPETUS_SH_HEALING=false`, etc.  
3. **Healing rollback:** restaurar de `*.quarantine.*`  
4. **KMS rollback:** `IMPETUS_KMS_GOVERNANCE=off` — leitura plaintext legacy  
5. **Documentação:** `SH_ROLLBACK.md` por fase (espelhar SEC_*_ROLLBACK.md)  
6. **Evidência:** `evidence/sh-XX/criteria.json` antes de activar em produção

---

## 14. Garantia de implementação 100% aditiva

| Regra | Mecanismo |
|-------|-----------|
| Não remover código | Novo pacote `impetusSelfProtection/` isolado |
| Não alterar SEC/EG/ECO | Apenas `getAuditPayload()` consumido |
| Não alterar contratos API | Novos endpoints `/api/audit/self-protection/*` |
| Feature flags OFF | Todos os módulos shadow por defeito |
| Execução consultiva | Healing/tamper block requerem approval (SEC-18 pattern) |
| Resposta defensiva | 403/503 + audit + alert; nunca payload ofensivo |
| Testes não destrutivos | Mocks; nunca `iptables`/`rm -rf` em CI |
| PR gate | Bugbot + regressão SEC + `BASELINE_LOCK_01` |

---

## Avaliação por camada (viabilidade)

| Camada | Viabilidade | Reutilização | Esforço |
|--------|-------------|--------------|---------|
| 1 File Integrity | **Alta** | SEC-04, integrity-check.sh | M |
| 2 Self-Healing | **Média** | git recovery incidente, AIOI recovery | M-H |
| 3 Anti-Tamper | **Alta** | SEC-04, vite hash | M |
| 4 Doc Encryption | **Alta** | KMS Governance | H |
| 5 Key Management | **Alta** | kmsGovernanceService | M (activar) |
| 6 Obfuscation | **Alta** | obfuscate.js | L |
| 7 Anti-Copy | **Média** | licenseEnforcement | M |
| 8 Deletion Protection | **Média** | audit + OS permissions | M |
| 9 Integrity Monitor | **Alta** | SEC-01 + worker | M |
| 10 Forensic Audit | **Alta** | universalAuditMiddleware | L-M |
| 11 Download Defense | **Alta** | secureStaticUploads | M |
| 12 Anti-RE | **Média** | obfuscation; limites reais | L-M |
| 13 Production Sec | **Alta** | nginx, fail2ban, helmet | L (feito) |
| 14 Audit Integration | **Alta** | Executive Baseline, DE V2 | M |

---

## Resposta defensiva (política IMPETUS)

Em qualquer detecção de tamper, scan massivo ou acesso não autorizado:

1. Bloquear operação (403/404/503)  
2. Invalidar sessões se comprometimento de credencial  
3. Isolar request (rate limit + fail2ban)  
4. Alertar admin (SEC-05/06 read-only)  
5. Preservar evidência (audit + hash before/after)  
6. Elevar monitorização (SEC-01 buckets)  
7. **Nunca** executar código ofensivo, malware ou retaliação

---

## Próximo passo recomendado

**Aprovar Fase SH-01** (File Integrity Monitor) como piloto — maior ROI pós-incidente, menor risco de regressão, alinha com SEC-04 e HARDENING-01 sem duplicar motores.

---

*Documento de arquitetura — não autoriza implementação até aprovação explícita da equipa.*
