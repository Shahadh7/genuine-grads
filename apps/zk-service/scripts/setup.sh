#!/bin/bash

# Run trusted setup for the circuit (Phase 2)
# This generates the proving and verification keys

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$ROOT_DIR/build"
PTAU_DIR="$ROOT_DIR/ptau"
ARTIFACTS_DIR="$ROOT_DIR/artifacts"

R1CS_FILE="$BUILD_DIR/ach_member_v1.r1cs"
PTAU_FILE="$PTAU_DIR/powersOfTau28_hez_final_14.ptau"

echo "🔐 Running trusted setup..."

# Create artifacts directory
mkdir -p "$ARTIFACTS_DIR"

# Check if Powers of Tau file exists
if [ ! -f "$PTAU_FILE" ]; then
    echo "📥 Downloading Powers of Tau file (this is a one-time download)..."
    mkdir -p "$PTAU_DIR"
    # Using Hermez's ceremony file - trusted and widely used
    # 2^14 = 16384 constraints max (our circuit has ~250)
    curl -L -o "$PTAU_FILE" \
        "https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau"
    echo "✅ Powers of Tau downloaded"
fi

# Phase 2: Circuit-specific setup
echo ""
echo "🔄 Phase 2: Generating circuit-specific keys..."

# Generate initial zkey (Phase 2 ceremony)
npx snarkjs groth16 setup "$R1CS_FILE" "$PTAU_FILE" "$BUILD_DIR/ach_member_v1_0000.zkey"

# Contribute to the ceremony (adds randomness)
# In production, multiple parties should contribute
echo "Adding contribution to ceremony..."
echo "genuinegrads-zk-phase1-$(date +%s)" | npx snarkjs zkey contribute \
    "$BUILD_DIR/ach_member_v1_0000.zkey" \
    "$BUILD_DIR/ach_member_v1_0001.zkey" \
    --name="GenuineGrads Phase 1" \
    -v

# Apply random beacon (optional, adds more entropy)
# Using a publicly verifiable random value
BEACON="0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"
npx snarkjs zkey beacon \
    "$BUILD_DIR/ach_member_v1_0001.zkey" \
    "$BUILD_DIR/ach_member_v1_final.zkey" \
    "$BEACON" 10 \
    --name="Final Beacon"

# Verify the final zkey
echo ""
echo "🔍 Verifying final zkey..."
npx snarkjs zkey verify "$R1CS_FILE" "$PTAU_FILE" "$BUILD_DIR/ach_member_v1_final.zkey"

# Copy final zkey to artifacts
cp "$BUILD_DIR/ach_member_v1_final.zkey" "$ARTIFACTS_DIR/ach_member_v1.zkey"

# Copy WASM to artifacts
cp "$BUILD_DIR/ach_member_v1_js/ach_member_v1.wasm" "$ARTIFACTS_DIR/ach_member_v1.wasm"

echo ""
echo "✅ Trusted setup complete!"
echo ""
echo "Generated artifacts:"
echo "  - $ARTIFACTS_DIR/ach_member_v1.zkey (proving key)"
echo "  - $ARTIFACTS_DIR/ach_member_v1.wasm (witness generator)"

# Clean up intermediate files
rm -f "$BUILD_DIR/ach_member_v1_0000.zkey"
rm -f "$BUILD_DIR/ach_member_v1_0001.zkey"
rm -f "$BUILD_DIR/ach_member_v1_final.zkey"
