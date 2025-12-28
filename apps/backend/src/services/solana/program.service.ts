import { AnchorProvider, Program, Idl, web3 } from '@coral-xyz/anchor';
import BN from 'bn.js';
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { env } from '../../env.js';
import { logger } from '../../utils/logger.js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Program ID from IDL
export const GENUINEGRADS_PROGRAM_ID = new PublicKey('CbGKtgvvAeJbMBpSJEMCuwJTwXCjzuHnSGoiSSMQ6WuS');

// Well-known program IDs
export const MPL_CORE_PROGRAM_ID = new PublicKey('CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d');
export const BUBBLEGUM_PROGRAM_ID = new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY');
export const SPL_ACCOUNT_COMPRESSION_PROGRAM_ID = new PublicKey('mcmt6YrQEMKw8Mw43FmpRLmf7BqRnFMKmAcbxE3xkAW');
export const SPL_NOOP_PROGRAM_ID = new PublicKey('mnoopTCrg4p8ry25e4bcWA9XZjbNjMTfgYVGGEdRsf3');

// Load IDL
let idl: Idl;
try {
  // Try multiple possible IDL locations
  const possiblePaths = [
    join(process.cwd(), 'src/services/solana/idl/genuinegrads.json'), // Local copy in backend
    join(process.cwd(), '../program/genuinegrads/target/idl/genuinegrads.json'), // Original path
    join(process.cwd(), '../../program/genuinegrads/target/idl/genuinegrads.json'), // Adjusted for monorepo
  ];

  let loaded = false;
  for (const idlPath of possiblePaths) {
    try {
      idl = JSON.parse(readFileSync(idlPath, 'utf-8'));
      logger.info({ idlPath }, 'Loaded IDL from file');
      loaded = true;
      break;
    } catch {
      // Try next path
    }
  }

  if (!loaded) {
    throw new Error('IDL not found in any expected location');
  }
} catch (error) {
  logger.warn('Failed to load IDL from file, using fallback');
  // Fallback: you could embed the IDL here or fetch it
  throw new Error('IDL not found. Please ensure the program IDL is available.');
}

// Initialize connection
export const connection = new Connection(env.SOLANA_RPC_URL, 'confirmed');

/**
 * Get program instance (read-only, no wallet needed)
 */
export function getProgram(): Program {
  // Create a dummy provider for read-only operations
  const wallet = {
    publicKey: PublicKey.default,
    signTransaction: async (tx: Transaction) => tx,
    signAllTransactions: async (txs: Transaction[]) => txs,
  };

  const provider = new AnchorProvider(connection, wallet as any, {
    commitment: 'confirmed',
  });

  // Patch the IDL to include account type information for Anchor 0.31.x compatibility
  // The newer IDL format (0.30+) separates account metadata from types, but Anchor 0.31.x
  // expects them to be together for the BorshCoder to calculate account sizes
  const patchedIdl = {
    ...idl,
    accounts: (idl as any).accounts?.map((acc: any) => {
      const typeInfo = (idl as any).types?.find((t: any) => t.name === acc.name);
      return typeInfo ? { ...acc, type: typeInfo.type } : acc;
    }) || []
  };

  return new Program(patchedIdl as Idl, provider);
}

/**
 * Derive PDAs
 */
export function deriveGlobalConfigPDA(superAdmin: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('global-config'), superAdmin.toBuffer()],
    GENUINEGRADS_PROGRAM_ID
  );
}

export function deriveUniversityPDA(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('university'), authority.toBuffer()],
    GENUINEGRADS_PROGRAM_ID
  );
}

export function deriveUniversityCollectionPDA(university: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('university_collection'), university.toBuffer()],
    GENUINEGRADS_PROGRAM_ID
  );
}

export function deriveUniversityTreePDA(merkleTree: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('university_tree'), merkleTree.toBuffer()],
    GENUINEGRADS_PROGRAM_ID
  );
}

export function deriveTreeConfig(merkleTree: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [merkleTree.toBuffer()],
    BUBBLEGUM_PROGRAM_ID
  );
}

