@echo off
chcp 65001 >nul
echo ========================================
echo   Impetus - Corrigir Git
echo ========================================
echo.

cd /d "%~dp0"

echo [1] Verificando pasta .git...
if not exist ".git" (
    echo Pasta .git nao encontrada. Inicializando...
    git init
    git branch -M main
)

echo.
echo [2] Adicionando arquivos...
git add .

echo.
echo [3] Verificando se ha algo para commitar...
git status

echo.
echo [4] Fazendo commit...
git commit -m "Impetus Comunica IA - atualizacao" 2>nul
if errorlevel 1 (
    echo.
    echo AVISO: Nenhum arquivo novo para commitar, ou commit ja foi feito.
    echo Execute "git status" para ver o estado.
) else (
    echo.
    echo SUCESSO! Commit realizado.
)

echo.
echo Concluido. Pressione qualquer tecla para sair.
pause >nul
