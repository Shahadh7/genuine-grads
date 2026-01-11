# GenuineGrads Solana Program

A Solana smart contract built with Anchor Framework for managing academic credentials as compressed NFTs (cNFTs) on the Solana blockchain.

## Overview

This program enables universities to issue, manage, and revoke academic certificates as compressed NFTs. It integrates with Metaplex Bubblegum for cNFT operations and MPL Core for collection management.

## Features

- **University Registration** - On-chain registration and approval workflow
- **Certificate Minting** - Issue academic credentials as compressed NFTs
- **Certificate Revocation** - Burn certificates when needed
- **Merkle Tree Management** - Efficient cNFT storage with account compression
- **Collection Management** - MPL Core collection creation

## Program ID

```
5CBnkDYCPPu9tzNqdgYJkjQpsFgeiTkdR2R64TP9HQUZ
```

## Instructions

| Instruction | Description |
|-------------|-------------|
| `initialize_config` | Initialize program configuration |
| `register_university` | Register a new university |
| `approve_university` | Approve a pending university |
| `deactivate_university` | Deactivate an existing university |
| `create_tree_v2` | Create a Merkle tree for cNFTs |
| `create_core_collection_v2_cpi` | Create an MPL Core collection |
| `mint_certificate_v2` | Mint a certificate cNFT |
| `burn_certificate_v2` | Burn/revoke a certificate |

## Project Structure

```
apps/program/genuinegrads/
├── programs/genuinegrads/src/
│   ├── lib.rs              # Program entry point
│   ├── instructions/       # Instruction handlers
│   ├── states/             # Account state structures
│   ├── errors.rs           # Custom error types
│   ├── events.rs           # Event definitions
│   └── utils.rs            # Utility functions
├── tests/                  # TypeScript integration tests
├── Anchor.toml             # Anchor configuration
└── Cargo.toml              # Rust workspace config
```

## Dependencies

- **Anchor**: 0.31.1
- **Metaplex Bubblegum**: 2.1.1 (cNFT minting)
- **MPL Core**: 0.11.1 (collection management)
- **SPL Account Compression**: 1.0.0 (Merkle trees)

## Prerequisites

1. **Rust** (latest stable)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Solana CLI** (v1.18+)
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/v1.18.0/install)"
   ```

3. **Anchor CLI** (v0.31.1)
   ```bash
   cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.1 anchor-cli
   ```

4. **Node.js** and **Yarn**

## Setup

### 1. Install Dependencies

```bash
cd apps/program/genuinegrads
yarn install
```

### 2. Configure Wallet

Set up your Solana wallet:

```bash
# Create new wallet (if needed)
solana-keygen new --outfile ~/.config/solana/id.json

# Set config to devnet
solana config set --url devnet
```

### 3. Build Program

```bash
anchor build
```

### 4. Deploy to Devnet

```bash
# Get devnet SOL for deployment
solana airdrop 2

# Deploy
anchor deploy
```

## Testing

### Run Tests with Local Validator

```bash
anchor test
```

This starts a local validator with cloned programs from devnet:
- Metaplex Bubblegum
- SPL Account Compression
- SPL Noop
- MPL Core

### Run Against Devnet

```bash
anchor test --skip-local-validator
```

## Development

### Build Only

```bash
anchor build
```

### Generate IDL

```bash
anchor build -- --features idl-build
```

The IDL is output to `target/idl/genuinegrads.json`

### Upgrade Program

```bash
anchor upgrade target/deploy/genuinegrads.so --program-id 5CBnkDYCPPu9tzNqdgYJkjQpsFgeiTkdR2R64TP9HQUZ
```

## Networks

| Network | Cluster | RPC |
|---------|---------|-----|
| Localnet | localhost | http://localhost:8899 |
| Devnet | devnet | https://api.devnet.solana.com |
| Mainnet | mainnet-beta | https://api.mainnet-beta.solana.com |

## Security Considerations

- Program authority controls config initialization
- Only approved universities can mint certificates
- Certificate ownership is verified before burn operations
- Merkle tree proofs ensure data integrity

## License

MIT
