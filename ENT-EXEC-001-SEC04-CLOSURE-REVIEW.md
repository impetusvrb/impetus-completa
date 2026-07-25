# ENT-EXEC-001 — SEC-04 Closure Review

**Programa:** ENT-EXEC-001 — Enterprise Operational Consolidation  
**Origem:** ENT-AUD-002  
**Escopo:** SEC-04 e evidências MB-005 a MB-009  
**Data:** 21/07/2026  
**Natureza:** revisão classificatória, read-only, sem implementação  
**Classificação final:** `E — GOVERNANÇA`  
**Necessita implementação:** `NÃO`  
**Necessita novo MB:** `NÃO`

## 1. Objetivo da revisão

Caracterizar exatamente o requisito que mantém a auditoria
`SEC_04_RUNTIME_INTEGRITY_AUDIT.test.js` em 19/20, distinguir falha técnica de
pendência de conformidade e determinar se existe fundamento para trabalho
corretivo.

Foram revistos:

- `ENT-EXEC-001-P0-REPORT.md`;
- `ENT-EXEC-001-P0-EXECUTIVE-REVIEW.md`;
- evidências registadas nos MB-005 a MB-009;
- teste canónico `SEC_04_RUNTIME_INTEGRITY_AUDIT.test.js`;
- implementação read-only da SEC-04;
- documentação SEC-04;
- `SECURITY-BASELINE-01`;
- evidências SEC-21B e Operational Go-Live de reconciliação de baseline;
- hashes atuais, calculados sem modificar ficheiros.

Nenhum código, configuração, processo PM2, PostgreSQL, baseline ou documento
certificado foi alterado.

## 2. Requisito pendente identificado

### 2.1 Identificação exata

O único requisito não atendido é:

> **SEC-04, teste 05 — “baseline íntegra (hashes mock conformes)”**: dado um
> cenário com hashes críticos conformes, processos PM2 saudáveis, portas
> esperadas, `LISTEN_HOST=127.0.0.1`, `NODE_ENV=production` e Git HEAD de
> baseline, o relatório agregado deve apresentar
> `integrityScore >= 0.85` e `hashValidation.passed === true`.

Local da asserção não atendida:

`backend/src/tests/securityRuntimeIntegrity/SEC_04_RUNTIME_INTEGRITY_AUDIT.test.js`,
teste 05, condição `assert.ok(report.integrityScore >= 0.85)`.

### 2.2 Resultado observado

| Condição | Esperado | Observado | Resultado |
|---|---:|---:|---|
| `hashValidation.passed` | `true` | `true` | Atendida |
| `integrityScore` | `>= 0.85` | `0.763` | **Não atendida** |
| `integrityStatus` | sem critical drift | `DEGRADED` | **Não atendida** |

Portanto, a SEC-04 permanece 19/20 porque **o score agregado do teste 05 é
0.763, abaixo do mínimo 0.85**. A validação de hashes críticos usada pelo
teste passa e não é a origem da falha.

### 2.3 Findings que reduzem o score

O teste 05 fornece mocks para hashes críticos, PM2, portas, ambiente e Git,
mas as validações de Nginx, UFW e dois spot checks do Blueprint continuam a
ler o estado real. A execução read-only produziu:

| Secção | Finding | Severidade | Evidência |
|---|---|---|---|
| Configuration | `NGINX_CONFIG_DRIFT` | Critical | `/etc/nginx/sites-available/impetus`: esperado `9b2c913f…e81e9`; atual `1c40c785…1107` |
| Configuration | `UFW_DRIFT` | Warning | Regras vivas diferem do snapshot congelado; o próprio validator assinala que a diferença pode ser intencional |
| Filesystem | `BLUEPRINT_DRIFT` | Critical | Volume 10: esperado `b7835207…c7f`; atual `e1cc4b14…b7cd` |

Com essas secções:

- Hash: `OK`;
- Runtime: `OK`;
- Network: `OK`;
- Configuration: `DEGRADED`;
- Filesystem: `COMPROMISED`;
- Score agregado: `0.763`.

Os dois findings críticos, Nginx e Blueprint, são os determinantes da queda
abaixo de 0.85. O warning UFW integra a observação, mas não explica
isoladamente o 19/20.

