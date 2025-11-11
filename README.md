# GenuineGrads - Blockchain-Based Certificate Verification

A secure, decentralized platform for issuing and verifying academic certificates using Solana blockchain technology with compressed NFTs.

## 🎯 Overview

GenuineGrads enables universities to issue tamper-proof digital certificates as compressed NFTs on the Solana blockchain. Students receive verifiable credentials in their Solana wallets that can be instantly verified by employers and institutions worldwide.

### Key Features

- 🔐 **Secure**: No private keys stored; wallet-based transaction signing
- 💰 **Cost-Effective**: Compressed NFTs via Bubblegum (~$0.0001 per certificate)
- ⚡ **Fast**: Solana's high throughput for instant verification
- 🎨 **Customizable**: Built-in certificate designer
- 📱 **Accessible**: QR code verification
- 🌍 **Decentralized**: IPFS metadata storage

## 🏗️ Architecture

```
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Frontend    │───▶│   Backend     │───▶│    Solana     │
│   (Next.js)   │    │  (GraphQL)    │    │    Program    │
│               │    │               │    │               │
│ • Wallet      │    │ • TX Prep     │    │ • cNFTs       │
│ • Signing     │    │ • IPFS        │    │ • Bubblegum   │
│ • UI/UX       │    │ • Database    │    │ • MPL Core    │
└───────────────┘    └───────────────┘    └───────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Yarn & npm
- Solana wallet (Phantom/Solflare)

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/genuinegrads.git
cd genuinegrads

# Run automated setup
./SETUP.sh

# Or manual setup:
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

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [QUICKSTART.md](./QUICKSTART.md) | 5-minute quick start guide |
| [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) | Complete integration documentation |
| [INTEGRATION_SUMMARY.md](./INTEGRATION_SUMMARY.md) | What was built and how it works |
| [API_EXAMPLES.md](./apps/backend/docs/API_EXAMPLES.md) | GraphQL API examples |
| [DEPLOYMENT.md](./apps/backend/docs/DEPLOYMENT.md) | Production deployment guide |

## 🎓 Usage

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

## 🔐 Security

- **No Private Keys Stored**: All signing done in browser via wallet
- **Wallet-Based Auth**: Users control their own keys
- **Transaction Verification**: All operations verified on-chain
- **Tamper-Proof**: Immutable blockchain records
- **Privacy**: Optional ZKP for selective disclosure

## 🌐 Solana Program

- **Program ID**: `J66NdjPnpQWkm3Pj3AihkU4XFjLaV9RF5vz2RUEwKSZF`
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

## 💻 Tech Stack

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

## 📊 Performance

### Transaction Costs (Mainnet estimates)
- Initialize: ~0.001 SOL
- Register University: ~0.002 SOL
- Create Tree (14-depth): ~0.15 SOL
- Create Collection: ~0.005 SOL
- **Mint Certificate: ~0.0001 SOL** 💰

### Capacity
- Small tree (depth 14): 16,384 certificates
- Large tree (depth 20): 1,048,576 certificates
- Unlimited trees per university

## 🧪 Testing

```bash
# Backend tests
cd apps/backend
yarn test

# Frontend tests
cd apps/frontend
npm test

# E2E testing
1. Start both servers
2. Login as super admin
3. Register & approve university
4. Create tree & collection
5. Mint test certificate
6. Verify on Solana Explorer
```

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see [LICENSE](./LICENSE) file.

## 🙏 Acknowledgments

- Solana Foundation
- Metaplex Foundation
- Helius Labs
- Anchor Framework Team

## 📧 Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@genuinegrads.com
- **Discord**: [Join our community](#)

## 🗺️ Roadmap

### MVP (Current) ✅
- [x] University registration
- [x] Certificate issuance
- [x] Compressed NFTs
- [x] Wallet integration
- [x] IPFS metadata
- [x] Certificate designer

### Phase 2 (Q2 2025)
- [ ] Student portal
- [ ] Mobile app
- [ ] Batch minting optimization
- [ ] Advanced templates
- [ ] Analytics dashboard

### Phase 3 (Q3 2025)
- [ ] ZKP integration
- [ ] Multi-chain support
- [ ] API marketplace
- [ ] White-label solution
- [ ] Enterprise features

## 🎯 Use Cases

- **Universities**: Issue tamper-proof degrees and certificates
- **Employers**: Instantly verify candidate credentials
- **Students**: Own and control their educational records
- **Training Providers**: Issue course completion certificates
- **Professional Bodies**: Issue membership credentials

## 🌟 Benefits

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

**Built with ❤️ for the future of education**

*Empowering genuine achievements, one certificate at a time.*

