# GenuineGrads User Guide

A comprehensive guide for students, university administrators, super administrators, and verifiers using the GenuineGrads academic certificate verification platform.

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [For Students](#3-for-students)
4. [For University Administrators](#4-for-university-administrators)
5. [For Super Administrators](#5-for-super-administrators)
6. [For Verifiers (Employers/Institutions)](#6-for-verifiers-employersinstitutions)
7. [Troubleshooting](#7-troubleshooting)
8. [FAQ](#8-faq)
9. [Glossary](#9-glossary)

---

## 1. Introduction

### 1.1 What is GenuineGrads?

GenuineGrads is a blockchain-based academic certificate verification platform built on Solana. It enables universities to issue tamper-proof digital certificates as compressed NFTs (cNFTs) that students can store in their Solana wallets and share with employers for instant verification.

### 1.2 Key Benefits

**For Universities:**
- Issue tamper-proof digital certificates
- Reduce administrative overhead for verification requests
- Prevent certificate fraud
- Cost-effective at scale (~$0.0001 per certificate)

**For Students:**
- Portable digital credentials stored in your wallet
- Instant verification by employers
- Lifetime access to your certificates
- Privacy control with Zero-Knowledge Proofs

**For Employers:**
- Instant certificate verification
- Fraud prevention with blockchain proof
- Reduced hiring risk
- No need to contact universities

### 1.3 System Requirements

- **Browser**: Chrome, Firefox, Safari, or Edge (latest versions)
- **Solana Wallet**: Phantom or Solflare (recommended)
- **Internet**: Stable broadband connection

---

## 2. Getting Started

### 2.1 Creating a Solana Wallet

If you don't have a Solana wallet, follow these steps to create one:

**Using Phantom (Recommended):**

1. Visit [phantom.app](https://phantom.app) and install the browser extension
2. Click "Create New Wallet"
3. **Important**: Write down your 12-word recovery phrase and store it securely
4. Set a password for the wallet
5. Your wallet is ready to use

**Using Solflare:**

1. Visit [solflare.com](https://solflare.com) and install the browser extension
2. Click "Create New Wallet"
3. Save your recovery phrase securely
4. Set a password
5. Your wallet is ready

### 2.2 Getting Devnet SOL (For Testing)

For testing on devnet, you'll need devnet SOL:

1. Open your wallet and copy your wallet address
2. Visit [faucet.solana.com](https://faucet.solana.com)
3. Paste your wallet address and request an airdrop
4. Wait for the transaction to confirm

### 2.3 Connecting Your Wallet

1. Navigate to the GenuineGrads platform
2. Click "Connect Wallet" in the top right
3. Select your wallet (Phantom/Solflare)
4. Approve the connection request in your wallet
5. You're now connected

---

## 3. For Students

### 3.1 Logging In

Students authenticate using their Solana wallet:

1. Navigate to `/student-login`
2. Click "Connect Wallet"
3. Approve the connection in your wallet
4. Sign the authentication message when prompted
5. You'll be redirected to your student dashboard

**Note**: Your wallet address must be registered with at least one university to log in.

### 3.2 Student Dashboard Overview

The dashboard displays:
- **Total Certificates**: Number of certificates you've received
- **Verified Count**: How many times your certificates have been verified
- **Recent Activity**: Latest verification events
- **Quick Actions**: Links to certificates, achievements, and settings

### 3.3 Viewing Your Certificates

Navigate to **Certificates** from the sidebar:

- View all your certificates from all universities
- See certificate status:
  - **PENDING**: Certificate created but not yet minted on blockchain
  - **MINTED**: Certificate is on the blockchain
  - **REVOKED**: Certificate has been revoked by the university
- Click on any certificate to view full details

### 3.4 Sharing Certificates

To share a certificate with employers:

**Share via Link:**
1. Click "Download QR"
2. Copy the link
3. Send the link to the employer

**Share via QR Code:**
1. Click "Download QR"
2. Click "Download QR Code"
3. The employer can scan this QR code to verify

**Download Certificate:**
1. Click on the certificate
2. Click "Download" to get a copy.

### 3.5 Zero-Knowledge Proof Generation

ZK proofs allow you to prove you have specific achievements without revealing your full transcript.

**When to Use ZK Proofs:**
- Prove you have a specific achievement (e.g., "Dean's List") without revealing GPA
- Selective disclosure of credentials for privacy
- Prove membership without revealing identity

**Generating a ZK Proof:**

1. Navigate to **Achievements** from the sidebar
2. Select the certificate containing the achievement
3. Click "Enable ZK Verification" on the achievement
4. Wait for the commitment to be registered
5. Click "Generate Proof"
6. Wait for proof generation (may take a few seconds)
8. Proof will be avaialable on the certificate verification page. employers can verify the proof.

### 3.6 Verification Log

Track who has verified your certificates:

1. Navigate to **Verification Log** from the sidebar
2. View verification history with:
   - Date and time
   - Certificate verified
   - Verification method used
3. View statistics on total verifications

### 3.7 Account Settings

Navigate to **My Account** to manage:

- Profile information
- Connected wallet address

---

## 4. For University Administrators

### 4.1 Initial Setup

#### 4.1.1 Registration Process

1. Navigate to the registration page
2. Fill in university details:
   - University name
   - Domain (e.g., university.edu)
   - Country
   - Logo URL
   - Website URL
3. Fill in admin details:
   - Full name
   - Email address
   - Password
4. Connect your university Solana wallet
5. Submit registration
6. Wait for super admin approval

#### 4.1.2 Post-Approval Setup

After approval, complete the blockchain setup:

**Step 1: Create Merkle Tree**
1. Navigate to **Settings > Blockchain**
2. Click "Create Merkle Tree"
3. Choose tree parameters:
   - **Depth**: Determines maximum certificates (depth 14 = ~16,000 certificates)
   - **Buffer Size**: Affects update performance
4. Sign the transaction in your wallet
5. Wait for confirmation

**Step 2: Create NFT Collection**
1. In the same Blockchain settings page
2. Click "Create Collection"
3. Enter collection name and description
4. Sign the transaction
5. Wait for confirmation
6. Your collection address will be displayed

### 4.2 Student Management

#### 4.2.1 Adding a Single Student

1. Navigate to **Students > Add Student**
2. Fill in student details:
   - Full name
   - Email address
   - Student number
   - National ID (NIC) - used for unique identification
   - Program/Department
   - Batch year
   - Wallet address (student's Solana wallet)
3. Click "Register Student"

#### 4.2.2 Bulk Upload via CSV

1. Navigate to **Students > Bulk Upload**
2. Download the CSV template
3. Fill in student data following the template format:
   ```csv
   fullName,email,studentNumber,nicNumber,program,department,batchYear,walletAddress
   John Doe,john@student.edu,STU001,123456789V,BSc Computer Science,Computing,2024,ABC123...
   ```
4. Upload the completed CSV file
5. Review the preview
6. Click "Import Students"

### 4.3 Certificate Management

#### 4.3.1 Creating Certificate Templates

1. Navigate to **Certificates > Designer**
2. Click "Create New Template"
3. Use the visual editor to design:
   - Add text elements with placeholders:
     - `{{studentName}}` - Student's full name
     - `{{program}}` - Program name
     - `{{graduationDate}}` - Graduation date
     - `{{certificateNumber}}` - Unique certificate ID
   - Add images (university logo, seal, background)
   - Configure layout and styling
4. Save the template

#### 4.3.2 Issuing Single Certificates

1. Navigate to **Certificates > Verify and Draft**
2. Search for the student
3. Verify student information
4. Select certificate template
5. Fill in certificate metadata:
   - Certificate title
   - Issue date
   - Graduation date
   - Honors/distinctions
7. Click "Create Draft"
8. The certificate is now in PENDING status

#### 4.3.3 Minting Certificates

**Single Mint:**
1. Navigate to **Certificates**
2. Find the PENDING certificate
3. Click "Mint"
4. Connect your wallet if not connected
5. Sign the transaction
6. Wait for blockchain confirmation
7. Certificate status changes to ISSUED

**Batch Minting:**
1. Navigate to **Certificates**
2. Select multiple PENDING certificates
3. Click "Issue Selected"
4. Review the batch
5. Click "Start Minting"
6. Sign each transaction as prompted
7. Monitor progress in the batch dialog
8. All certificates are minted

#### 4.3.4 Revoking Certificates

1. Navigate to **Certificates**
2. Find the MINTED certificate
3. Click "Burn certificate"
4. Enter revocation reason (required)
5. Enter admin password and Confirm the action
6. Sign the burn transaction
7. Certificate status changes to REVOKED

**Note**: Revocation is permanent and creates an on-chain audit trail.

### 4.4 Analytics Dashboard

Navigate to **Analytics** to view:

- **Certificates Issued**: Total and over time
- **Students Enrolled**: By program and batch
- **Verification Activity**: How often certificates are verified
- **Mint Activity**: Recent minting operations
- **Blockchain Activity**: Recent blockchain operations
- **Trends**: Can view the trends

### 4.5 Settings

#### General Settings
- Update university profile (not available)
- Change logo and branding (not available)
- Manage contact information (not available)

#### Security Settings
- Enable/disable TOTP 2FA

---

## 5. For Super Administrators

### 5.1 Platform Initialization

On first deployment:

1. Deploy the Solana program (see Installation Guide)
2. Initialize global config with your super admin wallet
3. The platform is ready for university registrations

### 5.2 University Management

#### 5.2.1 Reviewing Registrations

1. Navigate to **Universities**
2. View pending applications
3. Click on a university to review:
   - Institution details
   - Admin information
   - Wallet address
   - Website and documentation

#### 5.2.2 Approving Universities

1. Review the registration thoroughly
2. Click "Approve"
3. Connect your super admin wallet
4. Sign the approval transaction
5. The university receives notification and can begin setup

#### 5.2.3 Suspending Universities

If a university violates terms:

1. Navigate to the university details
2. Click "Suspend"
3. Enter suspension reason
4. Sign the transaction
5. University cannot mint new certificates while suspended

### 5.3 Platform Monitoring

The super admin dashboard displays:

- **Active Universities**: Total approved and active
- **Total Certificates**: Across all universities
- **Verification Statistics**: Platform-wide
- **Recent Activity**: Latest minting and verification events

### 5.4 Admin Settings
- Configure TOTP 2FA (strongly recommended)
---

## 6. For Verifiers (Employers/Institutions)

### 6.1 Certificate Verification Portal

The verification portal is publicly accessible - no account required.

Navigate to `/verify` to access the verification portal.

### 6.2 Verification Methods

#### 6.2.1 By Certificate Number

1. Enter the certificate number (e.g., `MIT-2024-CS-00123`)
2. Click "Verify certificate"
3. View verification results

#### 6.2.2 By QR Code

1. Click "Scan QR Code"
2. Allow camera access
3. Point camera at the QR code on the certificate
4. Results appear automatically

#### 6.2.3 By Mint Address

1. Enter the Solana mint address
2. Click "Verify certificate"
3. View blockchain verification results

### 6.3 Understanding Verification Results

**Valid Certificate:**
- Green checkmark displayed
- Certificate details shown:
  - Student name
  - University
  - Program/Degree
  - Issue date
  - Graduation date
- Blockchain proof:
  - Mint address
  - Transaction signature
  - Metadata URI

**Revoked Certificate:**
- Red warning displayed
- Revocation reason shown
- Revocation date
- Original certificate details still visible

**Not Found:**
- Certificate doesn't exist in the system
- May be a fake certificate number

### 6.4 ZK Proof Verification

When a student enables a ZK proof for their acheivements:

1. At the Verification Results page, scroll to "Achievements & Honors"
2. Click "Verify"
3. The system cryptographically verifies the proof
4. Results show:
   - Proof valid/invalid
   - Achievement confirmed
   - No personal data revealed beyond the claim
5. Verification report will be generated.

---

## 7. Troubleshooting

### 7.1 Wallet Connection Issues

**Problem**: Wallet won't connect

**Solutions**:
- Refresh the page and try again
- Make sure your wallet extension is unlocked
- Clear browser cache and cookies
- Try a different browser
- Ensure you're on the correct network (devnet/mainnet)

### 7.2 Transaction Failures

**Problem**: Transaction fails or times out

**Solutions**:
- Check your wallet has sufficient SOL for fees
- Wait a few minutes and retry (network congestion)
- Check Solana network status at [status.solana.com](https://status.solana.com)
- Try increasing priority fee in wallet settings

### 7.3 Certificate Not Appearing

**Problem**: Minted certificate not showing

**Solutions**:
- Wait 1-2 minutes for blockchain confirmation
- Refresh the page
- Check the transaction on Solana Explorer
- Contact support if issue persists

### 7.4 ZK Proof Generation Errors

**Problem**: Proof generation fails

**Solutions**:
- Ensure stable internet connection
- Wait for WASM files to fully load
- Try refreshing the page
- Use Chrome or Firefox for best compatibility
- Clear browser cache and try again

---

## 8. FAQ

### General Questions

**Q: What is a compressed NFT (cNFT)?**
A: A cNFT is a cost-efficient NFT on Solana that uses Merkle trees for data compression, reducing minting costs by ~100x compared to regular NFTs.

**Q: Why does GenuineGrads use Solana?**
A: Solana offers fast finality (~400ms), low fees (~$0.0001), and supports compressed NFTs for scalable certificate issuance.

**Q: Is my data secure?**
A: Yes. Your wallet's private key never leaves your device. Certificate metadata is stored on IPFS, and verification happens on-chain and off-chain.

### For Students

**Q: How do I recover my wallet?**
A: Use your 12-word recovery phrase to restore your wallet. Never share this phrase with anyone.

**Q: Can I have certificates from multiple universities?**
A: Yes! All certificates from any registered university appear in your dashboard.

**Q: What if my certificate is revoked?**
A: You'll be notified, and the certificate will show as REVOKED. Contact your university for more information.

### For Universities

**Q: How much does minting cost?**
A: Approximately $0.0001 per certificate on Solana mainnet. Devnet is free for testing.

**Q: Can I customize certificate appearance?**
A: Yes, use the Certificate Designer to create custom templates with your branding.

**Q: How do I transfer admin access?**
A: Contact GenuineGrads support for admin transfer procedures.

---

## 9. Glossary

| Term | Definition |
|------|------------|
| **cNFT** | Compressed NFT - a cost-efficient NFT using Merkle tree compression |
| **Merkle Tree** | Data structure for efficient verification of compressed NFT ownership |
| **IPFS** | InterPlanetary File System - decentralized storage for metadata |
| **ZKP** | Zero-Knowledge Proof - cryptographic proof without revealing underlying data |
| **Groth16** | ZK-SNARK proving system used for achievement proofs |
| **Poseidon** | Hash function optimized for ZK circuits |
| **PDA** | Program Derived Address - deterministic Solana account addresses |
| **Wallet** | Software for managing Solana accounts and signing transactions |
| **Mint Address** | Unique identifier for an NFT on Solana |
| **TOTP** | Time-based One-Time Password - 2FA using authenticator apps |

---

## Contact & Support

- **Issues**: [GitHub Issues](https://github.com/shahadh7/genuine-grads/issues)
- **Documentation**: See README files in each component

---

**Document Version**: 1.0
**Last Updated**: January 2025
**University of Moratuwa - Final Year Project**
