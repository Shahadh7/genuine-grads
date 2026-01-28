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

## Account States

### GlobalConfig
Program-wide configuration account (PDA seed: `["global-config", super_admin]`):
- `owner: Pubkey` - Super admin who governs program settings
- `frozen: bool` - Emergency freeze flag for all operations
- `bump: u8` - PDA bump seed

### University
University registration account (PDA seed: `["university", university_authority]`):
- `admin: Pubkey` - Super admin from GlobalConfig
- `authority: Pubkey` - University's operational signer
- `name: String` - University name (max 64 chars)
- `metadata_uri: String` - IPFS metadata URI (max 60 chars)
- `is_active: bool` - Activation status (must be approved to mint)
- `created_at: i64` - Creation timestamp
- `bump: u8` - PDA bump seed

### UniversityTree
Merkle tree configuration for cNFT storage (PDA seed: `["university_tree", merkle_tree]`):
- `admin: Pubkey` - Super admin
- `university: Pubkey` - Owning university
- `authority: Pubkey` - Operational authority
- `merkle_tree: Pubkey` - SPL Compression tree address
- `tree_config: Pubkey` - Bubblegum tree config PDA
- `max_depth: u32` - Tree depth (affects max certificates)
- `max_buffer_size: u32` - Buffer size for updates
- `is_public: bool` - Public tree flag
- `created_at: i64` - Creation timestamp
- `bump: u8` - PDA bump seed

### UniversityCollection
MPL Core collection for certificates (PDA seed: `["university_collection", university]`):
- `admin: Pubkey` - Super admin
- `university: Pubkey` - Owning university
- `authority: Pubkey` - Operational authority
- `collection: Pubkey` - MPL Core collection address
- `name: String` - Collection name (max 64 chars)
- `uri: String` - Collection metadata URI (max 60 chars)
- `created_at: i64` - Creation timestamp
- `bump: u8` - PDA bump seed

## Events

The program emits events for off-chain indexing and auditing:

| Event | Description |
|-------|-------------|
| `ConfigInitialized` | Emitted when global config is initialized |
| `UniversityRegistered` | Emitted when a university registers |
| `UniversityApproved` | Emitted when a university is approved |
| `UniversityDeactivated` | Emitted when a university is deactivated |
| `TreeCreatedV2` | Emitted when a Merkle tree is created |
| `CollectionCreatedV2` | Emitted when an MPL Core collection is created |
| `CertificateMintedV2` | Emitted when a certificate is minted |
| `CertificateBurnedV2` | Emitted when a certificate is burned/revoked |

## Error Codes

| Code | Description |
|------|-------------|
| `Unauthorized` | Caller lacks required permissions |
| `Frozen` | Program is frozen for maintenance |
| `InvalidName` | Name exceeds maximum length or is invalid |
| `AlreadyActive` | University is already active |
| `AlreadyInactive` | University is already inactive |
| `InvalidUri` | URI is invalid or too long |
| `UniversityInactive` | Cannot perform operation on inactive university |
| `InvalidProgramExecutable` | Invalid program executable |
| `InvalidTreeConfig` | Invalid tree config PDA |
| `CollectionMismatch` | Collection does not match university |
| `TreeMismatch` | Tree does not match university |
| `InvalidCoreCpiSigner` | Invalid CPI signer for MPL Core |
| `MissingRemainingAccounts` | Missing accounts for CPI |
| `MissingMerkleProof` | Missing Merkle proof accounts for burn |
| `InvalidBurnReason` | Invalid or missing reason for certificate burn |

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
