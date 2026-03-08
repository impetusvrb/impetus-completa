# Corrigir Git - Impetus Comunica IA

Execute estes comandos **no PowerShell ou CMD**, na pasta do projeto.

---

## Opção 1: Repositório novo (sem commits)

Se você vê "branch yet to be born":

```cmd
cd C:\Users\wellm\OneDrive\Desktop\impetus_complete

git add .
git commit -m "Initial commit: Impetus Comunica IA"
```

---

## Opção 2: Recomeçar do zero

Se nada funcionar, recrie o repositório:

```cmd
cd C:\Users\wellm\OneDrive\Desktop\impetus_complete

REM Remove a pasta .git (cuidado: perde histórico)
rmdir /s /q .git

REM Inicializa de novo
git init
git branch -M main
git add .
git commit -m "Initial commit: Impetus Comunica IA"
```

---

## Opção 3: Se o projeto está em Documents\GitHub

```cmd
cd C:\Users\wellm\OneDrive\Documentos\GitHub\impetus-completa\impetus_complete

git status
git add .
git commit -m "Initial commit"
```

---

## Conectar ao GitHub (depois do primeiro commit)

```cmd
git remote add origin https://github.com/SEU_USUARIO/impetus_complete.git
git push -u origin main
```

---

## Erros comuns

| Erro | Solução |
|------|---------|
| `pathspec 'scripts/' did not match` | Use `git add .` em vez de `git add scripts/` |
| `branch yet to be born` | Faça o primeiro commit |
| `nothing added to commit` | Verifique se os arquivos não estão no .gitignore (node_modules, .env, etc.) |
| `Permission denied` | Execute o terminal como Administrador ou verifique permissões da pasta OneDrive |
