# ENT-GOV-001 — Certified Baseline Recovery Investigation

**Programa:** ENT-EXEC-001 — Enterprise Operational Consolidation  
**Atividade:** investigação forense de Chain of Custody  
**Data:** 21/07/2026  
**Modo:** estritamente read-only  
**Restauração executada:** nenhuma  
**Reconstrução executada:** nenhuma  
**Baseline alterada:** não

## 1. Executive Summary

A investigação produziu conclusões diferentes para os dois artefactos:

1. **Nginx — artefacto certificado encontrado e hash validado.** O conteúdo
   exato SHA-256 `9b2c913f…e81e9` existe no repositório Git local como blob
   `66241492…`, referenciado pelos commits `c3c20f7…` e `0f438784…`. Também
   está contido na tag local `IMPETUS-SEC-ANTI-RECON-BASELINE-001` e no
   tracking ref local `origin/main`. O artefacto não foi extraído nem aplicado.
2. **Blueprint Volume 10 — artefacto certificado não encontrado.** O hash
   `b7835207…c7f` aparece em manifests, mas nenhuma cópia autenticável do
   respetivo conteúdo foi localizada no Git alcançável, reflogs, objetos não
   alcançáveis, backups, configurações, arquivos compactados ou diretórios
   locais pesquisados.

A base Git foi investigada além de branches e tags: 88.263 blobs até 5 MiB,
totalizando 1.234.462.449 bytes, foram lidos diretamente da object database e
comparados ao hash Blueprint. A busca incluiu os objetos não alcançáveis
reportados pelo `git fsck`. Resultado: zero correspondências.

Os pacotes forenses externos documentados não estão presentes na VPS e a sua
transferência permanece oficialmente `PENDING` /
`EXTERNAL_ARCHIVE_VALIDATED=false`. Além disso, o pacote de certificações é
descrito como cópia de `backend/docs/evidence`, onde existe o digest, não o
conteúdo fonte do Volume 10.

**Conclusão geral:** a cadeia de custódia do Nginx está preservada. A cadeia
de custódia da Blueprint está interrompida. Como a baseline SEC-04 depende de
ambos, a baseline composta não é integralmente recuperável e requer
recertificação formal, salvo se uma fonte externa posteriormente autorizada
apresentar uma cópia com o hash exato `b783…c7f`.

## 2. Objetivo

Determinar se ainda existem cópias integrais e autenticáveis dos artefactos
que originaram:

| Artefacto | Hash certificado |
|---|---|
| Nginx `impetus-production.conf` | `9b2c913fcc461df6fd80817753202d2c1d818d63ab5f450194c4eedd458e81e9` |
| Blueprint `Volume-10-ROADMAP-ENTERPRISE.md` | `b7835207335c899b9ab951fdf27239908422275b6e5a94883d28d71b13c41c7f` |

Esta investigação não tentou produzir conteúdo equivalente, reconstruir
versões por diff, restaurar ficheiros ou atualizar manifests.

## 3. Metodologia

### 3.1 Git

- confirmação do worktree e do remote registado;
- inventário de branches locais, tracking refs, tags e stash;
- `git log --all --full-history --follow` para os dois paths;
- comparação SHA-256 do conteúdo de cada revisão alcançável;
- inventário de reflogs;
- `git fsck --full --no-reflogs --unreachable`, sem `--lost-found`;
- leitura da object database com `git cat-file --batch-all-objects`;
- cálculo SHA-256 em memória, sem checkout;
- inspeção de 88.263 blobs até 5 MiB, incluindo objetos não alcançáveis.

O limite de 5 MiB não exclui uma versão plausível do Blueprint: as versões
conhecidas possuem 4.506, 7.076 e 8.399 bytes.

### 3.2 Sistema de ficheiros

Foram pesquisados:

- workspace principal;
- `/etc/nginx`, incluindo `.bak`, `.old`, `.orig`, `.disabled`, `.save` e
  `.backup`;
- `/var/backups`;
- `/root`, `/home`, `/tmp`, `/opt`, `/srv`, `/mnt`, `/media` e `/var/lib`
  pelos nomes exatos dos artefactos;
- arquivos `.tar`, `.tar.gz`, `.tgz`, `.zip`, `.7z`, `.rar`, `.gz`, `.xz` e
  `.bz2`;
- cópias com nomes históricos e diretórios de exportação.

