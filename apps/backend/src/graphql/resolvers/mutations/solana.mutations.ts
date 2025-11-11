import { GraphQLError } from 'graphql';
import { PublicKey, Keypair } from '@solana/web3.js';
import { sharedDb } from '../../../db/shared.client.js';
import { GraphQLContext, requireSuperAdmin, requireUniversityAdmin } from '../../context.js';
import { logger } from '../../../utils/logger.js';
import { 
  buildRegisterUniversityInstruction,
  buildApproveUniversityInstruction,
  buildDeactivateUniversityInstruction,
  buildCreateTreeInstruction,
  buildCreateCollectionInstruction,
  buildMintCertificateInstruction,
  deriveUniversityPDA,
  deriveUniversityCollectionPDA,
  deriveUniversityTreePDA,
  deriveTreeConfig,
} from '../../../services/solana/program.service.js';
import { prepareTransaction, submitSignedTransaction } from '../../../services/solana/transaction.service.js';
import { uploadMetadataToIPFS, buildCertificateMetadata } from '../../../services/ipfs/pinata.service.js';
import { getUniversityDb } from '../../../db/university.client.js';

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
      metadataUri: university.websiteUrl,
    });

    const { transaction, blockhash, lastValidBlockHeight } = await prepareTransaction({
      instructions: [instruction],
      feePayer: universityAuthority,
    });

    // Save super admin pubkey for later use
    await sharedDb.university.update({
      where: { id: universityId },
      data: {
        superAdminPubkey,
        universityPDA: universityPDA.toBase58(),
      },
    });

    logger.info(
      {
        universityId,
        universityPDA: universityPDA.toBase58(),
      },
      'Prepared register university transaction'
    );

    return {
      transaction,
      blockhash,
      lastValidBlockHeight,
      message: 'Register university on-chain',
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
  }: {
    universityId: string;
    signedTransaction: string;
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

    logger.info(
      {
        universityId,
        signature: result.signature,
      },
      'University registered on-chain successfully'
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
      transaction,
      blockhash,
      lastValidBlockHeight,
      message: 'Approve university on-chain',
    };
  } catch (error: any) {
    logger.error({ error: error.message, universityId }, 'Failed to prepare approve university transaction');
    throw new GraphQLError(`Failed to prepare transaction: ${error.message}`, {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
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
    
    // Generate new keypair for merkle tree
    const merkleTree = Keypair.generate();

    const { instruction, universityTreePDA, treeConfig } = await buildCreateTreeInstruction({
      universityAuthority,
      superAdmin,
      merkleTree,
      maxDepth,
      maxBufferSize,
      isPublic,
    });

    const { transaction, blockhash, lastValidBlockHeight } = await prepareTransaction({
      instructions: [instruction],
      feePayer: universityAuthority,
      signers: [merkleTree], // Tree keypair must sign
    });

    // Save tree addresses temporarily (will be confirmed after transaction)
    await sharedDb.university.update({
      where: { id: universityId },
      data: {
        merkleTreeAddress: merkleTree.publicKey.toBase58(),
        treeConfigAddress: treeConfig.toBase58(),
      },
    });

    logger.info(
      {
        universityId,
        merkleTree: merkleTree.publicKey.toBase58(),
        treeConfig: treeConfig.toBase58(),
      },
      'Prepared create tree transaction'
    );

    return {
      transaction,
      blockhash,
      lastValidBlockHeight,
      message: `Create Merkle tree (depth: ${maxDepth}, buffer: ${maxBufferSize})`,
      accountsCreated: [
        {
          name: 'Merkle Tree',
          address: merkleTree.publicKey.toBase58(),
        },
        {
          name: 'Tree Config',
          address: treeConfig.toBase58(),
        },
        {
          name: 'University Tree PDA',
          address: universityTreePDA.toBase58(),
        },
      ],
    };
  } catch (error: any) {
    logger.error({ error: error.message, universityId }, 'Failed to prepare create tree transaction');
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
    
    // Generate new keypair for collection
    const coreCollection = Keypair.generate();

    const { instruction, universityCollectionPDA } = await buildCreateCollectionInstruction({
      universityAuthority,
      superAdmin,
      coreCollection,
      name,
      uri,
    });

    const { transaction, blockhash, lastValidBlockHeight } = await prepareTransaction({
      instructions: [instruction],
      feePayer: universityAuthority,
      signers: [coreCollection], // Collection keypair must sign
    });

    // Save collection addresses
    await sharedDb.university.update({
      where: { id: universityId },
      data: {
        collectionAddress: coreCollection.publicKey.toBase58(),
        collectionPDA: universityCollectionPDA.toBase58(),
      },
    });

    logger.info(
      {
        universityId,
        collection: coreCollection.publicKey.toBase58(),
        collectionPDA: universityCollectionPDA.toBase58(),
      },
      'Prepared create collection transaction'
    );

    return {
      transaction,
      blockhash,
      lastValidBlockHeight,
      message: `Create Core collection: ${name}`,
      accountsCreated: [
        {
          name: 'Core Collection',
          address: coreCollection.publicKey.toBase58(),
        },
        {
          name: 'University Collection PDA',
          address: universityCollectionPDA.toBase58(),
        },
      ],
    };
  } catch (error: any) {
    logger.error({ error: error.message, universityId }, 'Failed to prepare create collection transaction');
    throw new GraphQLError(`Failed to prepare transaction: ${error.message}`, {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
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
    // Build and upload metadata to IPFS
    const metadata = buildCertificateMetadata({
      certificateName: certificate.badgeTitle,
      description: certificate.description || '',
      universityName: university.name,
      studentName: certificate.student.fullName,
      studentWallet: certificate.student.walletAddress,
      certificateNumber: certificate.certificateNumber,
      degreeType: certificate.degreeType || undefined,
      program: certificate.enrollment?.course.name,
    });

    const metadataUri = await uploadMetadataToIPFS(metadata);

    // Update certificate with IPFS URI
    await universityDb.certificate.update({
      where: { id: certificateId },
      data: {
        ipfsMetadataUri: metadataUri,
        metadataJson: JSON.stringify(metadata),
      },
    });

    const superAdmin = new PublicKey(university.superAdminPubkey);
    const universityAuthority = new PublicKey(university.walletAddress);
    const merkleTree = new PublicKey(university.merkleTreeAddress);
    const coreCollection = new PublicKey(university.collectionAddress);
    const recipient = new PublicKey(certificate.student.walletAddress);

    const { instruction } = await buildMintCertificateInstruction({
      universityAuthority,
      superAdmin,
      merkleTree,
      coreCollection,
      recipient,
      name: certificate.badgeTitle,
      uri: metadataUri,
      attachCollection: true,
    });

    const { transaction, blockhash, lastValidBlockHeight } = await prepareTransaction({
      instructions: [instruction],
      feePayer: universityAuthority,
    });

    logger.info(
      {
        certificateId,
        recipient: recipient.toBase58(),
        metadataUri,
      },
      'Prepared mint certificate transaction'
    );

    return {
      transaction,
      blockhash,
      lastValidBlockHeight,
      message: `Mint certificate: ${certificate.badgeTitle}`,
      metadata: {
        certificateNumber: certificate.certificateNumber,
        studentName: certificate.student.fullName,
        metadataUri,
      },
    };
  } catch (error: any) {
    logger.error({ error: error.message, certificateId }, 'Failed to prepare mint certificate transaction');
    throw new GraphQLError(`Failed to prepare transaction: ${error.message}`, {
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
    if (operationType === 'mint_certificate' && metadata?.certificateId) {
      const universityId = context.admin.universityId;
      const university = await sharedDb.university.findUnique({
        where: { id: universityId! },
      });

      if (university?.databaseUrl) {
        const universityDb = await getUniversityDb(university.databaseUrl);
        await universityDb.certificate.update({
          where: { id: metadata.certificateId },
          data: {
            status: 'MINTED',
            transactionSignature: result.signature,
          },
        });
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

export const solanaMutations = {
  prepareRegisterUniversityTransaction,
  submitRegisterUniversityTransaction,
  prepareApproveUniversityTransaction,
  prepareCreateTreeTransaction,
  prepareCreateCollectionTransaction,
  prepareMintCertificateTransaction,
  submitSignedTransaction: submitSignedTransactionMutation,
};

