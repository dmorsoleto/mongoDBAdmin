#!/bin/bash

# Script para build do Tauri com atualização de versão
# Pergunta a versão, atualiza nos 3 arquivos e compila

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Lê a versão atual do tauri.conf.json
CURRENT_VERSION=$(grep '"version"' "$PROJECT_ROOT/src-tauri/tauri.conf.json" | head -1 | sed 's/.*"version": *"\(.*\)".*/\1/')

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║       MongoDB Admin - Build Release      ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Versão atual: $CURRENT_VERSION"
echo ""
read -p "  Qual a versão que está publicando? " NEW_VERSION

# Validação do formato semver (x.y.z)
if ! echo "$NEW_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo ""
  echo "  ❌ Versão inválida! Use o formato semver: x.y.z (ex: 1.0.0)"
  exit 1
fi

echo ""
echo "  📝 Atualizando versão para $NEW_VERSION..."

# 1. Atualiza package.json
sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$PROJECT_ROOT/package.json"
echo "  ✅ package.json atualizado"

# 2. Atualiza tauri.conf.json
sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$PROJECT_ROOT/src-tauri/tauri.conf.json"
echo "  ✅ tauri.conf.json atualizado"

# 3. Atualiza Cargo.toml
sed -i '' "s/^version = \"$CURRENT_VERSION\"/version = \"$NEW_VERSION\"/" "$PROJECT_ROOT/src-tauri/Cargo.toml"
echo "  ✅ Cargo.toml atualizado"

echo ""
echo "  🚀 Iniciando build da versão $NEW_VERSION..."
echo ""

# Executa o build do Tauri
cd "$PROJECT_ROOT"
npx tauri build
