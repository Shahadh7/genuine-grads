# GenuineGrads - Blockchain-Based Certificate Verification

A secure, decentralized platform for issuing and verifying academic certificates using Solana blockchain technology with compressed NFTs.

## Overview

GenuineGrads enables universities to issue tamper-proof digital certificates as compressed NFTs on the Solana blockchain. Students receive verifiable credentials in their Solana wallets that can be instantly verified by employers and institutions worldwide.

### Key Features

- **Secure**: No private keys stored; wallet-based transaction signing
- **Cost-Effective**: Compressed NFTs via Bubblegum (~$0.0001 per certificate)
- **Fast**: Solana's high throughput for instant verification
- **Customizable**: Built-in certificate designer
- **Accessible**: QR code verification
- **Decentralized**: IPFS metadata storage


## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Yarn & npm
- Solana wallet (Phantom/Solflare)

### Installation

```bash
# Clone repository
git clone https://github.com/shahadh7/genuine-grads.git
cd genuinegrads

# Packages installation
cd apps/backend && yarn install
cd apps/frontend && npm install
```

### Configuration

1. Copy environment files:
```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
```

2. Edit `.env` files with your credentials:
   - Helius RPC URL & API key
   - Pinata IPFS keys
   - PostgreSQL connection strings
   - JWT secrets

3. Setup databases:
```bash
cd apps/backend
yarn db:generate
yarn db:push:shared
yarn db:push:university
```

### Run Development Servers

```bash
# Terminal 1 - Backend
cd apps/backend
yarn dev

# Terminal 2 - Frontend
cd apps/frontend
npm run dev
```

Open http://localhost:3000


## Usage

### For Super Admins

1. Initialize global config (one-time)
2. Approve university registrations
3. Monitor platform activity

### For Universities

1. Register and connect Solana wallet
2. Wait for super admin approval
3. Setup:
   - Create Merkle tree for certificates
   - Create NFT collection
4. Operations:
   - Register students
   - Design certificates
   - Issue & mint certificates

### For Students

1. Receive certificate NFT in Solana wallet
2. Share verification link or QR code
3. Present immutable proof of achievement

### For Verifiers (Employers/Institutions)

1. Scan QR code or enter certificate number
2. View blockchain-verified credentials
3. Check revocation status

## Security

- **No Private Keys Stored**: All signing done in browser via wallet
- **Wallet-Based Auth**: Users control their own keys
- **Transaction Verification**: All operations verified on-chain
- **Tamper-Proof**: Immutable blockchain records
- **Privacy**: Optional ZKP for selective disclosure

## Solana Program

- **Program ID**: `CbGKtgvvAeJbMBpSJEMCuwJTwXCjzuHnSGoiSSMQ6WuS`
- **Network**: Devnet (MVP), Mainnet-ready
- **Technology**: 
  - Anchor framework
  - Bubblegum (compressed NFTs)
  - MPL Core (collections)

### Instructions

| Instruction | Purpose |
|-------------|---------|
| `initialize_config` | Setup super admin |
| `register_university` | Register university on-chain |
| `approve_university` | Approve university |
| `deactivate_university` | Deactivate university |
| `create_tree_v2` | Create Merkle tree |
| `create_core_collection_v2_cpi` | Create collection |
| `mint_certificate_v2` | Mint certificate NFT |

## Tech Stack

### Backend
- Node.js with TypeScript
- GraphQL (Apollo Server)
- Prisma ORM
- PostgreSQL
- Anchor SDK
- Helius API
- Pinata (IPFS)

### Frontend
- Next.js 15
- React 19
- Solana Wallet Adapter
- TailwindCSS
- Radix UI

### Blockchain
- Solana (Rust/Anchor)
- Bubblegum (Compressed NFTs)
- MPL Core (Collections)
- IPFS (Metadata)

## Testing

```bash
# Backend tests
cd apps/backend
yarn test

# Frontend tests
cd apps/frontend
npm test
```

## License

This project is released under an **Academic & Institutional License**.

Usage of this repository is governed by the terms defined in the
[`LICENSE.md`](./LICENSE.md) file.

© University of Moratuwa. All rights reserved.

## Roadmap

### MVP (Current) 
- [x] University registration
- [x] Super admin panel
- [x] Single and bulk student registration with course details.
- [x] Certificate issuance
- [x] Compressed NFTs
- [x] Wallet integration
- [x] IPFS metadata
- [x] Certificate designer
- [x] Certificate verification with certificate number/ leaf ID

### Phase 2 (Q2 2025)
- [x] Student portal
- [x] Batch minting optimization
- [x] Admin analytics dashboard
- [x] Certificate verification with QR code
- [x] Landing page enhancements
- [x] Certificate designer integratation with issuance flow
- [x] Student verification logs, and Certifictes listing and sharing
- [x] TOTP with Authenticator app for superadmin, and uni admins
- [x] Certificate revocation
- [x] Student Dashboard
- [ ] ZKP integration for verify claims
- [ ] Advanced templates
- [ ] Final report

### Phase 3 (Future enchancements)
- [ ] Multi-chain support
- [ ] Multi-sig support
- [ ] Mobile app
- [ ] Multi roles with permissions
- [ ] Mobile app
- [ ] Bulk certificates issuance with bubblegum-batch-sdk
- [ ] Advanced superadmin portal

## Use Cases

- **Universities**: Issue tamper-proof degrees and certificates
- **Employers**: Instantly verify candidate credentials
- **Students**: Own and control their educational records
- **Training Providers**: Issue course completion certificates
- **Professional Bodies**: Issue membership credentials

## Benefits

### For Universities
- Reduce administrative overhead
- Prevent certificate fraud
- Modern, tech-forward image
- Cost-effective at scale

### For Students
- Portable digital credentials
- Instant verification
- Lifetime access
- Privacy control

### For Employers
- Instant verification
- Fraud prevention
- Reduced hiring risk
- Streamlined onboarding

---

## Intellectual Property Rights (IPR)

This project was developed as a **Final Year Undergraduate Project** at the  
**University of Moratuwa, Sri Lanka**.

All intellectual property rights related to this project, including but not limited to
source code, system design, documentation, research outcomes, and derived artifacts,
are governed by the **University of Moratuwa Intellectual Property Policy**.

According to the policy:
- Intellectual Property created using University resources or under University supervision
  is owned by the **University of Moratuwa**, unless otherwise stated.
- The author(s) retain recognition as the creator(s) of the work.
- Commercial use, redistribution, or licensing of this project **requires formal approval**
  from the University of Moratuwa.

This repository is made available **strictly for academic, evaluation, and demonstration purposes**.

Official Policy Reference:  
**University of Moratuwa – Intellectual Property Policy (Approved 06.01.2010)**



**Built with ❤️ for the future of education**

*Empowering genuine achievements, one certificate at a time.*

