# GenuineGrads Backend API

A fully modularized Node.js GraphQL API backend for the GenuineGrads platform - a Solana-based academic certificate verification system using compressed NFTs (cNFTs) and Zero-Knowledge Proofs.

## 🚀 Features

- ✅ **GraphQL API** with Apollo Server
- ✅ **Multi-tenant Architecture** with separate university databases
- ✅ **JWT Authentication** with access and refresh tokens
- ✅ **Role-Based Access Control** (Super Admin, University Admin)
- ✅ **Prisma ORM** with PostgreSQL (Shared + University databases)
- ✅ **Solana Integration** via Helius for cNFT minting/burning
- ✅ **IPFS Metadata Storage** via Pinata
- ✅ **Zero-Knowledge Proofs** for selective credential disclosure
- ✅ **Public Certificate Verification** (no auth required)
- ✅ **Comprehensive Logging** with Pino
- ✅ **Type Safety** with TypeScript

## 📁 Project Structure

```
apps/backend/
├── prisma/
│   ├── shared.prisma          # Shared central database schema
│   └── university.prisma      # Private university database schema
├── src/
│   ├── auth/                  # Authentication (JWT, password hashing)
│   │   ├── jwt.ts
│   │   └── password.ts
│   ├── db/                    # Database clients
│   │   ├── shared.client.ts
│   │   └── university.client.ts
│   ├── graphql/               # GraphQL schema and resolvers
│   │   ├── schema.ts
│   │   ├── context.ts
│   │   └── resolvers/
│   │       ├── mutations/     # All mutations
│   │       │   ├── auth.mutations.ts
│   │       │   ├── university.mutations.ts
│   │       │   ├── student.mutations.ts
│   │       │   └── certificate.mutations.ts
│   │       ├── queries/       # All queries
│   │       │   ├── auth.queries.ts
│   │       │   ├── university.queries.ts
│   │       │   ├── student.queries.ts
│   │       │   ├── certificate.queries.ts
│   │       │   └── public.queries.ts
│   │       └── index.ts
│   ├── services/              # External integrations
│   │   ├── helius/
│   │   │   └── helius.client.ts
│   │   └── zkp/
│   │       └── zkp.service.ts
│   ├── utils/                 # Utilities
│   │   ├── logger.ts
│   │   ├── crypto.ts
│   │   └── ids.ts
│   ├── env.ts                 # Environment config with validation
│   ├── server.ts              # Apollo Server setup
│   └── index.ts               # Entry point
├── package.json
├── tsconfig.json
└── ENV_SETUP.md
```

## 🛠️ Setup Instructions

### 1. Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 14
- Redis (for background jobs - optional)
- Yarn

### 2. Install Dependencies

```bash
cd apps/backend
yarn install
```

### 3. Environment Variables

Create a `.env` file (see `ENV_SETUP.md` for details):

```bash
# Copy the example and fill in your values
cp ENV_SETUP.md .env
```

Generate secrets:

```bash
# Generate JWT secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate master encryption key
node -e "console.log('MASTER_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Database Setup

#### Create Databases

```bash
# Connect to PostgreSQL
psql -U postgres

# Create shared database
CREATE DATABASE genuinegrads_shared;

# Create template university database
CREATE DATABASE genuinegrads_uni_template;

# Exit
\q
```

#### Run Migrations

```bash
# Generate Prisma clients
yarn db:generate

# Run migrations for shared database
yarn db:push:shared

# Run migrations for university database template
yarn db:push:university
```

### 5. Seed Database (Optional)

```bash
yarn db:seed
```

This will create:
- A super admin account
- Sample universities (optional)

### 6. Run Development Server

```bash
yarn dev
```

The server will start at `http://localhost:4000/graphql`

## 🔑 Authentication Flow

### 1. Super Admin Login

