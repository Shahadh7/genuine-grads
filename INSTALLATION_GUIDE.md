# GenuineGrads Installation Guide

Complete setup instructions for deploying the GenuineGrads academic certificate verification platform.

## Table of Contents

1. [System Requirements](#1-system-requirements)
2. [Prerequisites Installation](#2-prerequisites-installation)
3. [Project Setup](#3-project-setup)
4. [Backend Configuration](#4-backend-configuration)
5. [Frontend Configuration](#5-frontend-configuration)
6. [Solana Program Deployment](#6-solana-program-deployment)
7. [ZK Service Setup](#7-zk-service-setup)
8. [Running the Application](#8-running-the-application)
9. [Production Deployment](#9-production-deployment)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. System Requirements

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16+ GB |
| Storage | 20 GB SSD | 50+ GB SSD |
| Network | Stable broadband | Low latency connection |

### Operating System

- **Linux**: Ubuntu 20.04+ (recommended)
- **macOS**: 12+ (Monterey or later)
- **Windows**: 10/11 with WSL2

---

## 2. Prerequisites Installation

### 2.1 Node.js (v18+)

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**macOS:**
```bash
brew install node@18
```

**Verify installation:**
```bash
node --version  # Should be v18.x.x or higher
npm --version
```

### 2.2 Yarn Package Manager

```bash
npm install -g yarn
yarn --version
```

### 2.3 PostgreSQL (v14+)

**Ubuntu:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Create databases:**
```bash
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE genuinegrads_shared;
CREATE DATABASE genuinegrads_uni_template;
\q
```

### 2.4 Rust & Cargo

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
rustc --version
```

### 2.5 Solana CLI (v1.18+)

```bash
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
```

Add to your shell profile:
```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

Verify:
```bash
solana --version
```

### 2.6 Anchor CLI (v0.31.1)

```bash
cargo install --git https://github.com/coral-xyz/anchor --tag v0.31.1 anchor-cli
anchor --version
```

### 2.7 Circom (v2.1.6+) - For ZK Development

```bash
git clone https://github.com/iden3/circom.git
cd circom
cargo build --release
cargo install --path circom
circom --version
```

---

## 3. Project Setup

### 3.1 Clone Repository

```bash
git clone https://github.com/shahadh7/genuine-grads.git
cd genuinegrads
```

### 3.2 Project Structure Overview

```
genuinegrads/
├── apps/
│   ├── backend/         # GraphQL API server (Node.js + Apollo)
│   ├── frontend/        # Next.js web application
│   ├── program/         # Solana smart contract(Solana program)
│   │   └── genuinegrads/
│   └── zk-service/      # Zero-knowledge proof circuits
├── USER_GUIDE.md        # User documentation
├── INSTALLATION_GUIDE.md # This file
└── README.md            # Project overview
```

---

## 4. Backend Configuration

### 4.1 Install Dependencies

```bash
cd apps/backend
yarn install
```

### 4.2 Environment Configuration

**Create `.env` file:**
```bash
cp .env.example .env
```

**Configure environment variables:**
```env
# ============================================
# SERVER CONFIGURATION
# ============================================
PORT=4000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# ============================================
# DATABASE CONFIGURATION
# ============================================
# Shared database (universities, admins, global index)
DATABASE_URL="postgresql://postgres:password@localhost:5432/genuinegrads_shared"

# University database template
UNIVERSITY_DATABASE_URL="postgresql://postgres:password@localhost:5432/genuinegrads_uni_template"

# ============================================
# JWT AUTHENTICATION
# ============================================
JWT_SECRET=<generate-64-char-hex>
JWT_REFRESH_SECRET=<generate-64-char-hex>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ============================================
# ENCRYPTION
# ============================================
MASTER_ENCRYPTION_KEY=<generate-64-char-hex>

# ============================================
# SOLANA CONFIGURATION (devnet)
# ============================================
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PROGRAM_ID=your-program-id
SOLANA_SUPER_ADMIN_PUBKEY=<your-super-admin-wallet-pubkey>

# Helius API
HELIUS_API_KEY=<your-helius-api-key>

# ============================================
# IPFS / PINATA
# ============================================
PINATA_JWT=<your-pinata-jwt>
PINATA_GATEWAY=your-pinata-gate-way

# ============================================
# SUPER ADMIN (First-time setup)
# ============================================
SUPER_ADMIN_EMAIL=admin@genuinegrads.com
SUPER_ADMIN_PASSWORD=<strong-password>
```

**Generate secrets:**
```bash
# Generate 64-character hex strings for secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('MASTER_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 4.3 Database Setup

```bash
# Generate Prisma clients
yarn db:generate

# Push schema to shared database
yarn db:push:shared

# Push schema to university template database
yarn db:push:university

# Optional: Seed with initial data
yarn db:seed
```

### 4.4 Copy ZK Verification Key

```bash
mkdir -p zk-artifacts
cp ../zk-service/artifacts/ach_member_v1_vkey.json zk-artifacts/
```

---

## 5. Frontend Configuration

### 5.1 Install Dependencies

```bash
cd apps/frontend
npm install
```

### 5.2 Environment Configuration

**Create `.env.local` file:**
```bash
cp .env.example .env.local
```

**Configure environment variables:**
```env
# Backend GraphQL URL
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000

# Solana Network
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Program ID
NEXT_PUBLIC_PROGRAM_ID=your-program-id

# Helius API Key 
NEXT_PUBLIC_HELIUS_API_KEY=<your-helius-api-key>
```

### 5.3 Copy ZK Artifacts

```bash
mkdir -p public/zk-artifacts
cp ../zk-service/artifacts/ach_member_v1.wasm public/zk-artifacts/
cp ../zk-service/artifacts/ach_member_v1.zkey public/zk-artifacts/
```

---

## 6. Solana Program Deployment

### 6.1 Configure Solana CLI

```bash
# Set to devnet
solana config set --url devnet

# Create or use existing wallet
solana-keygen new --outfile ~/.config/solana/id.json
# OR use existing:
solana config set --keypair ~/.config/solana/id.json

# Check wallet address
solana address

# Check balance
solana balance

# Get devnet SOL if needed
solana airdrop 2
```

### 6.2 Build Program

```bash
cd apps/program/genuinegrads
yarn install
anchor build
```

### 6.3 Deploy to Devnet

```bash
# Deploy the program
anchor deploy

# Note the deployed Program ID and update:
# - apps/frontend/.env.local (NEXT_PUBLIC_PROGRAM_ID)
# - apps/backend/.env (SOLANA_PROGRAM_ID)
# - apps/program/genuinegrads/Anchor.toml (if different)
# - apps/program/genuinegrads/programs/genuinegrads/src/lib.rs
```

### 6.4 Initialize Global Config (One-Time)

After deployment, initialize the program with your super admin wallet. This is typically done through the custom script init-config.ts (genuinegrads/apps/program/genuinegrads/scripts/init-config.ts).

---

## 7. ZK Service Setup

### 7.1 Install Dependencies

```bash
cd apps/zk-service
npm install
```

### 7.2 Build Circuits (Optional)

Pre-built artifacts are included. If you need to rebuild:

```bash
# Full build (compile + setup + export)
npm run build

# Or individual steps:
npm run compile    # Compile Circom circuit
npm run setup      # Run trusted setup
npm run export-vkey # Export verification key
```

### 7.3 Verify Artifacts

```bash
ls -lh artifacts/
# Should show:
# - ach_member_v1.wasm (~2MB)
# - ach_member_v1.zkey (~330KB)
# - ach_member_v1_vkey.json (~3KB)
```

### 7.4 Run Tests

```bash
npm test
```

---

## 8. Running the Application

### 8.1 Development Mode

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd apps/backend
yarn dev
```
Backend runs at: `http://localhost:4000/graphql`

**Terminal 2 - Frontend:**
```bash
cd apps/frontend
npm run dev
```
Frontend runs at: `http://localhost:3000`

### 8.2 Accessing the Application

1. Open `http://localhost:3000`
2. Login as super admin with configured credentials
3. Initialize global config on Solana (first-time only)
4. Register and approve a test university
5. Create wallet and connect as university admin
6. Set up Merkle tree and collection
7. Add students and issue certificates

### 8.3 GraphQL Playground

Access the GraphQL playground for API exploration:
```
http://localhost:4000/graphql
```

---

## 9. Production Deployment

### 9.1 Backend Production Build

```bash
cd apps/backend
yarn build
NODE_ENV=production yarn start
```

### 9.2 Frontend Production Build

```bash
cd apps/frontend
npm run build
npm start
```

### 9.3 Docker Deployment

**Backend Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --production
COPY . .
RUN yarn db:generate
RUN yarn build
EXPOSE 4000
CMD ["yarn", "start"]
```

**Frontend Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**Docker Compose (docker-compose.yml):**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./apps/backend
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/genuinegrads_shared
    depends_on:
      - postgres

  frontend:
    build: ./apps/frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_GRAPHQL_URL=http://backend:4000
    depends_on:
      - backend

volumes:
  postgres_data:
```

### 9.4 Production Environment Variables

**Critical settings for production:**

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Set to `production` |
| `JWT_SECRET` | Strong, unique 64-char hex (never commit!) |
| `JWT_REFRESH_SECRET` | Strong, unique 64-char hex (never commit!) |
| `MASTER_ENCRYPTION_KEY` | Strong, unique 64-char hex (never commit!) |
| `DATABASE_URL` | Production PostgreSQL with SSL |
| `SOLANA_NETWORK` | `mainnet-beta` for production |
| `SOLANA_RPC_URL` | Helius or other RPC provider |
| `HELIUS_API_KEY` | Production Helius API key |
| `CORS_ORIGIN` | Actual frontend domain |

### 9.5 Mainnet Deployment Checklist

- [ ] Update Solana network to `mainnet-beta`
- [ ] Fund deployment wallet with real SOL
- [ ] Deploy program to mainnet
- [ ] Update all Program IDs in environment files
- [ ] Configure production RPC endpoints
- [ ] Set up SSL/HTTPS
- [ ] Configure production database with backups
- [ ] Set up monitoring and alerting
- [ ] Conduct security audit
- [ ] Test thoroughly before launch

---

## 10. Troubleshooting

### 10.1 Common Issues

**"Cannot find module" errors:**
```bash
rm -rf node_modules
yarn install  # or npm install
```

**Prisma client not generated:**
```bash
yarn db:generate
```

**Database connection refused:**
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check DATABASE_URL format
- Ensure database exists

**Anchor build fails:**
- Ensure Rust and Solana CLI are installed
- Check Anchor version: `anchor --version`
- Run in program directory: `apps/program/genuinegrads/`

**ZK artifact loading fails:**
- Verify files exist in `public/zk-artifacts/`
- Check file sizes (~2MB wasm, ~330KB zkey)
- Clear browser cache

**Transaction failures:**
- Check wallet has sufficient SOL
- Verify network matches (devnet vs mainnet)
- Check RPC endpoint is responding

### 10.2 Log Locations

| Component | Log Location |
|-----------|--------------|
| Backend (dev) | Console output |
| Backend (prod) | Configured log aggregator |
| Frontend | Browser console |
| Solana | `solana logs` command |
| PostgreSQL | `/var/log/postgresql/` |

### 10.3 Useful Commands

```bash
# Check Solana network status
solana cluster-version

# View transaction details
solana confirm <SIGNATURE> -v

# View account data
solana account <ADDRESS>

# View program logs
solana logs <PROGRAM_ID>

# Database access
yarn db:studio:shared    # Prisma Studio for shared DB
yarn db:studio:university # Prisma Studio for university DB
```

### 10.4 Getting Help

- **GitHub Issues**: [Repository Issues](https://github.com/shahadh7/genuine-grads/issues)
- **Documentation**: See component-specific README files
- **Solana Docs**: [docs.solana.com](https://docs.solana.com)
- **Anchor Docs**: [anchor-lang.com](https://www.anchor-lang.com)

---

## Quick Reference

### Port Reference

| Service | Port |
|---------|------|
| Backend GraphQL | 4000 |
| Frontend Next.js | 3000 |
| PostgreSQL | 5432 |
| Solana Localnet | 8899 |

### External Services

| Service | Purpose | Signup URL |
|---------|---------|------------|
| Helius | Solana RPC & APIs | [helius.dev](https://helius.dev) |
| Pinata | IPFS storage | [pinata.cloud](https://pinata.cloud) |

### Quick Start Commands

```bash
# Backend
cd apps/backend && yarn dev

# Frontend
cd apps/frontend && npm run dev

# Database reset
cd apps/backend && yarn db:push:shared && yarn db:push:university

# Build program
cd apps/program/genuinegrads && anchor build

# Deploy program
cd apps/program/genuinegrads && anchor deploy

# Run ZK tests
cd apps/zk-service && npm test
```

---

**Document Version**: 1.0
**Last Updated**: January 2025
**University of Moratuwa - Final Year Project**