## 3. Evidências coletadas

### 3.1 A SEC-04 está implementada

Os outros 19 requisitos passaram, incluindo:

- API e feature flag;
- carregamento da SECURITY-BASELINE-01;
- deteção de hash alterado e ficheiro apagado;
- deteção de restart, porta, configuração, Nginx e script PM2 alterados;
- score determinístico;
- DTO, dashboard, métricas e payload de auditoria;
- endpoint administrativo;
- preservação SEC-03;
- comportamento com flag desligada;
- documentação obrigatória.

O relatório histórico SEC-04 também regista implementação original em 20/20.
A falha atual demonstra que o detector identifica divergências; não demonstra
ausência do detector.

### 3.2 O estado atual diverge da baseline usada pela SEC-04

- Nginx congelado no manifest:
  `9b2c913fcc461df6fd80817753202d2c1d818d63ab5f450194c4eedd458e81e9`.
- Nginx atual, igual no ficheiro vivo e no artefacto canónico do repositório:
  `1c40c785a498b7237d46d893ad8b8131b93658e022063303258c166876a11107`.
- Blueprint Volume 10 congelado:
  `b7835207335c899b9ab951fdf27239908422275b6e5a94883d28d71b13c41c7f`.
- Blueprint Volume 10 atual:
  `e1cc4b14f087cd38c9c101343959220c20443abab222c875bf6f6b48298db7cd`.

### 3.3 Há precedente de evolução certificada

As evidências SEC-21B classificaram divergências anteriores de Nginx e
Blueprint como mudanças esperadas/certificadas:

- Nginx: `EXPECTED_SECURITY_CHANGE` ou `EXPECTED_OPERATIONAL_CHANGE`;
- Blueprint Volume 10: `CERTIFIED_EVOLUTION`;
- decisão: `BASELINE_SYNCHRONIZATION_APPROVED`;
- `rejectedChanges: []`;
- `pendingChanges: []`.

Essas evidências não aprovam automaticamente os hashes atuais, que são
posteriores/diferentes dos valores então reconciliados. Elas demonstram,
contudo, que a natureza correta da pendência é uma decisão de conformidade:
aprovar a evolução atual e sincronizar a referência, ou rejeitá-la e
determinar restauração operacional. A SEC-04 não deve tomar essa decisão nem
executar auto-remediação.

### 3.4 Relação com MB-005 a MB-009

- MB-005 já registou `NGINX_CONFIG_DRIFT`, `BLUEPRINT_DRIFT` e `UFW_DRIFT`.
- MB-006 preservou o ecosystem de entrada e não alterou Nginx, UFW ou
  Blueprint.
- MB-007 não alterou runtime vivo nem baseline.
- MB-008 não alterou Nginx, UFW, Blueprint ou SEC-04.
- MB-009 alterou observabilidade SEC-05 e o bloco de falha correspondente em
  `server.js`; não alterou os três findings que reduzem o score do teste 05.

## 4. Classificação obrigatória

# E — GOVERNANÇA

O requisito está implementado e o detector funciona. O estado observado
diverge da referência congelada, mas a SEC-04 é, por arquitetura,
observacional e não pode decidir se a evolução atual deve permanecer, ser
revertida ou ser incorporada à baseline.

Falta uma decisão formal sobre os estados atuais de:

1. Nginx `1c40c785…1107`;
2. Blueprint Volume 10 `e1cc4b14…b7cd`;
3. divergência UFW, como finding secundário.

Essa decisão pertence ao Architecture Board/owner da Security Baseline. Se os
estados forem aprovados, segue-se sincronização certificada da referência. Se
forem rejeitados, a governança deve autorizar uma restauração operacional. Em
nenhum dos casos existe evidência que justifique alteração do código SEC-04.

## 5. Análise do hash de `server.js`

### 5.1 Resultado

**A alteração observada é: TOTALMENTE EXPLICADA PELO MB-009.**

> O hash alterado decorre exclusivamente das mudanças aprovadas no MB-009.

| Estado | SHA-256 |
|---|---|
| Imediatamente anterior ao MB-009, reconstruído read-only | `ac9554268896c4f285f08e40d5e65ca06ec0e24d8b92a8a36edf066dfda45c5e` |
| Atual | `8087a73e118d5aea3fb8b80fe627b79a93be41628ce66f74a365d75efe8506a0` |

