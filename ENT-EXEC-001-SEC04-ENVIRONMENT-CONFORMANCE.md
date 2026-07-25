# ENT-EXEC-001 — SEC-04 Environment Conformance & Revalidation

**Programa:** ENT-EXEC-001 — Enterprise Operational Consolidation  
**Natureza:** atividade operacional de conformidade; não é MB  
**Data:** 21/07/2026  
**Escopo:** Nginx, Blueprint, UFW, artefactos SEC-04 e `integrityScore`  
**Alterações operacionais executadas:** nenhuma  
**Classificação final:** `GOVERNANÇA`  
**Decisão:** `P1 BLOQUEADO`

## 1. Executive Summary

O ambiente **não está conforme** à referência consumida pela SEC-04. A
reexecução canónica permaneceu em 19/20 e o `integrityScore` permaneceu
`0.763`, sem variação.

O requisito não atendido continua sendo o teste 05:
`integrityScore >= 0.85`. A validação de hashes críticos mockados passa. O
score é reduzido por:

1. `NGINX_CONFIG_DRIFT` crítico;
2. `BLUEPRINT_DRIFT` crítico;
3. `UFW_DRIFT` warning.

Não foi aplicada restauração porque os conteúdos byte-a-byte correspondentes
aos hashes certificados de Nginx e Blueprint não estão disponíveis. Há apenas
os digests. Além disso, o Nginx efetivamente carregado, o
`sites-available` e o artefacto do repositório apresentam estados distintos.
Escolher qualquer um deles como alvo sem decisão formal equivaleria a
rebaselining ou rollback por aproximação.

O hash atual de `server.js` permanece integralmente explicado pelo MB-009 e é
tecnicamente válido. Ele não causa o 19/20.

**Conclusão:** não existe blocker de código. O blocker é exclusivamente de
governança: o owner da Security Baseline deve aprovar um estado atual ou
fornecer os artefactos certificados exatos para restauração controlada.

## 2. Estado do ambiente

| Item | Referência SEC-04 | Estado observado | Conformidade |
|---|---|---|---|
| Nginx validado pela SEC-04 | `/etc/nginx/sites-available/impetus`, hash `9b2c913f…e81e9` | hash `1c40c785…1107` | Divergente |
| Nginx efetivamente habilitado | baseline documenta o site certificado | `/etc/nginx/sites-enabled/impetus`, ficheiro regular, hash `9adf69c3…aaba` | Divergente |
| Nginx canónico no repositório | hash certificado `9b2c913f…e81e9` | `infra/nginx/impetus-production.conf`, hash `1c40c785…1107` | Divergente |
| Blueprint Volume 10 | hash `b7835207…c7f` | hash `e1cc4b14…b7cd` | Divergente |
| UFW | snapshot com 35 regras | 396 regras | Divergente com severidade warning |
| Sintaxe Nginx | válida | `nginx -t` aprovado | Conforme |
| SEC-04 | 20/20 e score mínimo 0.85 | 19/20 e score 0.763 | Divergente |

### Respostas obrigatórias

- **O ambiente está conforme à baseline certificada? NÃO.**
- **O `integrityScore` foi revalidado? SIM — 0.763.**
- **A SEC-04 atingiu 20/20? NÃO — permaneceu 19/20.**
- **O hash de `server.js` permanece válido? SIM.**
- **Existe blocker técnico real? NÃO.**
- **O P1 pode ser formalmente liberado? NÃO, enquanto o gate de governança
  não decidir o estado certificado.**

## 3. Comparação Nginx

### 3.1 Resultado

**Nginx: DIVERGENTE.**

O artefacto verificado pela SEC-04 não coincide com a baseline:

| Estado | SHA-256 |
|---|---|
| Certificado SEC-04 | `9b2c913fcc461df6fd80817753202d2c1d818d63ab5f450194c4eedd458e81e9` |
| `/etc/nginx/sites-available/impetus` | `1c40c785a498b7237d46d893ad8b8131b93658e022063303258c166876a11107` |
| `infra/nginx/impetus-production.conf` | `1c40c785a498b7237d46d893ad8b8131b93658e022063303258c166876a11107` |
| `/etc/nginx/sites-enabled/impetus` efetivo | `9adf69c34dc7694e59f808fc3c088c9d53e776d449e35b50f8dec18c079daaba` |

`sites-enabled/impetus` não é symlink; é ficheiro regular. Portanto, a
configuração carregada pode divergir do `sites-available` e do artefacto de
deploy. A SEC-04 atual compara `sites-available`, não o ficheiro efetivamente
habilitado.

### 3.2 Parâmetros divergentes comprovados

Comparando a configuração documentada na SECURITY-BASELINE-01 com o estado
efetivo:

