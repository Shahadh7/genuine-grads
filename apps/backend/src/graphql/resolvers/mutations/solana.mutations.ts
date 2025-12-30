import { GraphQLError } from 'graphql';
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js';
import { sharedDb } from '../../../db/shared.client.js';
import { GraphQLContext, requireSuperAdmin, requireUniversityAdmin } from '../../context.js';
import { logger } from '../../../utils/logger.js';
import { notificationService } from '../../../services/notification/notification.service.js';
import {
  buildRegisterUniversityInstruction,
  buildApproveUniversityInstruction,
  buildCreateTreeInstruction,
  buildCreateCollectionInstruction,
  buildMintCertificateInstruction,
  buildBurnCertificateInstruction,
  connection,
  GENUINEGRADS_PROGRAM_ID,
  MPL_CORE_PROGRAM_ID,
  BUBBLEGUM_PROGRAM_ID,
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
  deriveGlobalConfigPDA,
  deriveUniversityPDA,
  deriveUniversityCollectionPDA,
  deriveUniversityTreePDA,
  deriveTreeConfig,
  fetchUniversityCollection,
  fetchUniversityTree,
} from '../../../services/solana/program.service.js';
import { getAssetWithProof } from '../../../services/helius/helius.client.js';
import bs58 from 'bs58';
import { prepareTransaction, prepareVersionedTransaction, submitSignedTransaction, createAddressLookupTableInstructions, fetchAddressLookupTable } from '../../../services/solana/transaction.service.js';
import { getConcurrentMerkleTreeAccountSize } from '@solana/spl-account-compression';
import { uploadMetadataToIPFS, buildCertificateMetadata, uploadFileToIPFS, buildCollectionMetadata } from '../../../services/ipfs/pinata.service.js';
import { getUniversityDb } from '../../../db/university.client.js';
import { generateCertificatePNG } from '../../../services/certificate/generator.service.js';
import { getCNFTDetailsFromTransaction } from '../../../services/solana/cnft.service.js';

export interface PreparedTransactionStep {
  operationType: string;
  transaction: string;
  blockhash: string;
  lastValidBlockHeight: number;
  message: string;
  metadata?: Record<string, any>;
  accountsCreated?: Array<{ name: string; address: string }>;
}

const DEFAULT_TREE_MAX_DEPTH = 14;
const DEFAULT_TREE_MAX_BUFFER = 64;
const DEFAULT_TREE_PUBLIC_ACCESS = true;

type UniversityRecord = NonNullable<Awaited<ReturnType<typeof sharedDb.university.findUnique>>>;

function deriveDefaultCollectionMetadata(university: Pick<UniversityRecord, 'name' | 'id' | 'websiteUrl'>) {
  // MPL Core collections support longer names, but we limit to 80 chars for safety
  const fullName = `${university.name} Certificates`;
  const name = fullName.length > 80
    ? fullName.substring(0, 77) + '...'
    : fullName;
  
  const baseUri = university.websiteUrl?.trim();
  const uri = baseUri && baseUri.length > 0
    ? baseUri
    : `https://metadata.genuinegrads.com/collections/${university.id}`;

  return { name, uri };
}

async function verifyUniversityTreeOnChain(merkleTreeAddress?: string | null) {
  if (!merkleTreeAddress) {
    return false;
  }

  try {
    const treeAccount = await fetchUniversityTree(new PublicKey(merkleTreeAddress));
    return !!treeAccount;
  } catch {
    return false;
  }
}

async function verifyUniversityCollectionOnChain(universityPda?: string | null) {
  if (!universityPda) {
    return false;
  }

  try {
    const account = await fetchUniversityCollection(new PublicKey(universityPda));
    return !!account;
  } catch {
    return false;
  }
}

/**
 * Prepare transaction for university registration on-chain
 */