/**
 * Fetch on-chain accounts
 */
export async function fetchGlobalConfig(superAdmin: PublicKey) {
  const program = getProgram();
  const [globalConfigPDA] = deriveGlobalConfigPDA(superAdmin);

  try {
    const account = await (program.account as any).globalConfig.fetch(globalConfigPDA);
    return account;
  } catch (error) {
    logger.warn({ superAdmin: superAdmin.toBase58(), error }, 'Global config not found');
    return null;
  }
}

export async function fetchUniversity(authority: PublicKey) {
  const program = getProgram();
  const [universityPDA] = deriveUniversityPDA(authority);

  try {
    const account = await (program.account as any).university.fetch(universityPDA);
    return account;
  } catch (error) {
    logger.warn({ authority: authority.toBase58(), error }, 'University not found');
    return null;
  }
}

export async function fetchUniversityCollection(university: PublicKey) {
  const program = getProgram();
  const [collectionPDA] = deriveUniversityCollectionPDA(university);

  try {
    const account = await (program.account as any).universityCollection.fetch(collectionPDA);
    return account;
  } catch (error) {
    logger.warn({ university: university.toBase58(), error }, 'University collection not found');
    return null;
  }
}

export async function fetchUniversityTree(merkleTree: PublicKey) {
  const program = getProgram();
  const [treePDA] = deriveUniversityTreePDA(merkleTree);

  try {
    const account = await (program.account as any).universityTree.fetch(treePDA);
    return account;
  } catch (error) {
    logger.warn({ merkleTree: merkleTree.toBase58(), error }, 'University tree not found');
    return null;
  }
}

/**
 * Build instructions (return unsigned transactions)
 */

interface InitializeConfigParams {
  superAdmin: PublicKey;
}

export async function buildInitializeConfigInstruction(params: InitializeConfigParams) {
  const program = getProgram();
  const { superAdmin } = params;

  const [globalConfigPDA] = deriveGlobalConfigPDA(superAdmin);

  const ix = await program.methods
    .initializeConfig()
    .accounts({
      superAdmin,
      globalConfig: globalConfigPDA,
      systemProgram: web3.SystemProgram.programId,
    })
    .instruction();

  return { instruction: ix, globalConfigPDA };
}

interface RegisterUniversityParams {
  universityAuthority: PublicKey;
  superAdmin: PublicKey;
  name: string;
  metadataUri?: string;
}

export async function buildRegisterUniversityInstruction(params: RegisterUniversityParams) {
  const program = getProgram();
  const { universityAuthority, superAdmin, name, metadataUri } = params;

  const [globalConfigPDA] = deriveGlobalConfigPDA(superAdmin);
  const [universityPDA] = deriveUniversityPDA(universityAuthority);

  const ix = await program.methods
    .registerUniversity({
      name,
      metadataUri: metadataUri || null,
    })
    .accounts({
      universityAuthority,
      globalConfig: globalConfigPDA,
      university: universityPDA,
      systemProgram: web3.SystemProgram.programId,
    })
    .instruction();

  return { instruction: ix, universityPDA };
}

interface ApproveUniversityParams {
  superAdmin: PublicKey;
  universityAuthority: PublicKey;
}

export async function buildApproveUniversityInstruction(params: ApproveUniversityParams) {
  const program = getProgram();
  const { superAdmin, universityAuthority } = params;

  const [globalConfigPDA] = deriveGlobalConfigPDA(superAdmin);
  const [universityPDA] = deriveUniversityPDA(universityAuthority);

  const ix = await program.methods
    .approveUniversity()
    .accounts({
      superAdmin,
      globalConfig: globalConfigPDA,
      universityAuthority,
      university: universityPDA,
    })
    .instruction();

  return { instruction: ix, universityPDA };
}

interface DeactivateUniversityParams {
  superAdmin: PublicKey;
  universityAuthority: PublicKey;
}

