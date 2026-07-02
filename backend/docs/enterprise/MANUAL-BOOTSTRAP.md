# Manual de Bootstrap — IMPETUS Enterprise

## Quando usar

- Instalação nova com base de dados **vazia** (zero empresas)
- Após `run-all-migrations.js`

## Variáveis

```env
ENTERPRISE_BOOTSTRAP_COMPANY_NAME=Minha Fábrica
ENTERPRISE_BOOTSTRAP_ADMIN_NAME=Administrador
ENTERPRISE_BOOTSTRAP_ADMIN_EMAIL=admin@fabrica.local
ENTERPRISE_BOOTSTRAP_ADMIN_PASSWORD=SenhaForte1
ENTERPRISE_BOOTSTRAP_PLAN_TYPE=enterprise
```

## Execução

```bash
npm run enterprise:bootstrap
# dry-run:
node scripts/enterprise/bootstrap-enterprise.js --dry-run
```

## O que é criado

1. Registo em `companies`
2. Utilizador `diretor` com permissões `*`
3. Departamento «Direção Geral»
4. Setor «Direção»
5. Cargo «Diretor Geral» (se schema permitir)
6. `tenant_admins` primary (se tabela existir)

## Segurança

- **Nunca** executa se já existir empresa activa
- **Nunca** executa se existirem utilizadores órfãos