O estado anterior foi reconstruído em memória revertendo a única ocorrência
do bloco `SEC-05_BOOT_FAILURE` para o `console.warn('[SEC-05_BOOT]', ...)`
anterior. Nenhum ficheiro foi escrito.

### 5.2 Relação com o 19/20

O hash atual de `server.js` **não causa a falha SEC-04 19/20**:

- no teste 05, todos os hashes críticos são substituídos por valores conformes
  ao manifest;
- `hashValidation.passed` resulta `true`;
- a condição que falha é exclusivamente `integrityScore >= 0.85`;
- o score é reduzido pelos findings Nginx, Blueprint e UFW descritos acima.

O aceite formal do hash de `server.js` continua a ser uma decisão de
governança separada, já identificada na P0 Executive Review, mas não deve ser
apresentado como causa técnica do teste SEC-04 05.

## 6. Revisão individual de evidências técnicas

| Questão | Resposta | Fundamentação |
|---|---|---|
| Existe evidência de código incompleto? | **NÃO** | 19 requisitos passam e o requisito restante falha por estado divergente da baseline. |
| Existe requisito funcional ausente? | **NÃO** | Engine, validators, score, endpoint, DTO, métricas e documentação estão presentes. |
| Existe regressão? | **NÃO** | Há falha de conformidade ambiental/documental, não regressão funcional demonstrada. |
| Existe quebra de contrato? | **NÃO** | Nenhum contrato SEC-04 ou público foi quebrado pelas evidências analisadas. |
| Existe violação arquitetural? | **NÃO** | O comportamento read-only e sem auto-remediação está preservado. |

## 7. Necessidade de novo MB

# NÃO

A pendência não exige implementação corretiva. O mecanismo SEC-04 executa
exatamente sua função: compara estado atual com baseline congelada, reduz o
score e reporta os drifts.

A resolução cabe ao gate de governança já existente:

1. Architecture Board classifica os hashes atuais de Nginx e Blueprint e o
   estado UFW como aprovados ou rejeitados;
2. se aprovados, autoriza a sincronização certificada da baseline;
3. se rejeitados, autoriza restauração operacional em janela própria;
4. SEC-04 é reexecutada sem alteração de código;
5. a P0 Executive Review é reemitida com a nova evidência.

Não há fundamento para abrir novo MB, criar capability ou alterar arquitetura.

## 8. Impacto arquitetural

**Impacto arquitetural: NENHUM.**

Esta revisão não alterou o sistema. A ação recomendada é uma decisão de
conformidade sobre artefactos existentes. A SEC-04 permanece observacional,
determinística e sem auto-remediação.

## 9. Critério para desbloqueio do P1

**O bloqueio do P1 decorre de: GOVERNANÇA.**

Não decorre de implementação. A condição de desbloqueio é:

- decisão formal sobre os hashes atuais de Nginx, Blueprint Volume 10 e sobre
  a divergência UFW;
- execução da ação autorizada pela decisão, sem alteração preventiva;
- reexecução read-only da SEC-04;
- reemissão da P0 Executive Review.

O hash de `server.js` deve ser decidido no mesmo gate de governança, mas é uma
pendência paralela e não a causa do requisito SEC-04 que permanece em 19/20.

## 10. Recomendação Final

**Opção A**

Nenhuma implementação adicional é necessária.

O requisito pendente pertence exclusivamente à governança/operação.

Recomenda-se apenas executar a validação correspondente e reemitir a Executive
Review.

### Parecer de encerramento

| Pergunta obrigatória | Resposta |
|---|---|
| Qual requisito mantém a SEC-04 em 19/20? | Teste 05: `integrityScore >= 0.85`; observado `0.763` devido a `NGINX_CONFIG_DRIFT`, `BLUEPRINT_DRIFT` e `UFW_DRIFT` |
| Categoria | **E — GOVERNANÇA** |
| Exige implementação? | **NÃO** |
| Exige novo MB? | **NÃO** |
| Status do hash de `server.js` | Totalmente explicado pelo MB-009; não é a causa do 19/20; aceite formal continua pendente |
| Bloqueio P1 | **GOVERNANÇA, não técnico** |