export async function buildDeactivateUniversityInstruction(params: DeactivateUniversityParams) {
  const program = getProgram();
  const { superAdmin, universityAuthority } = params;

  const [globalConfigPDA] = deriveGlobalConfigPDA(superAdmin);
  const [universityPDA] = deriveUniversityPDA(universityAuthority);

  const ix = await program.methods
    .deactivateUniversity()
    .accounts({
      superAdmin,
      globalConfig: globalConfigPDA,
      universityAuthority,
      university: universityPDA,
    })
    .instruction();

  return { instruction: ix, universityPDA };
}

interface CreateTreeParams {
  universityAuthority: PublicKey;
  superAdmin: PublicKey;
  merkleTree: Keypair; // New keypair for tree
  maxDepth: number;
  maxBufferSize: number;
  isPublic: boolean;
}

export async function buildCreateTreeInstruction(params: CreateTreeParams) {
  const program = getProgram();
  const { universityAuthority, superAdmin, merkleTree, maxDepth, maxBufferSize, isPublic } = params;

  const [globalConfigPDA] = deriveGlobalConfigPDA(superAdmin);
  const [universityPDA] = deriveUniversityPDA(universityAuthority);
  const [universityTreePDA] = deriveUniversityTreePDA(merkleTree.publicKey);
  const [treeConfig] = deriveTreeConfig(merkleTree.publicKey);

  const ix = await program.methods
    .createTreeV2({
      maxDepth,
      maxBufferSize,
      isPublic,
    })
    .accounts({
      universityAuthority,
      globalConfig: globalConfigPDA,
      university: universityPDA,
      universityTree: universityTreePDA,
      merkleTree: merkleTree.publicKey,
      treeConfig,
      bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
      compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      logWrapper: SPL_NOOP_PROGRAM_ID,
      systemProgram: web3.SystemProgram.programId,
    })
    .instruction();

  return { instruction: ix, merkleTree, universityTreePDA, treeConfig };
}

interface CreateCollectionParams {
  universityAuthority: PublicKey;
  superAdmin: PublicKey;
  coreCollection: Keypair; // New keypair for collection
  name: string;
  uri: string;
}

export async function buildCreateCollectionInstruction(params: CreateCollectionParams) {
  const program = getProgram();
  const { universityAuthority, superAdmin, coreCollection, name, uri } = params;

  const [globalConfigPDA] = deriveGlobalConfigPDA(superAdmin);
  const [universityPDA] = deriveUniversityPDA(universityAuthority);
  const [universityCollectionPDA] = deriveUniversityCollectionPDA(universityPDA);

  const ix = await program.methods
    .createCoreCollectionV2Cpi({
      name,
      uri,
    })
    .accounts({
      universityAuthority,
      globalConfig: globalConfigPDA,
      university: universityPDA,
      universityCollection: universityCollectionPDA,
      coreCollection: coreCollection.publicKey,
      mplCoreProgram: MPL_CORE_PROGRAM_ID,
      systemProgram: web3.SystemProgram.programId,
    })
    .instruction();

  return { instruction: ix, coreCollection, universityCollectionPDA };
}

interface MintCertificateParams {
  universityAuthority: PublicKey;
  superAdmin: PublicKey;
  merkleTree: PublicKey;
  coreCollection: PublicKey;
  recipient: PublicKey;
  name: string;
  uri: string;
  attachCollection: boolean;
}

interface BurnCertificateParams {
  universityAuthority: PublicKey;
  superAdmin: PublicKey;
  merkleTree: PublicKey;
  coreCollection: PublicKey;
  leafOwner: PublicKey;
  leafDelegate: PublicKey | null;
  // Merkle proof data (from DAS getAssetProof)
  root: number[];
  dataHash: number[];
  creatorHash: number[];
  nonce: bigint;
  index: number;
  // Optional Bubblegum v2 extras
  assetDataHash: number[] | null;
  flags: number | null;
  // Reason for burning/revoking
  reason: string;
  attachCollection: boolean;
  // Merkle proof nodes (remaining accounts)
  proofNodes: PublicKey[];
}

