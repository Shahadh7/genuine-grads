#!/bin/bash

# Compile the Circom circuit
# Requires circom to be installed: npm install -g circom

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CIRCUITS_DIR="$ROOT_DIR/circuits"
BUILD_DIR="$ROOT_DIR/build"

echo "🔧 Compiling ach_member_v1 circuit..."

# Create build directory if it doesn't exist
mkdir -p "$BUILD_DIR"

# Compile circuit
# --r1cs: Generate R1CS constraint system
# --wasm: Generate WASM for witness generation
# --sym: Generate symbol file for debugging
circom "$CIRCUITS_DIR/ach_member_v1.circom" \
    --r1cs \
    --wasm \
    --sym \
    -o "$BUILD_DIR" \
    -l "$ROOT_DIR/node_modules"

echo "✅ Circuit compiled successfully!"
echo ""
echo "Generated files:"
echo "  - $BUILD_DIR/ach_member_v1.r1cs"
echo "  - $BUILD_DIR/ach_member_v1.sym"
echo "  - $BUILD_DIR/ach_member_v1_js/ach_member_v1.wasm"
echo ""

# Show circuit info
echo "📊 Circuit info:"
npx snarkjs r1cs info "$BUILD_DIR/ach_member_v1.r1cs"
