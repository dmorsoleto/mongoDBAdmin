#!/bin/bash

# Build de release completo — gera binários para todas as plataformas macOS
# Saída: src-tauri/target/release/bundle/
#        + dist-release/{version}/ com arquivos renomeados prontos para o GitHub

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Lê a versão atual do tauri.conf.json
CURRENT_VERSION=$(grep '"version"' "$PROJECT_ROOT/src-tauri/tauri.conf.json" | head -1 | sed 's/.*"version": *"\(.*\)".*/\1/')

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║    MongoDB Admin - Build All Releases    ║"
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

# Atualiza os 3 arquivos de configuração
sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$PROJECT_ROOT/package.json"
echo "  ✅ package.json"

sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" "$PROJECT_ROOT/src-tauri/tauri.conf.json"
echo "  ✅ tauri.conf.json"

sed -i '' "s/^version = \"$CURRENT_VERSION\"/version = \"$NEW_VERSION\"/" "$PROJECT_ROOT/src-tauri/Cargo.toml"
echo "  ✅ Cargo.toml"

# Garante que os targets Rust estão instalados
echo ""
echo "  🔧 Verificando targets Rust..."
rustup target add aarch64-apple-darwin x86_64-apple-darwin 2>/dev/null | grep -v "^info:" || true

cd "$PROJECT_ROOT"

# Pasta de saída com os binários renomeados
DIST_DIR="$PROJECT_ROOT/dist-release/$NEW_VERSION"
mkdir -p "$DIST_DIR"

# ─────────────────────────────────────────────
# Build 1: Apple Silicon (aarch64)
# ─────────────────────────────────────────────
echo ""
echo "  🍎 Compilando para Apple Silicon (aarch64)..."
npx tauri build --target aarch64-apple-darwin

DMG_ARM=$(find src-tauri/target/aarch64-apple-darwin/release/bundle/dmg -name "*.dmg" | head -1)
if [ -n "$DMG_ARM" ]; then
  cp "$DMG_ARM" "$DIST_DIR/mongodb-admin_${NEW_VERSION}_macos_aarch64.dmg"
  echo "  ✅ mongodb-admin_${NEW_VERSION}_macos_aarch64.dmg"
fi

# ─────────────────────────────────────────────
# Build 2: Intel (x86_64)
# ─────────────────────────────────────────────
echo ""
echo "  💻 Compilando para Intel (x86_64)..."
npx tauri build --target x86_64-apple-darwin

DMG_INTEL=$(find src-tauri/target/x86_64-apple-darwin/release/bundle/dmg -name "*.dmg" | head -1)
if [ -n "$DMG_INTEL" ]; then
  cp "$DMG_INTEL" "$DIST_DIR/mongodb-admin_${NEW_VERSION}_macos_x86_64.dmg"
  echo "  ✅ mongodb-admin_${NEW_VERSION}_macos_x86_64.dmg"
fi

# ─────────────────────────────────────────────
# Build 3: Universal Binary (aarch64 + x86_64)
# ─────────────────────────────────────────────
echo ""
echo "  🌐 Compilando Universal Binary (aarch64 + x86_64)..."
npx tauri build --target universal-apple-darwin

DMG_UNIVERSAL=$(find src-tauri/target/universal-apple-darwin/release/bundle/dmg -name "*.dmg" | head -1)
if [ -n "$DMG_UNIVERSAL" ]; then
  cp "$DMG_UNIVERSAL" "$DIST_DIR/mongodb-admin_${NEW_VERSION}_macos_universal.dmg"
  echo "  ✅ mongodb-admin_${NEW_VERSION}_macos_universal.dmg"
fi

# ─────────────────────────────────────────────
# Resumo
# ─────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║              Build concluído!            ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Binários prontos para o GitHub em:"
echo "  📁 dist-release/$NEW_VERSION/"
echo ""
ls -lh "$DIST_DIR"
echo ""
echo "  ⚠️  Windows e Linux requerem build em máquina nativa ou CI."
echo ""
