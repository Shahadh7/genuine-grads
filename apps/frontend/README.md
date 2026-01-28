# GenuineGrads Frontend

A Next.js 15 web application for the GenuineGrads platform - providing interfaces for students, university administrators, and super admins to manage and verify academic certificates on the Solana blockchain.

## Features

- **Multi-Role Dashboards** - Separate interfaces for students, university admins, and super admins
- **Solana Wallet Integration** - Connect with Phantom, Solflare, and other Solana wallets
- **Zero-Knowledge Proofs** - Generate privacy-preserving proofs for selective credential disclosure
- **Certificate Verification** - Public verification portal with QR code scanning
- **Real-time Notifications** - Live updates via Server-Sent Events
- **Dark Mode Support** - Theme switching with next-themes
- **Responsive Design** - Mobile-friendly UI with Tailwind CSS

## Tech Stack

- **Framework**: Next.js 15.4 with App Router and Turbopack
- **React**: React 19
- **Styling**: Tailwind CSS 4 + Radix UI + shadcn/ui
- **Wallet**: Solana Wallet Adapter
- **ZK Proofs**: snarkjs + circomlibjs
- **QR Codes**: html5-qrcode + react-qr-code
- **Validation**: Yup schema validation
- **Icons**: Lucide React

## Form Validation

The application uses **Yup** schemas for form validation:

### Validation Modules (`src/lib/validation/`)
- `schemas/common.ts` - Reusable validators (email, password, URL, wallet, GPA, TOTP)
- `schemas/auth.ts` - Login and TOTP verification schemas
- `schemas/student.ts` - Add student, enroll student, bulk upload schemas
- `schemas/university.ts` - University registration schemas
- `schemas/certificate.ts` - Certificate issuance schemas
- `adapters/` - Custom validators (NIC validation by region)
- `hooks/` - `useYupValidation()` hook for form state management

## Real-time Notifications

The `NotificationContext` provides real-time notifications via SSE:

**Features:**
- Secure SSE connection with Authorization header (not query params)
- Automatic reconnection on failure (5s intervals)
- Cursor-based pagination with infinite scroll
- Priority-based toast notifications (LOW, NORMAL, HIGH, URGENT)
- Role-specific endpoints (admin vs student)

**Usage:**
```tsx
const {
  notifications,
  unreadCount,
  isConnected,
  markAsRead,
  markAllAsRead
} = useNotifications();
```

## Zero-Knowledge Proof Generation

The ZK module (`src/lib/zk/`) enables privacy-preserving credential verification:

### Workflow:
1. **Generate Deterministic Secret** - Wallet signature-based secret derivation
2. **Compute Commitment** - Poseidon hash of (credential_hash, secret, salt, achievement_hash)
3. **Register Commitment** - Store commitment on backend
4. **Generate Proof** - Client-side Groth16 proof using snarkjs
5. **Upload Proof** - Store proof for employer verification

### Key Files:
- `deterministic-secrets.ts` - Wallet-based secret generation
- `commitment.ts` - Poseidon commitment computation
- `proof-generator.ts` - Groth16 proof generation with snarkjs
- `hash-utils.ts` - Field element conversions
- `constants.ts` - Circuit and artifact configurations

## Project Structure

```
apps/frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── admin/              # Super admin dashboard
│   │   ├── university/         # University admin portal
│   │   ├── student/            # Student dashboard
│   │   │   └── achievements/   # Achievement proofs
│   │   ├── verify/             # Public verification
│   │   ├── login/              # Admin login
│   │   └── student-login/      # Student wallet login
│   ├── components/             # Reusable UI components
│   │   ├── certificates/       # Certificate display
│   │   ├── wallet/             # Wallet connection
│   │   └── ui/                 # shadcn/ui components
│   ├── contexts/               # React Context providers
│   ├── hooks/                  # Custom React hooks
│   ├── lib/
│   │   ├── solana/             # Solana utilities
│   │   └── zk/                 # ZK proof generation
│   ├── idl/                    # Anchor IDL files
│   └── types/                  # TypeScript definitions
├── public/
│   └── zk-artifacts/           # WASM and zkey files
└── package.json
```

## Setup Instructions

### 1. Prerequisites

- Node.js >= 18.0.0
- Yarn
- Running backend at `http://localhost:4000`

### 2. Install Dependencies

```bash
cd apps/frontend
yarn install
```

### 3. Environment Variables

Create a `.env.local` file:

```bash
# Backend GraphQL URL
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000

# Solana Network
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Program ID
NEXT_PUBLIC_PROGRAM_ID=J9Bsd3MSutBQDqsaXc5otLvDmrrN7vEynx2fYaH296FX
```

### 4. ZK Artifacts

Copy ZK artifacts from the zk-service:

```bash
mkdir -p public/zk-artifacts
cp ../zk-service/artifacts/ach_member_v1.wasm public/zk-artifacts/
cp ../zk-service/artifacts/ach_member_v1.zkey public/zk-artifacts/
```

### 5. Run Development Server

```bash
yarn dev
```

The app will be available at `http://localhost:3000`

## Available Routes

### Public Routes
| Route | Description |
|-------|-------------|
| `/` | Landing page with features overview |
| `/login` | Admin/University admin login |
| `/student-login` | Student wallet-based login |
| `/verify` | Public certificate verification portal |
| `/verify/[certificateId]` | Specific certificate verification |

### Super Admin Routes (`/admin/*`)
| Route | Description |
|-------|-------------|
| `/admin/dashboard` | Super admin dashboard with stats |
| `/admin/universities` | List all universities |
| `/admin/universities/register` | Register new university |
| `/admin/universities/[id]` | University details |
| `/admin/universities/[id]/approve` | Approve university |
| `/admin/universities/[id]/suspend` | Suspend university |
| `/admin/notifications` | Admin notifications |
| `/admin/settings` | Admin settings |

### University Admin Routes (`/university/*`)
| Route | Description |
|-------|-------------|
| `/university/dashboard` | University dashboard |
| `/university/students` | Student management |
| `/university/students/add` | Add single student |
| `/university/students/enroll` | Enroll student in course |
| `/university/students/bulk-upload` | Bulk upload students via CSV |
| `/university/certificates` | Certificate management |
| `/university/certificates/designer` | Certificate template designer |
| `/university/certificates/verify-and-draft` | Create certificate draft |
| `/university/analytics` | University analytics |
| `/university/settings` | University settings |
| `/university/settings/blockchain` | Blockchain configuration (Merkle tree, collection) |
| `/university/notifications` | University notifications |

### Student Routes (`/student/*`)
| Route | Description |
|-------|-------------|
| `/student/dashboard` | Student dashboard |
| `/student/certificates` | View and share certificates |
| `/student/achievements` | ZK proof generation for achievements |
| `/student/verification-log` | View verification history |
| `/student/account` | Account settings |
| `/student/notifications` | Student notifications |

## User Flows

### Student Flow
1. Connect Solana wallet at `/student-login`
2. View certificates on dashboard
3. Generate ZK proofs for achievements
4. Share proof links with employers

### University Admin Flow
1. Login with credentials at `/login`
2. Manage students and certificates
3. Issue new certificates (mints cNFTs)
4. View analytics and logs

### Super Admin Flow
1. Login at `/login`
2. Review pending university registrations
3. Approve or reject universities
4. Monitor platform activity

## Building for Production

```bash
# Build
yarn build

# Start production server
yarn start
```

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables
3. Deploy

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build
EXPOSE 3000
CMD ["yarn", "start"]
```

## License

MIT