```graphql
mutation Login {
  login(input: {
    email: "admin@genuinegrads.com"
    password: "YourSuperAdminPassword"
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

### 2. Register University

```graphql
mutation RegisterUniversity {
  registerUniversity(input: {
    name: "Massachusetts Institute of Technology"
    domain: "mit.edu"
    country: "United States"
    logoUrl: "https://example.com/mit-logo.png"
    websiteUrl: "https://mit.edu"
    adminEmail: "admin@mit.edu"
    adminPassword: "SecurePassword123!"
    adminFullName: "John Doe"
  }) {
    id
    name
    status
    walletAddress
  }
}
```

### 3. Approve University

```graphql
mutation ApproveUniversity {
  approveUniversity(universityId: "clx123...") {
    id
    name
    status
    approvedAt
  }
}
```

### 4. University Admin Login

```graphql
mutation UniversityLogin {
  login(input: {
    email: "admin@mit.edu"
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
    refreshToken
  }
}
```

## 📚 Main API Operations

### For Super Admin

- `pendingUniversities` - List all pending university registrations
- `approveUniversity` - Approve a university
- `rejectUniversity` - Reject a university
- `allUniversities` - List all universities

### For University Admin

**Students:**
- `students` - List students with filters
- `student(id)` - Get student details
- `registerStudent` - Register a new student
- `updateStudent` - Update student info
- `deleteStudent` - Deactivate student

**Certificates:**
- `certificates` - List certificates
- `certificate(id)` - Get certificate details
- `issueCertificate` - Issue a single certificate
- `bulkIssueCertificates` - Batch issue certificates
- `revokeCertificate` - Revoke a certificate

**Templates:**
- `certificateTemplates` - List templates
- `createCertificateTemplate` - Create template
- `updateCertificateTemplate` - Update template

**Analytics:**
- `universityStats` - Get dashboard statistics
- `mintActivityLogs` - View minting logs
- `revokedCertificates` - List revoked certificates

### Public (No Auth Required)

- `verifyCertificatePublic` - Verify any certificate by number or mint address

```graphql
query VerifyCertificate {
  verifyCertificatePublic(
    certificateNumber: "MIT-2024-CS-00123"
  ) {
    isValid
    status
    certificate {
      badgeTitle
      issueDate
      university {
        name
        logoUrl
      }
      studentName
    }
    blockchainProof {
      mintAddress
      transactionSignature
      metadataUri
    }
  }
}
```

## 🗄️ Database Architecture

### Shared Central Database
- **Universities** - All registered universities
- **Admins** - Platform and university admins
- **GlobalStudentIndex** - Cross-university student registry (prevents duplicates)
- **MintActivityLog** - All certificate minting events
- **RevokedCertIndex** - Centralized revocation registry
- **WebhookLog** - Helius webhook events

### Private University Databases
Each university has its own isolated database:
- **Students** - University's students
- **Courses** - Course catalog
- **Enrollments** - Student enrollments
- **Achievements** - Student badges/honors
- **Certificates** - Issued certificates (references to cNFTs)
- **CertificateTemplates** - Certificate templates
- **ZKPProofRequests** - Zero-knowledge proof requests
- **BatchIssuanceJobs** - Bulk issuance jobs

## 🔐 Security Features

- **JWT Authentication** with access (15 min) and refresh (7 days) tokens
- **Argon2id Password Hashing** with memory-hard settings
- **Account Lockout** after 5 failed login attempts (30 min)
- **Encrypted Private Keys** for university Solana wallets
- **Privacy-Preserving NIC Hashing** (SHA-256)
- **Role-Based Access Control** (RBAC)
- **Rate Limiting** (recommended to add)
- **CORS Protection**

## 🧪 Testing

```bash
# Run tests
yarn test

# View coverage
yarn test --coverage
```

## 📊 Monitoring

### View Logs

Development logs are pretty-printed with Pino:

```bash
yarn dev
```

Production logs are JSON-formatted for log aggregation.

### Database Studio

```bash
# Shared database
yarn db:studio:shared

# University database
yarn db:studio:university
```

## 🚢 Deployment

### Build for Production

```bash
yarn build
```

### Run Production Server

```bash
NODE_ENV=production yarn start
```

### Docker (Recommended)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --production
COPY . .
RUN yarn build
EXPOSE 4000
CMD ["yarn", "start"]
```

### Environment Variables for Production

Make sure to set:
- `NODE_ENV=production`
- Strong `JWT_SECRET` and `JWT_REFRESH_SECRET`
- `MASTER_ENCRYPTION_KEY` (keep secure!)
- Production database URLs
- Helius API key for mainnet
- CORS_ORIGIN with actual frontend URL

## 📝 API Documentation

GraphQL Playground is available at:
```
http://localhost:4000/graphql
```

(Disabled in production for security)

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Run tests and linter
4. Submit pull request

## 📄 License

MIT

## 🆘 Support

For issues or questions, contact: support@genuinegrads.com

---

Built with ❤️ by the GenuineGrads Team