| Parâmetro | Baseline documentada | Estado efetivo |
|---|---|---|
| `server_name` | `srv1422313.hstgr.cloud` | inclui também `plataformaimpetus.com` e `www.plataformaimpetus.com` |
| Certificado TLS | `/etc/letsencrypt/live/srv1422313.hstgr.cloud/` | `/etc/letsencrypt/live/plataformaimpetus.com/` |
| Cloudflare proxy guard | não registado como include ativo na baseline | include ativo |
| IP allowlist wrapper | baseline regista Cloudflare-only como não ativo | include ativo |
| Upstream Admin Portal | não registado na configuração congelada | `127.0.0.1:5174` |
| Rotas administrativas | não registadas na configuração congelada | `/painel` e `/painel/` |
| Exceções webhook | não registadas na configuração congelada | `/api/webhooks/` e `/api/webhook` |

Controles preservados no estado atual:

- backend e frontend em localhost;
- rate limits API/auth/static;
- `server_tokens off`;
- default server com retorno 444;
- real IP Cloudflare;
- hardening anti-scanner;
- headers de segurança;
- sintaxe Nginx válida.

### 3.3 Limitação da comparação

O ficheiro exato que produziu o hash certificado `9b2c…e81e9` não está
disponível entre o estado atual e os backups Nginx inventariados. Os backups
existentes produzem hashes diferentes. Assim:

- a divergência criptográfica é objetiva;
- as diferenças semânticas acima são comprovadas contra a documentação
  certificada;
- um diff byte-a-byte completo contra `9b2c…e81e9` não pode ser reconstruído
  sem o artefacto certificado original.

Restaurar um backup de hash diferente não produziria conformidade e poderia
remover hardening, domínios, webhooks ou Admin Portal.

## 4. Comparação Blueprint

### 4.1 Resultado

**Blueprint: DIVERGENTE.**

| Estado | SHA-256 |
|---|---|
| Volume 10 certificado | `b7835207335c899b9ab951fdf27239908422275b6e5a94883d28d71b13c41c7f` |
| Volume 10 atual | `e1cc4b14f087cd38c9c101343959220c20443abab222c875bf6f6b48298db7cd` |

O ficheiro atual possui 8.399 bytes e `mtime` de 10/07/2026, posterior à
sincronização da baseline de 04/07/2026.

### 4.2 Diferença identificável

A diferença exata comprovável é a substituição integral da identidade
criptográfica do artefacto:

`b7835207…c7f` → `e1cc4b14…b7cd`.

Não existe cópia do conteúdo `b783…c7f` no workspace; somente o hash foi
preservado em:

- `security-baseline-01/blueprint-volumes.sha256`;
- `operational-go-live-01/hardening-baseline.sha256`.

Sem os bytes certificados, não é possível produzir diff linha a linha nem
restaurar o Blueprint com prova de hash. Uma substituição por conteúdo
estimado seria uma alteração de documentação certificada sem evidência e foi
corretamente recusada.

### 4.3 Precedente de governança

SEC-21B já classificou uma evolução anterior do mesmo Volume 10 como
`CERTIFIED_EVOLUTION`. Isso não aprova automaticamente o hash atual, mas
confirma que a decisão adequada é aprovar ou rejeitar a evolução documental,
e não editar o ficheiro para satisfazer o score.

## 5. Avaliação UFW

### 5.1 Resultado

**O UFW representa: WARNING ACEITÁVEL.**

| Métrica | Baseline | Atual | Diferença |
|---|---:|---:|---:|
| Regras totais | 35 | 396 | +361 |
| `ALLOW` | 12 | 52 | +40 |
| `DENY` | 23 | 344 | +321 |
| Regras IPv6 identificadas | 8 | 35 | +27 |

O crescimento é compatível com evolução operacional de ranges Cloudflare e
bloqueios de scanners/auto-ban. A auditoria forense de 13/07 registou
Cloudflare permitido e ausência de bloqueio de infraestrutura legítima.

### 5.2 Impacto SEC-04

O validator classifica `UFW_DRIFT` como `WARNING`, não como critical:

- sozinho, não torna `configurationValidation.passed` falso;
- sozinho, produziria score agregado de aproximadamente 0.95;
- portanto, não mantém o teste 05 abaixo de 0.85.

O snapshot UFW congelado não deve ser atualizado automaticamente, pois regras
dinâmicas exigem validação do owner. Para o gate atual, o UFW é observação
aceitável e não blocker.

## 6. Validação das Baselines