async function prepareRegisterUniversityTransaction(
  _: any,
  {
    universityId,
    superAdminPubkey,
  }: {
    universityId: string;
    superAdminPubkey: string;
  },
  context: GraphQLContext
) {
  requireSuperAdmin(context);

  const university = await sharedDb.university.findUnique({
    where: { id: universityId },
  });

  if (!university) {
    throw new GraphQLError('University not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  if (!university.walletAddress) {
    throw new GraphQLError('University wallet address not set', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  try {
    const superAdmin = new PublicKey(superAdminPubkey);
    const universityAuthority = new PublicKey(university.walletAddress);

    const { instruction, universityPDA } = await buildRegisterUniversityInstruction({
      universityAuthority,
      superAdmin,
      name: university.name,
      metadataUri: university.websiteUrl ?? undefined,
    });

    const { transaction, blockhash, lastValidBlockHeight } = await prepareTransaction({
      instructions: [instruction],
      feePayer: universityAuthority,
    });

    // Note: DB will be updated after blockchain confirmation
    logger.info(
      {
        universityId,
        universityPDA: universityPDA.toBase58(),
      },
      'Prepared register university transaction'
    );

    return {
      operationType: 'register_university',
      transaction,
      blockhash,
      lastValidBlockHeight,
      message: 'Register university on-chain',
      metadata: {
        universityId,
        universityPda: universityPDA.toBase58(),
        superAdminPubkey, // Include for later DB update
      },
      accountsCreated: [
        {
          name: 'University PDA',
          address: universityPDA.toBase58(),
        },
      ],
    };
  } catch (error: any) {
    logger.error({ error: error.message, universityId }, 'Failed to prepare register university transaction');
    throw new GraphQLError(`Failed to prepare transaction: ${error.message}`, {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}

/**
 * Submit signed transaction for university registration
 */
async function submitRegisterUniversityTransaction(
  _: any,
  {
    universityId,
    signedTransaction,
    superAdminPubkey,
    universityPda,
  }: {
    universityId: string;
    signedTransaction: string;
    superAdminPubkey: string;
    universityPda: string;
  },
  context: GraphQLContext
) {
  requireSuperAdmin(context);

  try {
    const result = await submitSignedTransaction({
      signedTransaction,
    });

    if (!result.success) {
      throw new GraphQLError(`Transaction failed: ${result.error}`, {
        extensions: { code: 'TRANSACTION_FAILED' },
      });
    }

    // Update database only after blockchain transaction succeeds
    await sharedDb.university.update({
      where: { id: universityId },
      data: {
        superAdminPubkey,
        universityPDA: universityPda,
      },
    });

    logger.info(
      {
        universityId,
        signature: result.signature,
      },
      'University registered on-chain successfully and DB updated'
    );

    return {
      success: true,
      signature: result.signature,
      message: 'University registered on-chain',
    };
  } catch (error: any) {
    logger.error({ error: error.message, universityId }, 'Failed to submit register university transaction');
    throw error;
  }
}

/**
 * Prepare approve university transaction
 */
async function prepareApproveUniversityTransaction(
  _: any,
  {
    universityId,
  }: {
    universityId: string;
  },
  context: GraphQLContext
) {
  requireSuperAdmin(context);

  const university = await sharedDb.university.findUnique({
    where: { id: universityId },
  });

  if (!university) {
    throw new GraphQLError('University not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  if (!university.superAdminPubkey) {
    throw new GraphQLError('Super admin pubkey not set for university', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  try {
    const superAdmin = new PublicKey(university.superAdminPubkey);
    const universityAuthority = new PublicKey(university.walletAddress);

    const { instruction } = await buildApproveUniversityInstruction({
      superAdmin,
      universityAuthority,
    });

    const { transaction, blockhash, lastValidBlockHeight } = await prepareTransaction({
      instructions: [instruction],
      feePayer: superAdmin,
    });

    logger.info({ universityId }, 'Prepared approve university transaction');

    return {
      operationType: 'approve_university',
      transaction,
      blockhash,
      lastValidBlockHeight,
      message: 'Approve university on-chain',
      metadata: {
        universityId,
      },
    };
  } catch (error: any) {
    logger.error({ error: error.message, universityId }, 'Failed to prepare approve university transaction');
    throw new GraphQLError(`Failed to prepare transaction: ${error.message}`, {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}

interface CreateTreePreparationArgs {
  university: UniversityRecord;
  superAdmin: PublicKey;
  universityAuthority: PublicKey;
  maxDepth: number;
  maxBufferSize: number;
  isPublic: boolean;
  persistDb: boolean;
}

interface CollectionPreparationArgs {
  university: UniversityRecord;
  superAdmin: PublicKey;
  universityAuthority: PublicKey;
  name: string;
  uri: string;
  persistDb: boolean;
}

async function prepareCreateTreeStepInternal(args: CreateTreePreparationArgs): Promise<PreparedTransactionStep> {
  const { university, superAdmin, universityAuthority, maxDepth, maxBufferSize, isPublic, persistDb } = args;

  const merkleTree = Keypair.generate();

  logger.info(
    {
      universityId: university.id,
      maxDepth,
      maxBufferSize,
      isPublic,
    },
    'Preparing Merkle tree transaction'
  );

  const treeSpace = getConcurrentMerkleTreeAccountSize(maxDepth, maxBufferSize);
  const treeRent = await connection.getMinimumBalanceForRentExemption(treeSpace);

  const createMerkleTreeIx = SystemProgram.createAccount({
    fromPubkey: universityAuthority,
    newAccountPubkey: merkleTree.publicKey,
    lamports: treeRent,
    space: treeSpace,
    programId: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  });

  const { instruction, universityTreePDA, treeConfig } = await buildCreateTreeInstruction({
    universityAuthority,
    superAdmin,
    merkleTree,
    maxDepth,
    maxBufferSize,
    isPublic,
  });

  const prepared = await prepareTransaction({
    instructions: [createMerkleTreeIx, instruction],
    feePayer: universityAuthority,
    signers: [merkleTree],
  });

  if (persistDb) {
    await sharedDb.university.update({
      where: { id: university!.id },
      data: {
        merkleTreeAddress: merkleTree.publicKey.toBase58(),
        treeConfigAddress: treeConfig.toBase58(),
      },
    });
  }

  const metadata = {
    universityId: university!.id,
    merkleTreeAddress: merkleTree.publicKey.toBase58(),
    treeConfigAddress: treeConfig.toBase58(),
    universityTreePda: universityTreePDA.toBase58(),
    maxDepth,
    maxBufferSize,
    isPublic,
    rentLamports: treeRent,
    treeAccountSpace: treeSpace,
  };

  logger.info(
    {
      universityId: university!.id,
      merkleTree: metadata.merkleTreeAddress,
      treeConfig: metadata.treeConfigAddress,
      persisted: persistDb,
    },
    'Prepared create tree transaction'
  );

  return {
    operationType: 'create_tree',
    transaction: prepared.transaction,
    blockhash: prepared.blockhash,
    lastValidBlockHeight: prepared.lastValidBlockHeight,
    message: `Create Merkle tree (depth: ${maxDepth}, buffer: ${maxBufferSize})`,
    accountsCreated: [
      { name: 'Merkle Tree', address: metadata.merkleTreeAddress },
      { name: 'Tree Config', address: metadata.treeConfigAddress },
      { name: 'University Tree PDA', address: metadata.universityTreePda },
    ],
    metadata,
  };
}

async function prepareCreateCollectionStepInternal(args: CollectionPreparationArgs): Promise<PreparedTransactionStep> {
  const { university, superAdmin, universityAuthority, name, uri, persistDb } = args;

  const coreCollection = Keypair.generate();
  const { instruction, universityCollectionPDA } = await buildCreateCollectionInstruction({
    universityAuthority,
    superAdmin,
    coreCollection,
    name,
    uri,
  });

  const prepared = await prepareTransaction({
    instructions: [instruction],
    feePayer: universityAuthority,
    signers: [coreCollection],
  });

  if (persistDb) {
    await sharedDb.university.update({
      where: { id: university!.id },
      data: {
        collectionAddress: coreCollection.publicKey.toBase58(),
        collectionPDA: universityCollectionPDA.toBase58(),
      },
    });
  }

  const metadata = {
    universityId: university!.id,
    collectionAddress: coreCollection.publicKey.toBase58(),
    collectionPda: universityCollectionPDA.toBase58(),
    name,
    uri,
  };

  logger.info(
    {
      universityId: university!.id,
      collection: metadata.collectionAddress,
      collectionPda: metadata.collectionPda,
      persisted: persistDb,
    },
    'Prepared create collection transaction'
  );

  return {
    operationType: 'create_collection',
    transaction: prepared.transaction,
    blockhash: prepared.blockhash,
    lastValidBlockHeight: prepared.lastValidBlockHeight,
    message: `Create Core collection: ${name}`,
    accountsCreated: [
      { name: 'Core Collection', address: metadata.collectionAddress },
      { name: 'University Collection PDA', address: metadata.collectionPda },
    ],
    metadata,
  };
}

async function collectPrerequisiteTransactions(university: UniversityRecord): Promise<PreparedTransactionStep[]> {
  if (!university.superAdminPubkey) {
    throw new GraphQLError('Super admin key not linked to university', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  if (!university.walletAddress) {
    throw new GraphQLError('University wallet address not set', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  const superAdmin = new PublicKey(university.superAdminPubkey);
  const universityAuthority = new PublicKey(university.walletAddress);

  const prerequisites: PreparedTransactionStep[] = [];

  const treeReady = await verifyUniversityTreeOnChain(university.merkleTreeAddress);
  if (!treeReady) {
    const treeStep = await prepareCreateTreeStepInternal({
      university,
      superAdmin,
      universityAuthority,
      maxDepth: DEFAULT_TREE_MAX_DEPTH,
      maxBufferSize: DEFAULT_TREE_MAX_BUFFER,
      isPublic: DEFAULT_TREE_PUBLIC_ACCESS,
      persistDb: false,
    });
    prerequisites.push(treeStep);
  }

  const collectionReady = await verifyUniversityCollectionOnChain(university.universityPDA);
  if (!collectionReady) {
    const { name, uri } = deriveDefaultCollectionMetadata(university);
    const collectionStep = await prepareCreateCollectionStepInternal({
      university,
      superAdmin,
      universityAuthority,
      name,
      uri,
      persistDb: false,
    });
    prerequisites.push(collectionStep);
  }

  return prerequisites;
}

interface MintPreparationArgs {
  university: UniversityRecord;
  certificate: any;
  universityDb: Awaited<ReturnType<typeof getUniversityDb>>;
  superAdmin: PublicKey;
  universityAuthority: PublicKey;
}

async function prepareMintCertificateStepInternal(args: MintPreparationArgs): Promise<PreparedTransactionStep> {
  const { university, certificate, universityDb, superAdmin, universityAuthority } = args;

  const merkleTreeAddress = university.merkleTreeAddress;
  const collectionAddress = university.collectionAddress;

  if (!merkleTreeAddress || !collectionAddress) {
    throw new GraphQLError('University minting setup incomplete', {
      extensions: { code: 'MINT_SETUP_INCOMPLETE' },
    });
  }

  let metadataUri = certificate.ipfsMetadataUri;
  let imageUrl: string | undefined;

  // Check if certificate already has valid IPFS metadata from issuance
  if (metadataUri && !metadataUri.includes('placeholder')) {
    logger.info(
      { certificateId: certificate.id, existingMetadataUri: metadataUri },
      'Using existing IPFS metadata from certificate issuance'
    );

    // Extract image URL from existing metadata if available
    if (certificate.metadataJson) {
      try {
        const existingMetadata = typeof certificate.metadataJson === 'string'
          ? JSON.parse(certificate.metadataJson)
          : certificate.metadataJson;
        imageUrl = existingMetadata.image;
        logger.info({ certificateId: certificate.id, imageUrl }, 'Using existing certificate image');
      } catch (e) {
        logger.warn({ certificateId: certificate.id }, 'Failed to parse existing metadata JSON');
      }
    }
  } else {
    // No existing metadata - generate certificate image using fallback (old flow)
    logger.info({ certificateId: certificate.id }, 'No existing IPFS metadata, generating certificate image');

    // Generate certificate PNG image from template (fallback to hardcoded for old certificates)
    const certificatePNG = await generateCertificatePNG({
      studentName: certificate.student.fullName || 'Unknown Student',
      certificateTitle: certificate.badgeTitle,
      universityName: university.name,
      degreeType: certificate.degreeType || 'Certificate',
      issueDate: new Date().toISOString().split('T')[0],
      description: certificate.description || '',
      certificateNumber: certificate.certificateNumber,
      program: certificate.enrollment?.course?.name,
      gpa: certificate.enrollment?.gpa,
    }, { type: 'classic' });

    logger.info({ certificateId: certificate.id, imageSize: certificatePNG.length }, 'Certificate image generated');

    // Upload certificate image to IPFS
    const imageFileName = `certificate-${certificate.certificateNumber}.png`;
    imageUrl = await uploadFileToIPFS(certificatePNG, imageFileName);

    logger.info({ certificateId: certificate.id, imageUrl }, 'Certificate image uploaded to IPFS');

    // Build certificate metadata with image
    const metadata = buildCertificateMetadata({
      certificateName: certificate.badgeTitle,
      description: certificate.description || '',
      universityName: university.name,
      studentName: certificate.student.fullName,
      studentWallet: certificate.student.walletAddress,
      certificateNumber: certificate.certificateNumber,
      degreeType: certificate.degreeType || undefined,
      program: certificate.enrollment?.course?.name,
      imageUrl,
    });

    // Upload metadata to IPFS
    metadataUri = await uploadMetadataToIPFS(metadata);

    logger.info({ certificateId: certificate.id, metadataUri }, 'Certificate metadata uploaded to IPFS');

    // Update certificate record with IPFS URIs
    await universityDb.certificate.update({
      where: { id: certificate.id },
      data: {
        ipfsMetadataUri: metadataUri,
        metadataJson: JSON.stringify(metadata),
      },
    });
  }

  const superAdminPk = superAdmin;
  const universityAuthorityPk = universityAuthority;
  const merkleTree = new PublicKey(merkleTreeAddress);
  const coreCollection = new PublicKey(collectionAddress);
  const recipient = new PublicKey(certificate.student.walletAddress);

  // Metaplex Bubblegum requires name to be max 32 characters
  // Truncate if necessary while preserving readability
  const truncatedName = certificate.badgeTitle.length > 32
    ? certificate.badgeTitle.substring(0, 29) + '...'
    : certificate.badgeTitle;

  const { instruction } = await buildMintCertificateInstruction({
    universityAuthority: universityAuthorityPk,
    superAdmin: superAdminPk,
    merkleTree,
    coreCollection,
    recipient,
    name: truncatedName,
    uri: metadataUri,
    attachCollection: true,
  });

  const prepared = await prepareTransaction({
    instructions: [instruction],
    feePayer: universityAuthorityPk,
  });

  logger.info(
    {
      certificateId: certificate.id,
      recipient: recipient.toBase58(),
      metadataUri,
      imageUrl,
    },
    'Prepared mint certificate transaction'
  );

  return {
    operationType: 'mint_certificate',
    transaction: prepared.transaction,
    blockhash: prepared.blockhash,
    lastValidBlockHeight: prepared.lastValidBlockHeight,
    message: `Mint certificate: ${certificate.badgeTitle}`,
    metadata: {
      universityId: university.id,
      certificateId: certificate.id,
      metadataUri,
      imageUrl,
      certificateNumber: certificate.certificateNumber,
      studentName: certificate.student.fullName,
      studentWallet: certificate.student.walletAddress,
      merkleTreeAddress: merkleTree.toBase58(),
      collectionAddress: coreCollection.toBase58(),
    },
  };
}

/**
 * Prepare create tree transaction
 */
async function prepareCreateTreeTransaction(
  _: any,
  {
    universityId,
    maxDepth,
    maxBufferSize,
    isPublic,
  }: {
    universityId: string;
    maxDepth: number;
    maxBufferSize: number;
    isPublic: boolean;
  },
  context: GraphQLContext
) {
  requireUniversityAdmin(context);

  const university = await sharedDb.university.findUnique({
    where: { id: universityId },
  });

  if (!university) {
    throw new GraphQLError('University not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  if (university.status !== 'APPROVED') {
    throw new GraphQLError('University must be approved before creating tree', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  if (!university.superAdminPubkey) {
    throw new GraphQLError('Super admin pubkey not set', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  try {
    const superAdmin = new PublicKey(university.superAdminPubkey);
    const universityAuthority = new PublicKey(university.walletAddress);

    const prepared = await prepareCreateTreeStepInternal({
      university,
      superAdmin,
      universityAuthority,
      maxDepth,
      maxBufferSize,
      isPublic,
      persistDb: false, // DB will be updated after blockchain confirmation
    });

    return {
      operationType: prepared.operationType,
      transaction: prepared.transaction,
      blockhash: prepared.blockhash,
      lastValidBlockHeight: prepared.lastValidBlockHeight,
      message: prepared.message,
      accountsCreated: prepared.accountsCreated,
      metadata: prepared.metadata,
    };
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack, universityId }, 'Failed to prepare create tree transaction');
    throw new GraphQLError(`Failed to prepare transaction: ${error.message}`, {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}

/**
 * Prepare create collection transaction
 */
async function prepareCreateCollectionTransaction(
  _: any,
  {
    universityId,
    name,
    uri,
  }: {
    universityId: string;
    name: string;
    uri: string;
  },
  context: GraphQLContext
) {
  requireUniversityAdmin(context);

  const university = await sharedDb.university.findUnique({
    where: { id: universityId },
  });

  if (!university) {
    throw new GraphQLError('University not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  if (university.status !== 'APPROVED') {
    throw new GraphQLError('University must be approved before creating collection', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  if (!university.superAdminPubkey) {
    throw new GraphQLError('Super admin pubkey not set', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  try {
    const superAdmin = new PublicKey(university.superAdminPubkey);
    const universityAuthority = new PublicKey(university.walletAddress);

    const prepared = await prepareCreateCollectionStepInternal({
      university,
      superAdmin,
      universityAuthority,
      name,
      uri,
      persistDb: false, // DB will be updated after blockchain confirmation
    });

    return {
      operationType: prepared.operationType,
      transaction: prepared.transaction,
      blockhash: prepared.blockhash,
      lastValidBlockHeight: prepared.lastValidBlockHeight,
      message: prepared.message,
      accountsCreated: prepared.accountsCreated,
      metadata: prepared.metadata,
    };
  } catch (error: any) {
    logger.error({ error: error.message, universityId }, 'Failed to prepare create collection transaction');
    throw new GraphQLError(`Failed to prepare transaction: ${error.message}`, {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}

/**
 * Prepare mint certificate workflow
 */
async function prepareMintCertificateWorkflow(
  _: any,
  {
    certificateId,
  }: {
    certificateId: string;
  },
  context: GraphQLContext
) {
  requireUniversityAdmin(context);

  const universityId = context.admin!.universityId;

  if (!universityId) {
    throw new GraphQLError('University admin not associated with university', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  const university = await sharedDb.university.findUnique({
    where: { id: universityId },
  });

  if (!university) {
    throw new GraphQLError('University not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  if (university.status !== 'APPROVED') {
    throw new GraphQLError('University must be approved before minting certificates', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  if (!university.databaseUrl) {
    throw new GraphQLError('University database not provisioned', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }

  const universityDb = await getUniversityDb(university.databaseUrl);
  const certificate = await universityDb.certificate.findUnique({
    where: { id: certificateId },
    include: {
      student: true,
      enrollment: {
        include: {
          course: true,
        },
      },
    },
  });

  if (!certificate) {
    throw new GraphQLError('Certificate not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  if (certificate.status === 'MINTED') {
    throw new GraphQLError('Certificate already minted', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  if (!certificate.student.walletAddress) {
    throw new GraphQLError('Student wallet address not set', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  const prerequisites = await collectPrerequisiteTransactions(university);

  let mintStep: PreparedTransactionStep | null = null;
  if (prerequisites.length === 0) {
    const superAdmin = new PublicKey(university.superAdminPubkey!);
    const universityAuthority = new PublicKey(university.walletAddress);
    mintStep = await prepareMintCertificateStepInternal({
      university,
      certificate,
      universityDb,
      superAdmin,
      universityAuthority,
    });
  }

  return {
    prerequisites,
    mint: mintStep,
  };
}

/**
 * Prepare mint certificate transaction
 */
async function prepareMintCertificateTransaction(
  _: any,
  {
    certificateId,
  }: {
    certificateId: string;
  },
  context: GraphQLContext
) {
  requireUniversityAdmin(context);

  const universityId = context.admin!.universityId;
  
  if (!universityId) {
    throw new GraphQLError('University admin not associated with university', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  const university = await sharedDb.university.findUnique({
    where: { id: universityId },
  });

  if (!university) {
    throw new GraphQLError('University not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  if (!university.merkleTreeAddress || !university.collectionAddress || !university.superAdminPubkey) {
    throw new GraphQLError('University tree and collection must be created first', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  // Get certificate from university database
  const universityDb = await getUniversityDb(university.databaseUrl!);
  
  const certificate = await universityDb.certificate.findUnique({
    where: { id: certificateId },
    include: {
      student: true,
      enrollment: {
        include: {
          course: true,
        },
      },
    },
  });

  if (!certificate) {
    throw new GraphQLError('Certificate not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  if (certificate.status === 'MINTED') {
    throw new GraphQLError('Certificate already minted', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  if (!certificate.student.walletAddress) {
    throw new GraphQLError('Student wallet address not set', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  try {
    const workflow = await prepareMintCertificateWorkflow(_, { certificateId }, context);

    if (workflow.prerequisites.length > 0 || !workflow.mint) {
      throw new GraphQLError('University minting setup required before minting certificate', {
        extensions: {
          code: 'SETUP_REQUIRED',
          prerequisites: workflow.prerequisites,
        },
      });
    }

    return {
      operationType: workflow.mint.operationType ?? 'mint_certificate',
      transaction: workflow.mint.transaction,
      blockhash: workflow.mint.blockhash,
      lastValidBlockHeight: workflow.mint.lastValidBlockHeight,
      message: workflow.mint.message,
      metadata: workflow.mint.metadata,
      accountsCreated: workflow.mint.accountsCreated,
    };
  } catch (error: any) {
    logger.error({ error: error.message, certificateId }, 'Failed to prepare mint certificate transaction');
    throw new GraphQLError(`Failed to prepare transaction: ${error.message}`, {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}

/**
 * Prepare burn certificate transaction
 */
async function prepareBurnCertificateTransaction(
  _: any,
  {
    certificateId,
    reason,
  }: {
    certificateId: string;
    reason: string;
  },
  context: GraphQLContext
) {
  requireUniversityAdmin(context);

  const universityId = context.admin!.universityId;

  if (!universityId) {
    throw new GraphQLError('University admin not associated with university', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  // Validate reason
  if (!reason || reason.trim().length === 0) {
    throw new GraphQLError('Revocation reason is required', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  if (reason.length > 120) {
    throw new GraphQLError('Revocation reason must be 120 characters or less', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  const university = await sharedDb.university.findUnique({
    where: { id: universityId },
  });

  if (!university) {
    throw new GraphQLError('University not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  if (!university.merkleTreeAddress || !university.collectionAddress || !university.superAdminPubkey) {
    throw new GraphQLError('University blockchain setup incomplete', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  // Get certificate from university database
  const universityDb = await getUniversityDb(university.databaseUrl!);

  const certificate = await universityDb.certificate.findUnique({
    where: { id: certificateId },
    include: {
      student: true,
    },
  });

  if (!certificate) {
    throw new GraphQLError('Certificate not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  if (certificate.status !== 'MINTED') {
    throw new GraphQLError('Certificate must be minted before it can be burned', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  if (certificate.revoked) {
    throw new GraphQLError('Certificate is already revoked', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  if (!certificate.mintAddress) {
    throw new GraphQLError('Certificate mint address not found', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  try {
    // Get asset data and proof from Helius DAS API
    // Use truncateCanopy to reduce proof size based on tree's canopy depth
    const assetData = await getAssetWithProof(certificate.mintAddress, { truncateCanopy: true });

    if (!assetData) {
      throw new GraphQLError('Failed to retrieve asset proof from blockchain. The certificate may not be indexed yet.', {
        extensions: { code: 'BLOCKCHAIN_ERROR' },
      });
    }

    const { asset, proof, dataHash, creatorHash, leafOwner, leafDelegate } = assetData;

    // Convert base58 strings to byte arrays (Helius DAS API returns base58)
    const rootBytes: number[] = Array.from(bs58.decode(proof.root));
    const dataHashBytes: number[] = Array.from(bs58.decode(dataHash));
    const creatorHashBytes: number[] = Array.from(bs58.decode(creatorHash));
    const proofNodes = proof.proof.map((p: string) => new PublicKey(p));

    // Get compression data for nonce and index
    const compression = asset.compression;
    const nonce = BigInt(compression.leaf_id);
    const index = compression.leaf_id;

    // Get asset_data_hash if available (Bubblegum v2) - also base58 encoded
    const assetDataHash = compression.asset_data_hash
      ? Array.from(bs58.decode(compression.asset_data_hash))
      : null;

    const superAdmin = new PublicKey(university.superAdminPubkey);
    const universityAuthority = new PublicKey(university.walletAddress);
    const merkleTree = new PublicKey(university.merkleTreeAddress);
    const coreCollection = new PublicKey(university.collectionAddress);

    const { instruction } = await buildBurnCertificateInstruction({
      universityAuthority,
      superAdmin,
      merkleTree,
      coreCollection,
      leafOwner: new PublicKey(leafOwner),
      leafDelegate: leafDelegate ? new PublicKey(leafDelegate) : null,
      root: rootBytes,
      dataHash: dataHashBytes,
      creatorHash: creatorHashBytes,
      nonce,
      index,
      assetDataHash,
      flags: null,
      reason: reason.trim(),
      attachCollection: true,
      proofNodes,
    });

    // Use versioned transaction for burn operations as the Merkle proof
    // can make the transaction exceed the legacy 1232 byte limit
    // If university has an Address Lookup Table, use it to compress the transaction
    let addressLookupTableAccounts: any[] = [];

    if (university.addressLookupTable) {
      try {
        const altAccount = await fetchAddressLookupTable(new PublicKey(university.addressLookupTable));
        if (altAccount) {
          addressLookupTableAccounts = [altAccount];
          logger.info(
            {
              universityId: university.id,
              altAddress: university.addressLookupTable,
              addressCount: altAccount.state.addresses.length,
            },
            'Using Address Lookup Table for burn transaction'
          );
        } else {
          logger.warn(
            { altAddress: university.addressLookupTable },
            'ALT not found on-chain, proceeding without it'
          );
        }
      } catch (altError: any) {
        logger.warn(
          { error: altError.message, altAddress: university.addressLookupTable },
          'Failed to fetch ALT, proceeding without it'
        );
      }
    }

    const prepared = await prepareVersionedTransaction({
      instructions: [instruction],
      feePayer: universityAuthority,
      addressLookupTableAccounts,
    });

    logger.info(
      {
        certificateId,
        mintAddress: certificate.mintAddress,
        leafOwner,
        proofLength: proof.proof.length,
        usingALT: addressLookupTableAccounts.length > 0,
      },
      'Prepared burn certificate versioned transaction'
    );

    return {
      operationType: 'burn_certificate',
      transaction: prepared.transaction,
      blockhash: prepared.blockhash,
      lastValidBlockHeight: prepared.lastValidBlockHeight,
      message: `Burn certificate: ${certificate.badgeTitle}`,
      metadata: {
        universityId: university.id,
        certificateId: certificate.id,
        certificateNumber: certificate.certificateNumber,
        mintAddress: certificate.mintAddress,
        studentName: certificate.student.fullName,
        studentWallet: certificate.student.walletAddress,
        merkleTreeAddress: merkleTree.toBase58(),
        collectionAddress: coreCollection.toBase58(),
        reason: reason.trim(),
      },
    };
  } catch (error: any) {
    logger.error({ error: error.message, certificateId }, 'Failed to prepare burn certificate transaction');
    throw new GraphQLError(`Failed to prepare burn transaction: ${error.message}`, {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}

/**
 * Prepare Address Lookup Table creation for reducing transaction sizes
 * This is a one-time setup per university that creates an ALT containing
 * all static program addresses used in burn operations
 */
async function prepareCreateAddressLookupTable(
  _: any,
  __: any,
  context: GraphQLContext
) {
  requireUniversityAdmin(context);

  const universityId = context.admin!.universityId;

  if (!universityId) {
    throw new GraphQLError('University admin not associated with university', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  const university = await sharedDb.university.findUnique({
    where: { id: universityId },
  });

  if (!university) {
    throw new GraphQLError('University not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  if (!university.merkleTreeAddress || !university.collectionAddress || !university.superAdminPubkey) {
    throw new GraphQLError('University blockchain setup incomplete. Tree and collection must be created first.', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  // Check if ALT already exists
  if (university.addressLookupTable) {
    throw new GraphQLError('Address Lookup Table already exists for this university', {
      extensions: { code: 'BAD_USER_INPUT', existingAlt: university.addressLookupTable },
    });
  }

  try {
    const universityAuthority = new PublicKey(university.walletAddress);
    const superAdmin = new PublicKey(university.superAdminPubkey);
    const merkleTree = new PublicKey(university.merkleTreeAddress);
    const coreCollection = new PublicKey(university.collectionAddress);

    // Derive all PDAs that are used in burn operations
    const [globalConfigPDA] = deriveGlobalConfigPDA(superAdmin);
    const [universityPDA] = deriveUniversityPDA(universityAuthority);
    const [universityCollectionPDA] = deriveUniversityCollectionPDA(universityPDA);
    const [universityTreePDA] = deriveUniversityTreePDA(merkleTree);
    const [treeConfig] = deriveTreeConfig(merkleTree);

    // MPL Core CPI signer (hardcoded in the program)
    const mplCoreCpiSigner = new PublicKey('CbNY3JiXdXNE9tPNEk1aRZVEkWdj2v7kfJLNQwZZgpXk');

    // Collect all static addresses used in burn transactions
    // These are addresses that don't change between burn operations
    const staticAddresses: PublicKey[] = [
      // Program IDs
      GENUINEGRADS_PROGRAM_ID,
      MPL_CORE_PROGRAM_ID,
      BUBBLEGUM_PROGRAM_ID,
      SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      SPL_NOOP_PROGRAM_ID,
      SystemProgram.programId,
      // PDAs and static accounts
      globalConfigPDA,
      universityPDA,
      universityCollectionPDA,
      universityTreePDA,
      merkleTree,
      treeConfig,
      coreCollection,
      mplCoreCpiSigner,
      universityAuthority,
    ];

    // Create ALT instructions
    const { lookupTableAddress, instructions } = await createAddressLookupTableInstructions({
      authority: universityAuthority,
      addresses: staticAddresses,
    });

    // Prepare the transaction
    const prepared = await prepareTransaction({
      instructions,
      feePayer: universityAuthority,
    });

    logger.info(
      {
        universityId,
        lookupTableAddress: lookupTableAddress.toBase58(),
        addressCount: staticAddresses.length,
      },
      'Prepared create Address Lookup Table transaction'
    );

    return {
      operationType: 'create_address_lookup_table',
      transaction: prepared.transaction,
      blockhash: prepared.blockhash,
      lastValidBlockHeight: prepared.lastValidBlockHeight,
      message: `Create Address Lookup Table with ${staticAddresses.length} addresses`,
      metadata: {
        universityId,
        lookupTableAddress: lookupTableAddress.toBase58(),
        addressCount: staticAddresses.length,
      },
      accountsCreated: [
        {
          name: 'Address Lookup Table',
          address: lookupTableAddress.toBase58(),
        },
      ],
    };
  } catch (error: any) {
    logger.error({ error: error.message, universityId }, 'Failed to prepare create ALT transaction');
    throw new GraphQLError(`Failed to prepare ALT transaction: ${error.message}`, {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}

/**
 * Prepare burn certificate workflow - automatically creates ALT if needed
 * Returns prerequisites (ALT creation) and burn transaction
 */
async function prepareBurnCertificateWorkflow(
  _: any,
  {
    certificateId,
    reason,
  }: {
    certificateId: string;
    reason: string;
  },
  context: GraphQLContext
) {
  requireUniversityAdmin(context);

  const universityId = context.admin!.universityId;

  if (!universityId) {
    throw new GraphQLError('University admin not associated with university', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  // Validate reason
  if (!reason || reason.trim().length === 0) {
    throw new GraphQLError('Revocation reason is required', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  if (reason.length > 120) {
    throw new GraphQLError('Revocation reason must be 120 characters or less', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  const university = await sharedDb.university.findUnique({
    where: { id: universityId },
  });

  if (!university) {
    throw new GraphQLError('University not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  if (!university.merkleTreeAddress || !university.collectionAddress || !university.superAdminPubkey) {
    throw new GraphQLError('University blockchain setup incomplete', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  // Get certificate from university database
  const universityDb = await getUniversityDb(university.databaseUrl!);

  const certificate = await universityDb.certificate.findUnique({
    where: { id: certificateId },
    include: {
      student: true,
    },
  });

  if (!certificate) {
    throw new GraphQLError('Certificate not found', {
      extensions: { code: 'NOT_FOUND' },
    });
  }

  if (certificate.status !== 'MINTED') {
    throw new GraphQLError('Certificate must be minted before it can be burned', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  if (certificate.revoked) {
    throw new GraphQLError('Certificate is already revoked', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  if (!certificate.mintAddress) {
    throw new GraphQLError('Certificate mint address not found', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }

  const prerequisites: PreparedTransactionStep[] = [];

  try {
    const universityAuthority = new PublicKey(university.walletAddress);
    const superAdmin = new PublicKey(university.superAdminPubkey);
    const merkleTree = new PublicKey(university.merkleTreeAddress);
    const coreCollection = new PublicKey(university.collectionAddress);

    // Check if ALT exists, if not create it as a prerequisite
    let altAddress = university.addressLookupTable;

    if (!altAddress) {
      // Create ALT as prerequisite
      logger.info({ universityId }, 'No ALT found, creating as prerequisite for burn');

      // Derive all PDAs that are used in burn operations
      const [globalConfigPDA] = deriveGlobalConfigPDA(superAdmin);
      const [universityPDA] = deriveUniversityPDA(universityAuthority);
      const [universityCollectionPDA] = deriveUniversityCollectionPDA(universityPDA);
      const [universityTreePDA] = deriveUniversityTreePDA(merkleTree);
      const [treeConfig] = deriveTreeConfig(merkleTree);

      // MPL Core CPI signer (hardcoded in the program)
      const mplCoreCpiSigner = new PublicKey('CbNY3JiXdXNE9tPNEk1aRZVEkWdj2v7kfJLNQwZZgpXk');

      // Collect all static addresses used in burn transactions
      const staticAddresses: PublicKey[] = [
        // Program IDs
        GENUINEGRADS_PROGRAM_ID,
        MPL_CORE_PROGRAM_ID,
        BUBBLEGUM_PROGRAM_ID,
        SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        SPL_NOOP_PROGRAM_ID,
        SystemProgram.programId,
        // PDAs and static accounts
        globalConfigPDA,
        universityPDA,
        universityCollectionPDA,
        universityTreePDA,
        merkleTree,
        treeConfig,
        coreCollection,
        mplCoreCpiSigner,
        universityAuthority,
      ];

      // Create ALT instructions
      const { lookupTableAddress, instructions } = await createAddressLookupTableInstructions({
        authority: universityAuthority,
        addresses: staticAddresses,
      });

      // Prepare the ALT creation transaction
      const altPrepared = await prepareTransaction({
        instructions,
        feePayer: universityAuthority,
      });

      prerequisites.push({
        operationType: 'create_address_lookup_table',
        transaction: altPrepared.transaction,
        blockhash: altPrepared.blockhash,
        lastValidBlockHeight: altPrepared.lastValidBlockHeight,
        message: `Create Address Lookup Table with ${staticAddresses.length} addresses (required for burn)`,
        metadata: {
          universityId,
          lookupTableAddress: lookupTableAddress.toBase58(),
          addressCount: staticAddresses.length,
        },
        accountsCreated: [
          {
            name: 'Address Lookup Table',
            address: lookupTableAddress.toBase58(),
          },
        ],
      });

      // Set the ALT address for use in burn transaction
      // Note: The burn transaction will be prepared but won't work until ALT is created
      // The frontend should execute prerequisites first, then fetch the burn transaction again
      altAddress = lookupTableAddress.toBase58();

      logger.info(
        {
          universityId,
          lookupTableAddress: altAddress,
        },
        'Prepared ALT creation as prerequisite for burn'
      );
    }

    // Get asset data and proof from Helius DAS API
    const assetData = await getAssetWithProof(certificate.mintAddress, { truncateCanopy: true });

    if (!assetData) {
      throw new GraphQLError('Failed to retrieve asset proof from blockchain. The certificate may not be indexed yet.', {
        extensions: { code: 'BLOCKCHAIN_ERROR' },
      });
    }

    const { asset, proof, dataHash, creatorHash, leafOwner, leafDelegate } = assetData;

    // Convert base58 strings to byte arrays (Helius DAS API returns base58)
    const rootBytes: number[] = Array.from(bs58.decode(proof.root));
    const dataHashBytes: number[] = Array.from(bs58.decode(dataHash));
    const creatorHashBytes: number[] = Array.from(bs58.decode(creatorHash));
    const proofNodes = proof.proof.map((p: string) => new PublicKey(p));

    // Get compression data for nonce and index
    const compression = asset.compression;
    const nonce = BigInt(compression.leaf_id);
    const index = compression.leaf_id;

    // Get asset_data_hash if available (Bubblegum v2) - also base58 encoded
    const assetDataHash = compression.asset_data_hash
      ? Array.from(bs58.decode(compression.asset_data_hash))
      : null;

    const { instruction } = await buildBurnCertificateInstruction({
      universityAuthority,
      superAdmin,
      merkleTree,
      coreCollection,
      leafOwner: new PublicKey(leafOwner),
      leafDelegate: leafDelegate ? new PublicKey(leafDelegate) : null,
      root: rootBytes,
      dataHash: dataHashBytes,
      creatorHash: creatorHashBytes,
      nonce,
      index,
      assetDataHash,
      flags: null,
      reason: reason.trim(),
      attachCollection: true,
      proofNodes,
    });

    // Try to use ALT if it exists on-chain (only if no prerequisites)
    let addressLookupTableAccounts: any[] = [];

    if (prerequisites.length === 0 && altAddress) {
      try {
        const altAccount = await fetchAddressLookupTable(new PublicKey(altAddress));
        if (altAccount) {
          addressLookupTableAccounts = [altAccount];
          logger.info(
            {
              universityId: university.id,
              altAddress,
              addressCount: altAccount.state.addresses.length,
            },
            'Using existing Address Lookup Table for burn transaction'
          );
        }
      } catch (altError: any) {
        logger.warn(
          { error: altError.message, altAddress },
          'Failed to fetch ALT, proceeding without it'
        );
      }
    }

    const burnPrepared = await prepareVersionedTransaction({
      instructions: [instruction],
      feePayer: universityAuthority,
      addressLookupTableAccounts,
    });

    const burnTransaction: PreparedTransactionStep = {
      operationType: 'burn_certificate',
      transaction: burnPrepared.transaction,
      blockhash: burnPrepared.blockhash,
      lastValidBlockHeight: burnPrepared.lastValidBlockHeight,
      message: `Burn certificate: ${certificate.badgeTitle}`,
      metadata: {
        universityId: university.id,
        certificateId: certificate.id,
        certificateNumber: certificate.certificateNumber,
        mintAddress: certificate.mintAddress,
        studentName: certificate.student.fullName,
        studentWallet: certificate.student.walletAddress,
        merkleTreeAddress: merkleTree.toBase58(),
        collectionAddress: coreCollection.toBase58(),
        reason: reason.trim(),
      },
    };

    logger.info(
      {
        certificateId,
        mintAddress: certificate.mintAddress,
        leafOwner,
        proofLength: proof.proof.length,
        hasPrerequisites: prerequisites.length > 0,
        usingALT: addressLookupTableAccounts.length > 0,
      },
      'Prepared burn certificate workflow'
    );

    return {
      prerequisites,
      burn: prerequisites.length === 0 ? burnTransaction : null,
    };
  } catch (error: any) {
    logger.error({ error: error.message, certificateId }, 'Failed to prepare burn certificate workflow');
    throw new GraphQLError(`Failed to prepare burn workflow: ${error.message}`, {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}

/**
 * Submit any signed transaction and update database
 */
async function submitSignedTransactionMutation(
  _: any,
  {
    signedTransaction,
    operationType,
    metadata,
  }: {
    signedTransaction: string;
    operationType: string;
    metadata?: Record<string, any>;
  },
  context: GraphQLContext
) {
  if (!context.admin) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHORIZED' },
    });
  }

  try {
    const result = await submitSignedTransaction({
      signedTransaction,
    });

    if (!result.success) {
      throw new GraphQLError(`Transaction failed: ${result.error}`, {
        extensions: { code: 'TRANSACTION_FAILED' },
      });
    }

    // Update database based on operation type
    if (operationType === 'register_university' && metadata?.universityId) {
      await sharedDb.university.update({
        where: { id: metadata.universityId },
        data: {
          superAdminPubkey: metadata.superAdminPubkey,
          universityPDA: metadata.universityPda,
        },
      });
    } else if (operationType === 'create_tree' && metadata?.universityId) {
      await sharedDb.university.update({
        where: { id: metadata.universityId },
        data: {
          merkleTreeAddress: metadata.merkleTreeAddress,
          treeConfigAddress: metadata.treeConfigAddress,
        },
      });
    } else if (operationType === 'create_collection' && metadata?.universityId) {
      await sharedDb.university.update({
        where: { id: metadata.universityId },
        data: {
          collectionAddress: metadata.collectionAddress,
          collectionPDA: metadata.collectionPda,
        },
      });
    } else if (operationType === 'mint_certificate' && metadata?.certificateId) {
      const universityId = context.admin.universityId;
      const university = await sharedDb.university.findUnique({
        where: { id: universityId! },
      });

      if (university?.databaseUrl) {
        const universityDb = await getUniversityDb(university.databaseUrl);

        // Extract cNFT details from transaction
        const cnftDetails = metadata.merkleTreeAddress
          ? await getCNFTDetailsFromTransaction(
              result.signature,
              metadata.merkleTreeAddress,
              metadata.studentWallet
            )
          : null;

        const updateData: any = {
          status: 'MINTED',
          transactionSignature: result.signature,
        };

        // Update mintAddress and leafIndex if we successfully extracted them
        if (cnftDetails) {
          updateData.mintAddress = cnftDetails.assetId;
          updateData.leafIndex = cnftDetails.leafIndex;

          logger.info(
            {
              certificateId: metadata.certificateId,
              assetId: cnftDetails.assetId,
              leafIndex: cnftDetails.leafIndex,
            },
            'Updated certificate with cNFT details'
          );
        } else {
          logger.warn(
            {
              certificateId: metadata.certificateId,
              signature: result.signature,
            },
            'Could not extract cNFT details - mintAddress will remain in pending state'
          );
        }

        await universityDb.certificate.update({
          where: { id: metadata.certificateId },
          data: updateData,
        });

        // Update MintActivityLog with the real mintAddress if cNFT details were extracted
        if (cnftDetails && metadata.certificateNumber) {
          try {
            await sharedDb.mintActivityLog.updateMany({
              where: {
                certificateNumber: metadata.certificateNumber,
                universityId: university.id,
              },
              data: {
                mintAddress: cnftDetails.assetId,
                transactionSignature: result.signature,
                status: 'SUCCESS',
                confirmedAt: new Date(),
              },
            });
            logger.info(
              {
                certificateNumber: metadata.certificateNumber,
                assetId: cnftDetails.assetId,
              },
              'Updated MintActivityLog with real assetId'
            );
          } catch (error: any) {
            logger.error(
              { error: error.message, certificateNumber: metadata.certificateNumber },
              'Failed to update MintActivityLog'
            );
          }
        }
      }
    } else if (operationType === 'burn_certificate' && metadata?.certificateId) {
      const universityId = context.admin.universityId;
      const university = await sharedDb.university.findUnique({
        where: { id: universityId! },
      });

      if (university?.databaseUrl) {
        const universityDb = await getUniversityDb(university.databaseUrl);

        // Update certificate as revoked with transaction signature
        await universityDb.certificate.update({
          where: { id: metadata.certificateId },
          data: {
            revoked: true,
            revokedAt: new Date(),
            revocationReason: metadata.reason || 'Certificate burned on-chain',
            revocationTransactionSignature: result.signature,
          },
        });

        // Create revoked certificate index entry for audit trail
        try {
          await sharedDb.revokedCertIndex.create({
            data: {
              revokedByUniversityId: university.id,
              certificateNumber: metadata.certificateNumber,
              mintAddress: metadata.mintAddress,
              reason: metadata.reason || 'Certificate burned on-chain',
              studentWallet: metadata.studentWallet,
              transactionSignature: result.signature,
            },
          });
        } catch (indexError: any) {
          // Log but don't fail - the certificate is already revoked
          logger.warn(
            { error: indexError.message, certificateNumber: metadata.certificateNumber },
            'Failed to create revoked cert index entry (may already exist)'
          );
        }

        logger.info(
          {
            certificateId: metadata.certificateId,
            certificateNumber: metadata.certificateNumber,
            signature: result.signature,
          },
          'Certificate burned and marked as revoked'
        );
      }
    } else if (operationType === 'create_address_lookup_table' && metadata?.lookupTableAddress) {
      // Update university with ALT address
      const universityId = metadata.universityId || context.admin.universityId;

      if (universityId) {
        await sharedDb.university.update({
          where: { id: universityId },
          data: {
            addressLookupTable: metadata.lookupTableAddress,
          },
        });

        logger.info(
          {
            universityId,
            lookupTableAddress: metadata.lookupTableAddress,
            signature: result.signature,
          },
          'Address Lookup Table created and saved to university'
        );
      }
    }

    logger.info(
      {
        operationType,
        signature: result.signature,
        adminId: context.admin.id,
      },
      'Transaction submitted successfully'
    );

    return {
      success: true,
      signature: result.signature,
      message: `${operationType} completed successfully`,
    };
  } catch (error: any) {
    logger.error({ error: error.message, operationType }, 'Failed to submit transaction');
    throw error;
  }
}

/**
 * One-click create Merkle tree (returns unsigned transaction for client-side signing)
 */
async function createMerkleTree(
  _: any,
  {
    universityId,
    maxDepth,
    maxBufferSize,
    isPublic,
  }: {
    universityId: string;
    maxDepth: number;
    maxBufferSize: number;
    isPublic: boolean;
  },
  context: GraphQLContext
) {
  // Reuse the existing prepare logic
  return prepareCreateTreeTransaction(_, { universityId, maxDepth, maxBufferSize, isPublic }, context);
}

/**
 * One-click create collection (returns unsigned transaction for client-side signing)
 */
async function createCollection(
  _: any,
  {
    universityId,
    name,
    imageBase64,
    symbol,
    description,
  }: {
    universityId: string;
    name: string;
    imageBase64: string;
    symbol?: string;
    description?: string;
  },
  context: GraphQLContext
) {
  requireUniversityAdmin(context);

  logger.info({ universityId, name, symbol, description }, 'Creating collection with image upload');

  try {
    // Fetch university details
    const university = await sharedDb.university.findUnique({
      where: { id: universityId },
    });

    if (!university) {
      throw new GraphQLError('University not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    // Decode base64 image
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const imageFileName = `collection-${universityId}-${Date.now()}.png`;

    // Upload image to IPFS
    logger.info({ fileName: imageFileName }, 'Uploading collection image to IPFS');
    const imageUrl = await uploadFileToIPFS(imageBuffer, imageFileName);

    // Build collection metadata
    const metadata = buildCollectionMetadata({
      collectionName: name,
      universityName: university.name,
      imageUrl,
      websiteUrl: university.websiteUrl || undefined,
      symbol,
      description,
    });

    // Upload metadata to IPFS
    logger.info({ metadata }, 'Uploading collection metadata to IPFS');
    const metadataUri = await uploadMetadataToIPFS(metadata);

    logger.info({ imageUrl, metadataUri }, 'Collection assets uploaded successfully');

    // Prepare collection creation transaction
    return prepareCreateCollectionTransaction(_, { universityId, name, uri: metadataUri }, context);
  } catch (error: any) {
    logger.error({ error: error.message, universityId }, 'Failed to create collection');
    throw new GraphQLError(`Failed to create collection: ${error.message}`, {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}

/**
 * Confirm transaction after client-side signing
 */
async function confirmTransaction(
  _: any,
  {
    signature,
    operationType,
    metadata,
  }: {
    signature: string;
    operationType: string;
    metadata?: Record<string, any>;
  },
  context: GraphQLContext
) {
  requireUniversityAdmin(context);

  logger.info(
    {
      signature,
      operationType,
      adminId: context.admin!.id,
    },
    'Confirming transaction'
  );

  try {
    // Wait for transaction confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      throw new GraphQLError(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`, {
        extensions: { code: 'TRANSACTION_FAILED' },
      });
    }

    // Update database based on operation type
    if (metadata) {
      if (operationType === 'register_university') {
        await sharedDb.university.update({
          where: { id: metadata.universityId },
          data: {
            superAdminPubkey: metadata.superAdminPubkey,
            universityPDA: metadata.universityPda,
          },
        });
        logger.info({ universityId: metadata.universityId }, 'Updated university with registration details');
      } else if (operationType === 'create_tree') {
        await sharedDb.university.update({
          where: { id: metadata.universityId },
          data: {
            merkleTreeAddress: metadata.merkleTreeAddress,
            treeConfigAddress: metadata.treeConfigAddress,
          },
        });
        logger.info({ universityId: metadata.universityId }, 'Updated university with tree addresses');
      } else if (operationType === 'create_collection') {
        await sharedDb.university.update({
          where: { id: metadata.universityId },
          data: {
            collectionAddress: metadata.collectionAddress,
            collectionPDA: metadata.collectionPda,
          },
        });
        logger.info({ universityId: metadata.universityId }, 'Updated university with collection addresses');
      } else if (operationType === 'mint_certificate') {
        // Update certificate status in university database
        // First, get university ID from context or fetch certificate
        let universityId = metadata.universityId || context.admin?.universityId;

        if (!universityId) {
          throw new GraphQLError('University ID not found in metadata or context', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }

        const university = await sharedDb.university.findUnique({
          where: { id: universityId },
        });

        if (university?.databaseUrl) {
          const uniDb = await getUniversityDb(university.databaseUrl);

          // Extract cNFT details from transaction
          const cnftDetails = metadata.merkleTreeAddress
            ? await getCNFTDetailsFromTransaction(
                signature,
                metadata.merkleTreeAddress,
                metadata.studentWallet
              )
            : null;

          const updateData: any = {
            status: 'MINTED',
            transactionSignature: signature,
            merkleTreeAddress: metadata.merkleTreeAddress,
          };

          // Update mintAddress and leafIndex if we successfully extracted them
          if (cnftDetails) {
            updateData.mintAddress = cnftDetails.assetId;
            updateData.leafIndex = cnftDetails.leafIndex;

            logger.info(
              {
                certificateId: metadata.certificateId,
                assetId: cnftDetails.assetId,
                leafIndex: cnftDetails.leafIndex,
              },
              'Updated certificate with cNFT details'
            );
          } else {
            logger.warn(
              {
                certificateId: metadata.certificateId,
                signature,
              },
              'Could not extract cNFT details - mintAddress will remain in pending state'
            );
          }

          const updatedCertificate = await uniDb.certificate.update({
            where: { id: metadata.certificateId },
            data: updateData,
            include: { student: { select: { id: true, email: true } } },
          });
          logger.info({ certificateId: metadata.certificateId }, 'Updated certificate status to MINTED');

          // Send notification to student about minted certificate
          try {
            await notificationService.createStudentNotificationFromTemplate(
              updatedCertificate.studentId,
              'CERTIFICATE_MINTED',
              {
                badgeTitle: updatedCertificate.badgeTitle,
                universityName: university.name,
                certificateNumber: updatedCertificate.certificateNumber,
                certificateId: updatedCertificate.id,
              },
              uniDb
            );
          } catch (notifError) {
            logger.warn({ error: notifError, studentId: updatedCertificate.studentId }, 'Failed to send minting notification to student');
          }

          // Update MintActivityLog with the real mintAddress if cNFT details were extracted
          if (cnftDetails && metadata.certificateNumber) {
            try {
              await sharedDb.mintActivityLog.updateMany({
                where: {
                  certificateNumber: metadata.certificateNumber,
                  universityId: metadata.universityId,
                },
                data: {
                  mintAddress: cnftDetails.assetId,
                  transactionSignature: signature,
                  status: 'SUCCESS',
                  confirmedAt: new Date(),
                },
              });
              logger.info(
                {
                  certificateNumber: metadata.certificateNumber,
                  assetId: cnftDetails.assetId,
                },
                'Updated MintActivityLog with real assetId'
              );
            } catch (error: any) {
              logger.error(
                { error: error.message, certificateNumber: metadata.certificateNumber },
                'Failed to update MintActivityLog'
              );
            }
          }
        } else {
          logger.error({ universityId: metadata.universityId }, 'University database URL not found');
        }
      }
    }

    logger.info(
      {
        signature,
        operationType,
        adminId: context.admin!.id,
      },
      'Transaction confirmed successfully'
    );

    return {
      success: true,
      signature,
      message: `${operationType} completed successfully`,
    };
  } catch (error: any) {
    logger.error({ error: error.message, signature, operationType }, 'Failed to confirm transaction');
    throw new GraphQLError(`Failed to confirm transaction: ${error.message}`, {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}

/**
 * Mint certificate (returns unsigned transaction for client-side signing)
 */
async function mintCertificate(
  _: any,
  {
    certificateId,
  }: {
    certificateId: string;
    attachCollection?: boolean;
  },
  context: GraphQLContext
) {
  return prepareMintCertificateTransaction(_, { certificateId }, context);
}

/**
 * Upload image to IPFS (helper mutation for frontend)
 */
async function uploadImageToIPFS(
  _: any,
  {
    imageBase64,
    fileName,
  }: {
    imageBase64: string;
    fileName: string;
  },
  context: GraphQLContext
) {
  requireUniversityAdmin(context);

  logger.info({ fileName }, 'Uploading image to IPFS');

  try {
    // Decode base64 image
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    // Upload to IPFS
    const imageUrl = await uploadFileToIPFS(imageBuffer, fileName);

    // Extract IPFS hash from URL
    const ipfsHash = imageUrl.split('/ipfs/')[1] || '';

    logger.info({ imageUrl, ipfsHash }, 'Image uploaded successfully');

    return {
      success: true,
      imageUrl,
      ipfsHash,
    };
  } catch (error: any) {
    logger.error({ error: error.message, fileName }, 'Failed to upload image');
    throw new GraphQLError(`Failed to upload image: ${error.message}`, {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}

export const solanaMutations = {
  prepareRegisterUniversityTransaction,
  submitRegisterUniversityTransaction,
  prepareApproveUniversityTransaction,
  prepareCreateTreeTransaction,
  prepareCreateCollectionTransaction,
  prepareMintCertificateTransaction,
  prepareMintCertificateWorkflow,
  prepareBurnCertificateTransaction,
  prepareBurnCertificateWorkflow,
  prepareCreateAddressLookupTable,
  submitSignedTransaction: submitSignedTransactionMutation,
  // New one-click mutations
  createMerkleTree,
  createCollection,
  confirmTransaction,
  mintCertificate,
  uploadImageToIPFS,
};