### 3.3 Build, CI/CD e deploy

- workflows locais foram pesquisados por upload/download de artefactos,
  releases, registries, archives e Docker push;
- Dockerfiles e Compose foram revistos;
- scripts e documentação de deploy/backup foram pesquisados;
- imagens Docker locais não puderam existir no runtime observado porque o
  comando `docker` não está instalado;
- nenhum artefacto empacotado local contendo os ficheiros foi encontrado.

### 3.4 Fontes externas

Foram registadas, mas não acessadas:

- remote Git `https://github.com/impetusvrb/impetus-completa.git`;
- notebook autorizado;
- pen drive `E:\IMPETUS_FORENSIC_ARCHIVE\`.

Nenhuma consulta de rede, download ou acesso externo foi realizado.

## 4. Fontes investigadas

| Fonte | Estado | Resultado |
|---|---|---|
| Branches Git locais | Disponível | Nginx encontrado; Blueprint certificado ausente |
| Tracking refs locais | Disponível | `origin/main` contém Nginx certificado |
| Tags Git | Disponível | tag anti-recon contém Nginx certificado |
| Stash | Disponível | incluído na varredura de objetos; Blueprint certificado ausente |
| Reflogs | Disponível | incluídos na investigação; Blueprint certificado ausente |
| Objetos Git não alcançáveis | Disponível | 70.924 blobs e 14 commits reportados; varredura por conteúdo sem match Blueprint |
| Integridade Git | Disponível | `git fsck` sem objetos missing/corrupt reportados |
| Backups Nginx locais | Disponível | quatro candidatos, todos divergentes |
| Backups Blueprint locais | Não localizados | nenhum ficheiro histórico com o nome |
| Archives em `/var/www` e `/root` | Não localizados | zero arquivos compactados presentes |
| Export staging forense | Ausente | pacotes documentados já não estão na VPS |
| Docker images | Indisponível | binário Docker ausente; nenhum inventário local acessível |
| CI artifacts/releases locais | Não localizados | workflows sem retenção local dos dois artefactos |
| Ansible/Puppet/Chef/Salt/Helm/Kubernetes | Não localizados no escopo | nenhuma fonte de custódia encontrada |
| Docker Compose | Disponível | referencia configuração Docker distinta; não preserva os hashes SEC-04 |
| Notebook/pen drive externos | Não acessados | transferência e validação documentadas como pendentes |
| GitHub remoto | Não acessado | proibido consultar sistema externo sem autorização |

## 5. Cadeia de Custódia

### 5.1 Nginx certificado

| Campo | Valor |
|---|---|
| Nome | `infra/nginx/impetus-production.conf` |
| Localização lógica primária | Git commit `c3c20f7e7ea6dc1421c014a81e3ebc28f5a09cd7` |
| Localização lógica secundária | Git commit `0f438784c60d7cb7349cf55a133379f2fb647303` |
| Blob Git | `66241492b1ed4046656a3e7939acb1fff1498fba` |
| Tamanho | 4.242 bytes |
| Data de origem | 04/07/2026 05:03:05 UTC |
| Autor | Wellington M.F |
| Origem | commit `feat(SEC-01–20 + ECO-04–08): enterprise security stack, baseline lock e billing phase3.` |
| Persistência posterior | commit `0f438784…`, tag `IMPETUS-SEC-ANTI-RECON-BASELINE-001`, local `origin/main` |
| SHA-256 | `9b2c913fcc461df6fd80817753202d2c1d818d63ab5f450194c4eedd458e81e9` |
| Compatível com hash certificado? | **SIM** |
| Evidência | `git show <commit>:infra/nginx/impetus-production.conf \| sha256sum` em ambos os commits |

O commit `c3c20f7…` possui como parent `daf338657…`. O commit `0f438784…`
possui como parent `c3c20f7…`, mantendo a mesma versão do artefacto. A cadeia
é contínua e verificável pelo object database local.

### 5.2 Blueprint certificado

| Campo | Valor |
|---|---|
| Nome | `backend/docs/IMPETUS_COGNITIVE_EXPERIENCE_BLUEPRINT/Volume-10-ROADMAP-ENTERPRISE.md` |
| Localização do conteúdo certificado | **Não localizada** |
| Data do digest certificado | sincronização de 04/07/2026 |
| Origem do digest | `security-baseline-01/blueprint-volumes.sha256` e `operational-go-live-01/hardening-baseline.sha256` |
| SHA-256 certificado | `b7835207335c899b9ab951fdf27239908422275b6e5a94883d28d71b13c41c7f` |
| Compatível com hash certificado? | **NÃO VALIDÁVEL — conteúdo ausente** |
| Evidência | zero matches em 88.263 blobs Git e zero cópias locais autenticáveis |

O digest prova que um conteúdo foi observado durante a sincronização, mas não
preserva o conteúdo nem estabelece uma localização recuperável. Não existe
commit, blob, backup ou archive local que permita recomputar o digest.

## 6. Artefactos localizados

### 6.1 Nginx

| Candidato | Data/origem | SHA-256 | Igual ao certificado? |
|---|---|---|---|
| Git `c3c20f7…:infra/nginx/impetus-production.conf` | 04/07/2026 | `9b2c913f…e81e9` | **SIM** |
| Git `0f438784…:infra/nginx/impetus-production.conf` | 14/07/2026 | `9b2c913f…e81e9` | **SIM** |
| Git blob `66241492…` | object database local | `9b2c913f…e81e9` | **SIM** |
| `/etc/nginx/sites-available/impetus` | atual | `1c40c785…1107` | Não |
| `/etc/nginx/sites-enabled/impetus` | atual | `9adf69c3…aaba` | Não |
| `infra/nginx/impetus-production.conf` working tree | atual | `1c40c785…1107` | Não |
| `impetus.bak.1783528457` | 08/07/2026 | `9dd861d3…1d70` | Não |
| `impetus.bak.1783140913` | 03/07/2026 | `c595ff37…29d` | Não |
| backups precertbot/21-06 | histórico | `26e8cb95…ca7` | Não |

**Conclusão Nginx:** caso 1 — artefacto certificado encontrado e hash
validado. Nenhuma restauração foi executada.

### 6.2 Blueprint

| Candidato | Data/origem | Tamanho | SHA-256 | Igual ao certificado? |
|---|---|---:|---|---|
| Git `daf338657…` | 02/07/2026 | 4.506 bytes | `30f2f18c…306` | Não |
| Git `c3c20f7…` e HEAD `0f438784…` | 04/07/2026 | 7.076 bytes | `8da2db9c…17d` | Não |
| Working tree atual | mtime 10/07/2026 | 8.399 bytes | `e1cc4b14…b7cd` | Não |
| Backups locais | — | — | nenhum | Não encontrado |
| Objetos Git até 5 MiB | todos os objetos locais | 1,234 GB lidos | zero match | Não encontrado |

**Conclusão Blueprint:** caso 3 — nenhuma cópia autenticável do artefacto
certificado foi encontrada.

## 7. Comparação de hashes

| Artefacto | Hash certificado | Cópia exata localizada? | Hash confirmado? |
|---|---|---|---|
| Nginx | `9b2c913fcc461df6fd80817753202d2c1d818d63ab5f450194c4eedd458e81e9` | Git blob `66241492…` | **SIM** |
| Blueprint | `b7835207335c899b9ab951fdf27239908422275b6e5a94883d28d71b13c41c7f` | Não | **NÃO** |

**Hash validado, resposta global: NÃO.** Apenas o Nginx foi validado.

## 8. Evidências

### 8.1 Evidência positiva Nginx

- um único conteúdo Git de 4.242 bytes produz o hash certificado;
- o blob está referenciado por dois commits;
- os commits formam cadeia parent/child;
- `main`, tracking local `origin/main` e tag anti-recon preservam a revisão;
- `git fsck` não reportou objeto missing ou corrupt.

### 8.2 Evidência negativa Blueprint

- 257 commits alcançáveis examinados;
- duas versões históricas únicas no path, ambas divergentes;
- todos os refs locais, tracking refs, tags, stash e reflogs inventariados;
- 14 commits e 70.924 blobs não alcançáveis reportados pelo `git fsck`;
- 88.263 blobs até 5 MiB lidos da object database;
- 1.234.462.449 bytes comparados ao SHA-256 certificado;
- zero matches para `b783…c7f`;
- nenhum backup local com o nome do Volume 10;
- nenhum archive local em `/var/www` ou `/root`;
- nenhuma cópia nos diretórios adicionais pesquisados;
- o conteúdo atual e as duas versões Git conhecidas não correspondem;
- os manifests contêm apenas o digest.

Declaração formal:

> **Não foi localizada nenhuma cópia autenticável do artefato certificado
> Blueprint SHA-256
> `b7835207335c899b9ab951fdf27239908422275b6e5a94883d28d71b13c41c7f`.**

### 8.3 Evidência externa não validada

Em 13/07/2026 foram documentados três pacotes para transferência a notebook e
pen drive. O estado documental permanece:

- `TRANSFER_PHASE = PREPARED`;
- `EXTERNAL_ARCHIVE_VALIDATED = FALSE`;
- `NOTEBOOK_VALIDATION = PENDING`;
- `PENDRIVE_VALIDATION = PENDING`.

Os pacotes já não estão no `export-staging` da VPS. A documentação descreve o
pacote de certificações como conteúdo de `backend/docs/evidence`, não como
cópia dos artefactos fonte Nginx/Blueprint. Nenhuma afirmação de que o Volume
10 certificado esteja no destino externo foi localizada.

Essa fonte não pode ser considerada custódia preservada sem apresentação do
arquivo externo, validação do pacote e hash do conteúdo interno. Não houve
acesso externo nesta investigação.

## 9. Conclusão

| Pergunta obrigatória | Resposta |
|---|---|
| Artefacto certificado Nginx | **ENCONTRADO** |
| Artefacto certificado Blueprint | **NÃO ENCONTRADO** |
| Hash validado | **NÃO**, globalmente; Nginx SIM, Blueprint NÃO |
| Cadeia de custódia preservada | **NÃO**, globalmente; Nginx SIM, Blueprint NÃO |
| Baseline recuperável | **NÃO**, como conjunto SEC-04 |
| Necessária recertificação | **SIM** |

### Respostas aos critérios de sucesso

- **O artefacto certificado do Nginx existe? SIM.**
- **Onde está armazenado?** Object database Git local, blob `66241492…`,
  alcançável pelos commits `c3c20f7…` e `0f438784…`.
- **O hash Nginx foi confirmado? SIM.**
- **O artefacto certificado da Blueprint existe? Não foi localizado em
  nenhuma fonte autenticável autorizada.**
- **Onde está armazenado?** Apenas o digest está nos manifests; o conteúdo
  não possui localização recuperável conhecida.
- **O hash Blueprint foi confirmado por conteúdo? NÃO.**
- **A cadeia de custódia permanece íntegra? NÃO**, por perda do conteúdo
  Blueprint.
- **A baseline pode ser restaurada integralmente? NÃO.**
- **Existe comprovação objetiva da perda? SIM**, dentro das fontes locais e
  refs autorizadas investigadas.

## 10. Recomendação

Recomenda-se iniciar um **processo formal de recertificação da Security
Baseline/SEC-04**, sem abrir automaticamente MB e sem reconstruir o Blueprint
perdido.

### Motivo

A baseline exige dois artefactos. Um está preservado; o outro existe apenas
como digest sem conteúdo autenticável. Um hash isolado não permite recuperar
ou provar o documento original.

### Impacto

- Nginx certificado permanece recuperável a partir do Git, quando houver
  autorização separada;
- Blueprint certificado não pode ser restaurado com integridade forense;
- SEC-04 não pode obter conformidade legítima pela baseline atual;
- qualquer conteúdo “equivalente” quebraria a cadeia de custódia.

### Processo recomendado

1. Architecture Board declara formalmente a perda da custódia do Blueprint.
2. Antes da recertificação, o operador autorizado pode verificar notebook e
   pen drive. Se surgir uma cópia com SHA-256 exato `b783…c7f`, esta conclusão
   deve ser reaberta apenas para validação da nova evidência.
3. Na ausência dessa cópia, selecionar e revisar o Blueprint atual como novo
   candidato, sem afirmar continuidade com o artefacto perdido.
4. Certificar conjuntamente Nginx, Blueprint, UFW e artefactos SEC-04,
   produzindo pacote imutável com:
   - conteúdo integral;
   - SHA-256;
   - commit/tag;
   - timestamp;
   - owner;
   - armazenamento primário e cópia independente validada.
5. Somente após a recertificação, reexecutar SEC-04 e reemitir o gate P0/P1.

Nenhuma recertificação, restauração, extração ou atualização de baseline foi
iniciada por esta investigação.