export async function buildMintCertificateInstruction(params: MintCertificateParams) {
  const program = getProgram();
  const {
    universityAuthority,
    superAdmin,
    merkleTree,
    coreCollection,
    recipient,
    name,
    uri,
    attachCollection,
  } = params;

  const [globalConfigPDA] = deriveGlobalConfigPDA(superAdmin);
  const [universityPDA] = deriveUniversityPDA(universityAuthority);
  const [universityCollectionPDA] = deriveUniversityCollectionPDA(universityPDA);
  const [universityTreePDA] = deriveUniversityTreePDA(merkleTree);
  const [treeConfig] = deriveTreeConfig(merkleTree);

  // Use hardcoded MPL Core CPI signer (as specified in the Solana program at mint_certificate_v2.rs:145)
  // TODO: This should be derived dynamically, but the program currently has it hardcoded
  const mplCoreCpiSigner = new PublicKey('CbNY3JiXdXNE9tPNEk1aRZVEkWdj2v7kfJLNQwZZgpXk');

  const ix = await program.methods
    .mintCertificateV2({
      name,
      uri,
      recipient,
      attachCollection,
    })
    .accounts({
      universityAuthority,
      globalConfig: globalConfigPDA,
      university: universityPDA,
      universityCollection: universityCollectionPDA,
      universityTree: universityTreePDA,
      merkleTree,
      treeConfig,
      coreCollection,
      mplCoreProgram: MPL_CORE_PROGRAM_ID,
      mplCoreCpiSigner,
      recipient,
      bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
      compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      logWrapper: SPL_NOOP_PROGRAM_ID,
      systemProgram: web3.SystemProgram.programId,
    })
    .instruction();

  return { instruction: ix };
}

export async function buildBurnCertificateInstruction(params: BurnCertificateParams) {
  const program = getProgram();
  const {
    universityAuthority,
    superAdmin,
    merkleTree,
    coreCollection,
    leafOwner,
    root,
    dataHash,
    creatorHash,
    nonce,
    index,
    assetDataHash,
    flags,
    reason,
    proofNodes,
  } = params;

  const [globalConfigPDA] = deriveGlobalConfigPDA(superAdmin);
  const [universityPDA] = deriveUniversityPDA(universityAuthority);
  const [universityCollectionPDA] = deriveUniversityCollectionPDA(universityPDA);
  const [universityTreePDA] = deriveUniversityTreePDA(merkleTree);
  const [treeConfig] = deriveTreeConfig(merkleTree);

  // Use hardcoded MPL Core CPI signer (as specified in the Solana program)
  const mplCoreCpiSigner = new PublicKey('CbNY3JiXdXNE9tPNEk1aRZVEkWdj2v7kfJLNQwZZgpXk');

  // Convert arrays to proper format for Anchor
  const rootArray = Array.from(root);
  const dataHashArray = Array.from(dataHash);
  const creatorHashArray = Array.from(creatorHash);
  const assetDataHashArray = assetDataHash ? Array.from(assetDataHash) : null;

  // Convert nonce from bigint to BN for Anchor
  const nonceBN = new BN(nonce.toString());

  const ix = await program.methods
    .burnCertificateV2({
      root: rootArray,
      dataHash: dataHashArray,
      creatorHash: creatorHashArray,
      nonce: nonceBN,
      index,
      assetDataHash: assetDataHashArray,
      flags: flags !== null ? flags : null,
      reason,
    })
    .accounts({
      universityAuthority,
      globalConfig: globalConfigPDA,
      university: universityPDA,
      universityCollection: universityCollectionPDA,
      universityTree: universityTreePDA,
      merkleTree,
      treeConfig,
      coreCollection,
      mplCoreProgram: MPL_CORE_PROGRAM_ID,
      mplCoreCpiSigner,
      leafOwner,
      bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
      compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      logWrapper: SPL_NOOP_PROGRAM_ID,
      systemProgram: web3.SystemProgram.programId,
    })
    .remainingAccounts(
      proofNodes.map((pubkey) => ({
        pubkey,
        isSigner: false,
        isWritable: false,
      }))
    )
    .instruction();

  return { instruction: ix };
}

