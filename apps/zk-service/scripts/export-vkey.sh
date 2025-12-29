#!/bin/bash

# Export verification key from the zkey file

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ARTIFACTS_DIR="$ROOT_DIR/artifacts"

ZKEY_FILE="$ARTIFACTS_DIR/ach_member_v1.zkey"
VKEY_FILE="$ARTIFACTS_DIR/ach_member_v1_vkey.json"

echo "📤 Exporting verification key..."

if [ ! -f "$ZKEY_FILE" ]; then
    echo "❌ Error: zkey file not found at $ZKEY_FILE"
    echo "Please run 'npm run setup' first."
    exit 1
fi

# Export verification key
npx snarkjs zkey export verificationkey "$ZKEY_FILE" "$VKEY_FILE"

echo "✅ Verification key exported!"
echo "  - $VKEY_FILE"
echo ""

# Show verification key info
echo "📊 Verification key contents:"
cat "$VKEY_FILE" | head -20
echo "..."
