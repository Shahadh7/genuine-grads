# Environment Variables Setup

Create a `.env` file in the backend root directory with the following variables:

```env
# Node Environment
NODE_ENV=development
PORT=4000

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_REFRESH_SECRET=your-refresh-token-secret-minimum-32-characters
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Databases
SHARED_DATABASE_URL=postgresql://postgres:password@localhost:5432/genuinegrads_shared
UNIVERSITY_DATABASE_URL=postgresql://postgres:password@localhost:5432/genuinegrads_uni_template

# Solana & Helius
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
HELIUS_API_KEY=your-helius-api-key-here
HELIUS_WEBHOOK_SECRET=your-webhook-secret

# Master Encryption Key (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
MASTER_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# IPFS/Pinata
IPFS_API_URL=https://api.pinata.cloud
IPFS_API_KEY=your-pinata-api-key
IPFS_SECRET_KEY=your-pinata-secret-key
IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/

# Redis
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=http://localhost:3000

# Platform Super Admin
SUPER_ADMIN_EMAIL=admin@genuinegrads.com
SUPER_ADMIN_PASSWORD=ChangeMeInProduction123!

# ZKP Service (optional)
ZKP_GENERATOR_URL=http://localhost:8080
```

## Generate Secrets

```bash
# Generate JWT secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate master encryption key
node -e "console.log('MASTER_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