| Baseline | Preservada? | Resultado |
|---|---|---|
| Platform Baseline | **SIM** | Nenhum código, runtime, contrato ou arquitetura foi alterado nesta atividade. |
| Security Baseline | **SIM arquiteturalmente / NÃO conforme no ambiente** | Mecanismos preservados; Nginx e Blueprint não coincidem com os hashes consumidos pela SEC-04. |
| ARC/NAV/EOX | **SIM** | Nenhum artefacto de apresentação ou navegação foi alterado. |
| DOMAIN-GOV-001 | **SIM** | Nenhum domínio, capability ou backlog foi criado. |
| Finance Chain | **SIM** | Nenhum componente ou contrato Finance foi tocado. |
| Safety Baseline | **SIM** | Nenhum componente Safety foi tocado. |

Resposta binária do gate para “Baselines preservadas?”: **NÃO**, apenas porque
a Security Baseline ainda não possui conformidade ambiental demonstrada.

## 7. Reexecução SEC-04

Comando read-only:

`node src/tests/securityRuntimeIntegrity/SEC_04_RUNTIME_INTEGRITY_AUDIT.test.js`

| Métrica | Anterior | Atual | Diferença |
|---|---:|---:|---:|
| Testes aprovados | 19 | 19 | 0 |
| Testes reprovados | 1 | 1 | 0 |
| `integrityScore` | 0.763 | 0.763 | 0.000 |
| `hashValidation.passed` no teste 05 | `true` | `true` | sem alteração |

**SEC-04: 19/20.**

### Requisito específico ainda pendente

Teste 05:

`assert.ok(report.integrityScore >= 0.85)`

Resultado objetivo:

- esperado: `>= 0.85`;
- atual: `0.763`;
- causa exata: `NGINX_CONFIG_DRIFT` crítico e `BLUEPRINT_DRIFT` crítico;
- `UFW_DRIFT` é warning secundário;
- não há falha de implementação SEC-04.

Nenhuma alteração foi executada para elevar artificialmente o score.

## 8. Revalidação do hash de `server.js`

**O hash atual continua totalmente compatível com o MB-009? SIM.**

| Estado | SHA-256 |
|---|---|
| Pré-MB-009 reconstruído read-only | `ac9554268896c4f285f08e40d5e65ca06ec0e24d8b92a8a36edf066dfda45c5e` |
| Atual | `8087a73e118d5aea3fb8b80fe627b79a93be41628ce66f74a365d75efe8506a0` |

A reconstrução voltou a encontrar exatamente uma ocorrência do bloco MB-009.
Não existe alteração adicional ou não explicada.

**Hash aprovado tecnicamente: SIM.**

O reconhecimento do hash em manifesto certificado continua sendo ação
documental do owner da baseline, sem necessidade de alterar `server.js`.

## 9. Classificação do blocker

**O blocker decorre de: GOVERNANÇA.**

Não é código:

- 19 requisitos SEC-04 passam;
- o detector reporta corretamente os drifts;
- `hashValidation.passed` é verdadeiro no cenário do teste 05;
- não existe contrato, função ou validator ausente.

Não é uma correção de configuração imediatamente executável:

- o estado certificado exato não está materializado em ficheiros recuperáveis;
- existem três estados Nginx distintos;
- uma restauração aproximada poderia remover controles ou rotas;
- o Blueprint certificado existe apenas como digest.

A decisão de governança deve definir qual conteúdo é autoritativo antes de
qualquer sincronização ou restauração.

## 10. Critério para Liberação do P1

| Critério | Resultado |
|---|---|
| MB-001 a MB-009 concluídos | **SIM** |
| Baselines preservadas | **NÃO** — falta conformidade ambiental da Security Baseline |
| SEC-04 concluída | **NÃO** — 19/20 |
| Hash aprovado | **SIM** — tecnicamente explicado e revalidado |
| Nenhum blocker técnico | **SIM** |

## 11. Recomendação sobre liberação do P1

# P1 BLOQUEADO

### Requisito

SEC-04 teste 05 exige `integrityScore >= 0.85`.

### Evidência

Score `0.763`, com `NGINX_CONFIG_DRIFT` e `BLUEPRINT_DRIFT` críticos. O UFW é
warning aceitável.

### Ação necessária

O Architecture Board/owner da Security Baseline deve escolher formalmente uma
das alternativas:

1. **Aprovar os estados atuais:** certificar os conteúdos atuais de Nginx e
   Blueprint, definir qual ficheiro Nginx é autoritativo, validar a política
   UFW e autorizar sincronização da baseline.
2. **Rejeitar os estados atuais:** fornecer os artefactos byte-a-byte
   certificados `9b2c…e81e9` e `b783…c7f` e autorizar restauração operacional
   controlada.

Depois da decisão:

1. executar somente a ação autorizada;
2. confirmar `nginx -t` se houver ação Nginx;
3. reexecutar SEC-04;
4. exigir 20/20 e score `>= 0.85`;
5. reemitir a P0 Executive Review.

Não é necessário alterar código, arquitetura, APIs, contratos ou regras de
negócio. Não é necessário abrir novo MB.
