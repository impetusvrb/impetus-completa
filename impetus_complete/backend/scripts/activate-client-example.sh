#!/bin/bash
# ============================================================================
# EXEMPLO: Ativar cliente comercialmente
# ============================================================================
# Uso:
# 1. Faça login como internal_admin e obtenha o token:
#    TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
#      -H "Content-Type: application/json" \
#      -d '{"email":"comercial@impetus.local","password":"Impetus@Comercial2025!"}' \
#      | jq -r '.token')
#
# 2. Execute este script com os dados do cliente:
#    ./scripts/activate-client-example.sh "Empresa XYZ" "12345678000199" "João Silva" "joao@empresaxyz.com.br" "essencial"
# ============================================================================

API_URL="${API_URL:-http://localhost:4000/api}"
TOKEN="${IMPETUS_INTERNAL_TOKEN}"

if [ -z "$TOKEN" ]; then
  echo "Erro: defina IMPETUS_INTERNAL_TOKEN (token do internal_admin)"
  echo "Ex: export IMPETUS_INTERNAL_TOKEN=\$(curl -s -X POST $API_URL/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"comercial@impetus.local\",\"password\":\"Impetus@Comercial2025!\"}' | jq -r '.token')"
  exit 1
fi

COMPANY_NAME="${1:-Empresa Demo}"
CNPJ="${2:-}"
CONTACT_NAME="${3:-Contato Principal}"
CONTACT_EMAIL="${4:-contato@empresa.com}"
PLAN="${5:-essencial}"

curl -s -X POST "$API_URL/internal/sales/activate-client" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"company_name\": \"$COMPANY_NAME\",
    \"cnpj\": \"$CNPJ\",
    \"contact_name\": \"$CONTACT_NAME\",
    \"contact_email\": \"$CONTACT_EMAIL\",
    \"plan_type\": \"$PLAN\"
  }" | jq .
