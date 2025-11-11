# On-Chain Integration ✅ (Frontend-First)

Universities now interact with the GenuineGrads Solana program **directly from the frontend**. The backend only indexes and verifies successful transactions.

## 📋 Overview
- Program ID: `J66NdjPnpQWkm3Pj3AihkU4XFjLaV9RF5vz2RUEwKSZF`
- Frontend loads the IDL from `src/idl/genuinegrads.json`
- Wallets (Phantom/Solflare) sign and send transactions via `sendTransaction`
- Backend receives the confirmed signature, verifies it on-chain, and updates the database (shared + university-specific)

## 🏗️ Architecture

```
UI Form ──► Frontend Solana Helper ──► Phantom/Solflare
            │                                   │
            │           (signature + PDA)        ▼
            └──────────► Backend GraphQL ◄───────┘
                               │
                               ▼
             Shared DB + Per-University DB updated
```

### Key Guarantees
- ✅ No unsigned transactions or private keys ever touch the backend
- ✅ Backend writes occur **only after** a confirmed on-chain transaction
- ✅ PDA derivations and account validations happen both client- and server-side

---

## 🎓 University Registration

### Frontend (client.tsx)
```ts
const { signature, universityPda } = await registerUniversityOnChain({
  wallet,
  connection,
  name: formData.universityName,
  metadataUri: formData.websiteUrl ?? null,
});

await graphqlClient.registerUniversity({
  name: formData.universityName,
  domain: formData.domain,
  country: formData.country,
  walletAddress: publicKey.toBase58(),
  adminEmail: formData.email,
  adminPassword: formData.password,
  adminFullName: formData.adminName,
  registrationSignature: signature,
  universityPda,
});
```

### Backend (`registerUniversity` resolver)
1. Validate uniqueness of domain, wallet, PDA, and admin email
2. Derive expected PDA and compare with payload
3. `solanaService.confirmSignature(signature)` (with retry)
4. `solanaService.universityExists(authority)` to ensure account creation
5. Create shared DB university + admin records (status `PENDING_APPROVAL`)
6. Persist `universityPDA`, `registrationTxSignature`, `superAdminPubkey`

---

## 🛡️ Super Admin Approval

### Frontend
```ts
const { signature, universityPda } = await approveUniversityOnChain({
  wallet,            // must match NEXT_PUBLIC_SUPER_ADMIN_PUBKEY
  connection,
  universityAuthority: new PublicKey(university.walletAddress),
});

await graphqlClient.approveUniversity({
  universityId,
  approvalSignature: signature,
  universityPda,
});
```

### Backend (`approveUniversity` resolver)
1. Verify caller is super admin (JWT)
2. Confirm PDA matches the stored university wallet
3. `solanaService.confirmSignature(signature)` and ensure account exists
4. Provision per-university database (same as before)
5. Update shared DB record with `status = APPROVED`, timestamps, DB URL, and `approvalTxSignature`

---

## ⛔ Deactivation

### Frontend helper
```ts
await deactivateUniversityOnChain({
  wallet,            // super admin wallet
  connection,
  universityAuthority: new PublicKey(university.walletAddress),
});
```
Return `{ signature, universityPda }` and call the new GraphQL mutation:
```ts
await graphqlClient.deactivateUniversity({
  universityId,
  deactivationSignature: signature,
  universityPda,
  reason: optionalReason,
});
```

### Backend flow
- Validate PDA + signature
- Confirm account exists but is now inactive
- Update shared DB `status = SUSPENDED`, store `deactivationTxSignature`, optional reason

---

## 🔧 Solana Helper (Frontend)
Located at `src/lib/solana/university.ts`:
- `registerUniversityOnChain`
- `approveUniversityOnChain`
- `deactivateUniversityOnChain`
- Utility: `createConnection()` (reads `NEXT_PUBLIC_SOLANA_RPC_URL`)
- Requires `NEXT_PUBLIC_SUPER_ADMIN_PUBKEY`

Each helper:
1. Derives PDAs using program seeds (`global-config`, `university`)
2. Builds the instruction manually (Anchor discriminators + Borsh encoding)
3. Sends the transaction via `wallet.sendTransaction`
4. Waits for `confirmed` commitment
5. Returns `{ signature, universityPda }`

---

## 🗄️ Backend Solana Service (`src/services/solana/solana.service.ts`)
- `deriveGlobalConfigPDA(superAdmin)`
- `deriveUniversityPDA(authority)`
- `confirmSignature(signature)` with retry (10 attempts @ 500ms)
- `universityExists(authority)` (used for sanity checks)
- `getBalance(address)` helper

No transaction construction or submission happens server-side anymore.

---

## 🔁 Environment Variables

Frontend (`.env.local`):
```
NEXT_PUBLIC_SOLANA_RPC_URL=https://rpc-devnet.helius.xyz/?api-key=<YOUR_HELIUS_KEY>
NEXT_PUBLIC_SUPER_ADMIN_PUBKEY=<SuperAdminPublicKey>
```

Backend (`apps/backend/.env`):
```
SOLANA_RPC_URL=https://rpc-devnet.helius.xyz/?api-key=<YOUR_HELIUS_KEY>
SOLANA_PROGRAM_ID=J66NdjPnpQWkm3Pj3AihkU4XFjLaV9RF5vz2RUEwKSZF
SOLANA_SUPER_ADMIN_PUBKEY=<SuperAdminPublicKey>
```

After updating backend Prisma schema (`shared.prisma`) run:
```
yarn db:generate  # regenerates Prisma clients
```

---

## ✅ Summary
- Frontend is authoritative for every Solana instruction
- Backend verifies signatures and indexes shared + tenant DBs
- GraphQL schema now expects `{ registrationSignature, approvalSignature, deactivationSignature }`
- Legacy `prepare*/submit*` mutations and hooks have been removed

Ready for the next phase (tree creation, collection creation, certificate minting) using the same pattern. 🚀

