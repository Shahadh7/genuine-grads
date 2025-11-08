# 🚀 GenuineGrads Backend - Quick Start Guide

This guide will get you up and running in 5 minutes.

## Step 1: Install Dependencies

```bash
cd apps/backend
yarn install
```

## Step 2: Setup PostgreSQL Databases

```bash
# Install PostgreSQL if you haven't
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql
# Windows: Download from postgresql.org

# Start PostgreSQL
# macOS: brew services start postgresql
# Ubuntu: sudo systemctl start postgresql

# Create databases
createdb genuinegrads_shared
createdb genuinegrads_uni_template
```

## Step 3: Configure Environment

Create `.env` file in `apps/backend/`:

```env
# Node
NODE_ENV=development
PORT=4000

# JWT (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=your_generated_secret_here
JWT_REFRESH_SECRET=your_generated_refresh_secret_here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Databases
SHARED_DATABASE_URL=postgresql://postgres:password@localhost:5432/genuinegrads_shared
UNIVERSITY_DATABASE_URL=postgresql://postgres:password@localhost:5432/genuinegrads_uni_template

# Solana (for development, use devnet)
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
HELIUS_API_KEY=your_helius_api_key

# Encryption (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
MASTER_ENCRYPTION_KEY=your_generated_encryption_key_here

# IPFS (sign up at pinata.cloud)
IPFS_API_URL=https://api.pinata.cloud
IPFS_API_KEY=your_pinata_api_key
IPFS_SECRET_KEY=your_pinata_secret
IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/

# Redis (optional, for background jobs)
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=http://localhost:3000

# Super Admin
SUPER_ADMIN_EMAIL=admin@genuinegrads.com
SUPER_ADMIN_PASSWORD=ChangeMe123!
```

### Generate Secrets

```bash
# JWT Secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# JWT Refresh Secret
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Master Encryption Key
node -e "console.log('MASTER_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

## Step 4: Setup Database Schema

```bash
# Generate Prisma clients
yarn db:generate

# Push schema to databases
yarn db:push:shared
yarn db:push:university
```

## Step 5: Seed Database

```bash
yarn db:seed
```

This creates a super admin account.

## Step 6: Start Development Server

```bash
yarn dev
```

Server will start at: http://localhost:4000/graphql

## Step 7: Test the API

Open http://localhost:4000/graphql in your browser (GraphQL Playground)

### Test Query 1: Login as Super Admin

```graphql
mutation Login {
  login(input: {
    email: "admin@genuinegrads.com"
    password: "ChangeMe123!"
  }) {
    admin {
      id
      email
      isSuperAdmin
    }
    accessToken
    refreshToken
  }
}
```

Copy the `accessToken` from the response.

### Test Query 2: Check Authentication

Add the token to HTTP Headers in GraphQL Playground:

```json
{
  "Authorization": "Bearer YOUR_ACCESS_TOKEN_HERE"
}
```

Then run:

```graphql
query Me {
  me {
    id
    email
    isSuperAdmin
    username
  }
}
```

### Test Query 3: Register a University

```graphql
mutation RegisterUniversity {
  registerUniversity(input: {
    name: "Test University"
    domain: "test.edu"
    country: "United States"
    logoUrl: "https://placehold.co/200x200"
    websiteUrl: "https://test.edu"
    adminEmail: "admin@test.edu"
    adminPassword: "SecurePassword123!"
    adminFullName: "Test Admin"
  }) {
    id
    name
    domain
    status
    walletAddress
  }
}
```

### Test Query 4: Approve the University

Copy the university ID from previous response:

```graphql
mutation ApproveUniversity {
  approveUniversity(universityId: "PASTE_UNIVERSITY_ID_HERE") {
    id
    name
    status
    approvedAt
  }
}
```

### Test Query 5: Login as University Admin

```graphql
mutation UniversityLogin {
  login(input: {
    email: "admin@test.edu"
    password: "SecurePassword123!"
  }) {
    admin {
      id
      email
      university {
        id
        name
      }
    }
    accessToken
  }
}
```

Now you're authenticated as a university admin!

### Test Query 6: Register a Student

Update your Authorization header with the new token, then:

```graphql
mutation RegisterStudent {
  registerStudent(input: {
    email: "student@test.edu"
    fullName: "John Doe"
    studentNumber: "2024CS001"
    nationalId: "123456789"
    walletAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
    program: "Computer Science"
    department: "Engineering"
    enrollmentYear: 2024
  }) {
    id
    email
    fullName
    studentNumber
    program
  }
}
```

## 🎉 Success!

You now have a fully functional GenuineGrads backend running!

## Next Steps

1. **Issue a Certificate**: Use `issueCertificate` mutation
2. **Verify a Certificate**: Use `verifyCertificatePublic` query (no auth needed)
3. **Explore the Schema**: Check out all available queries and mutations in GraphQL Playground
4. **View Database**: Run `yarn db:studio:shared` or `yarn db:studio:university`

## Common Issues

### Database Connection Error

Make sure PostgreSQL is running:
```bash
# macOS
brew services start postgresql

# Ubuntu
sudo systemctl start postgresql
```

### Port Already in Use

Change the `PORT` in `.env` to something else (e.g., 4001)

### Prisma Client Not Found

Run:
```bash
yarn db:generate
```

### Environment Variables Not Loading

Make sure `.env` file is in `apps/backend/` directory, not in the root.

## 📚 More Resources

- [Full README](./README.md)
- [Environment Setup](./ENV_SETUP.md)
- [GraphQL Schema](./src/graphql/schema.ts)

## 🆘 Need Help?

Check the logs - they're pretty-printed and show you exactly what's happening!

