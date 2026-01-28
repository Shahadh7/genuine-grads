# ZK Service - Achievement Membership Circuit

Zero-Knowledge proof circuits and artifacts for GenuineGrads achievement verification.

## Overview

This service provides a Circom circuit (`ach_member_v1`) that enables students to prove they possess specific achievements without revealing their secret credentials. Employers can verify these proofs cryptographically without needing access to student secrets.

## Circuit: ach_member_v1

**Purpose**: Prove membership of an achievement for a specific credential.

**Commitment Formula**:
```
C = Poseidon(credential_hash, student_secret, salt, achievement_hash)
```

**Inputs**:
- Public: `commitment`, `credential_hash`, `achievement_hash`
- Private: `student_secret`, `salt`

**Constraint**: The circuit verifies that `Poseidon(credential_hash, student_secret, salt, achievement_hash) === commitment`

### Cryptographic Primitives

**Hash Function: Poseidon**
- Circom-optimized for zkSNARKs (~150 constraints for 4-input)
- 4-input permutation for commitment computation
- Field-friendly arithmetic over BN128 scalar field (254-bit)

**Proof System: Groth16**
- Constant-size proofs (~288 bytes / 3 elliptic curve points)
- Constant verification time (~5ms)
- Requires trusted setup (Powers of Tau + circuit-specific Phase 2)

**Elliptic Curve: BN128 (alt_bn128)**
- 254-bit prime order
- Ethereum precompile compatible
- Solana verification possible via custom program

## Prerequisites

1. **Install Circom** (v2.1.6+):
   ```bash
   # Using cargo (Rust required)
   git clone https://github.com/iden3/circom.git
   cd circom
   cargo build --release
   cargo install --path circom
   ```

2. **Install Node.js dependencies**:
   ```bash
   cd apps/zk-service
   npm install
   ```

## Building the Circuit

### Quick Build (All Steps)

```bash
npm run build
```

This runs compile → setup → export-vkey in sequence.

### Individual Steps

1. **Compile Circuit**:
   ```bash
   npm run compile
   ```
   Generates `.r1cs`, `.wasm`, and `.sym` files in `build/`.

2. **Trusted Setup**:
   ```bash
   npm run setup
   ```
   Downloads Powers of Tau (if needed), runs Phase 2 setup, and generates the zkey.

3. **Export Verification Key**:
   ```bash
   npm run export-vkey
   ```
   Exports the verification key for backend use.

## Artifacts

After building, you'll have these artifacts in `artifacts/`:

| File | Purpose | Size | Location |
|------|---------|------|----------|
| `ach_member_v1.wasm` | Witness generation | ~2MB | Frontend |
| `ach_member_v1.zkey` | Proving key | ~330KB | Frontend |
| `ach_member_v1_vkey.json` | Verification key | ~3KB | Backend |

## Deployment

### Frontend

Copy artifacts to the frontend public folder:

```bash
cp artifacts/ach_member_v1.wasm ../frontend/public/zk-artifacts/
cp artifacts/ach_member_v1.zkey ../frontend/public/zk-artifacts/
```

### Backend

Copy verification key to the backend:

```bash
# Create directory if it doesn't exist
mkdir -p ../backend/zk-artifacts/

# Copy verification key
cp artifacts/ach_member_v1_vkey.json ../backend/zk-artifacts/

# Verify the file was copied
ls -lh ../backend/zk-artifacts/ach_member_v1_vkey.json
```

**Important for Production**: Ensure `backend/zk-artifacts/ach_member_v1_vkey.json` is committed to git and present before Docker builds.

## Testing

```bash
npm test
```

Tests include:
- Valid proof generation and verification
- Invalid secret rejection
- Commitment binding verification
- Field element boundary tests

## Security Notes

- **Trusted Setup**: The zkey is generated using Hermez's Powers of Tau ceremony. For production, consider contributing to or running your own ceremony.
- **Deterministic Secrets**: Student secrets are derived from wallet signatures, not stored.
- **Proof Reusability**: Phase 1 proofs are reusable. Phase 2 will add challenge-response for freshness.

## File Structure

```
zk-service/
├── circuits/
│   └── ach_member_v1.circom    # Main circuit
├── scripts/
│   ├── compile.sh              # Compile circuit
│   ├── setup.sh                # Trusted setup
│   └── export-vkey.sh          # Export verification key
├── test/
│   └── ach_member_v1.test.js   # Circuit tests
├── artifacts/                   # Production artifacts (committed)
├── build/                       # Build output (gitignored)
├── ptau/                        # Powers of Tau (gitignored)
└── package.json
```

## License

MIT
