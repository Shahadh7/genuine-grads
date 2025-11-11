import {
  Transaction,
  TransactionInstruction,
  PublicKey,
  Keypair,
  Connection,
  VersionedTransaction,
  TransactionMessage,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { connection } from './program.service.js';
import { logger } from '../../utils/logger.js';

/**
 * Prepare an unsigned transaction for frontend signing
 */
export async function prepareTransaction(params: {
  instructions: TransactionInstruction[];
  feePayer: PublicKey;
  signers?: Keypair[]; // Additional signers (e.g., new accounts)
}): Promise<{
  transaction: string; // Base58 encoded serialized transaction
  message: string; // For display purposes
  blockhash: string;
  lastValidBlockHeight: number;
}> {
  const { instructions, feePayer, signers = [] } = params;

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

  // Create transaction
  const transaction = new Transaction();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = feePayer;

  // Add instructions
  for (const ix of instructions) {
    transaction.add(ix);
  }

  // Partially sign with any additional signers (e.g., new keypairs)
  if (signers.length > 0) {
    transaction.partialSign(...signers);
  }

  // Serialize transaction (unsigned by feePayer)
  const serialized = transaction.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  const transactionBase58 = bs58.encode(serialized);

  logger.info(
    {
      feePayer: feePayer.toBase58(),
      instructionsCount: instructions.length,
      signersCount: signers.length,
    },
    'Transaction prepared for signing'
  );

  return {
    transaction: transactionBase58,
    message: `Transaction with ${instructions.length} instruction(s)`,
    blockhash,
    lastValidBlockHeight,
  };
}

/**
 * Submit a signed transaction
 */
export async function submitSignedTransaction(params: {
  signedTransaction: string; // Base58 encoded signed transaction
  options?: {
    skipPreflight?: boolean;
    maxRetries?: number;
  };
}): Promise<{
  signature: string;
  success: boolean;
  error?: string;
}> {
  const { signedTransaction, options = {} } = params;

  try {
    // Decode transaction
    const transactionBuffer = bs58.decode(signedTransaction);
    const transaction = Transaction.from(transactionBuffer);

    logger.info(
      {
        signatures: transaction.signatures.length,
        instructionsCount: transaction.instructions.length,
      },
      'Submitting signed transaction'
    );

    // Send transaction
    const signature = await connection.sendRawTransaction(transactionBuffer, {
      skipPreflight: options.skipPreflight ?? false,
      maxRetries: options.maxRetries ?? 3,
    });

    logger.info({ signature }, 'Transaction submitted successfully');

    // Confirm transaction
    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash: transaction.recentBlockhash!,
        lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
      },
      'confirmed'
    );

    if (confirmation.value.err) {
      const errorMsg = JSON.stringify(confirmation.value.err);
      logger.error({ signature, error: errorMsg }, 'Transaction failed on-chain');
      return {
        signature,
        success: false,
        error: errorMsg,
      };
    }

    logger.info({ signature }, 'Transaction confirmed successfully');

    return {
      signature,
      success: true,
    };
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to submit transaction');
    return {
      signature: '',
      success: false,
      error: error.message,
    };
  }
}

/**
 * Simulate transaction before submission
 */
export async function simulateTransaction(params: {
  transaction: string; // Base58 encoded transaction
}): Promise<{
  success: boolean;
  logs?: string[];
  error?: string;
}> {
  const { transaction: transactionBase58 } = params;

  try {
    const transactionBuffer = bs58.decode(transactionBase58);
    const transaction = Transaction.from(transactionBuffer);

    const simulation = await connection.simulateTransaction(transaction);

    if (simulation.value.err) {
      return {
        success: false,
        logs: simulation.value.logs || [],
        error: JSON.stringify(simulation.value.err),
      };
    }

    return {
      success: true,
      logs: simulation.value.logs || [],
    };
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to simulate transaction');
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Build transaction with multiple instructions
 */
export async function buildTransactionWithInstructions(
  instructions: TransactionInstruction[],
  feePayer: PublicKey,
  additionalSigners: Keypair[] = []
): Promise<Transaction> {
  const { blockhash } = await connection.getLatestBlockhash('confirmed');

  const transaction = new Transaction();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = feePayer;

  for (const ix of instructions) {
    transaction.add(ix);
  }

  if (additionalSigners.length > 0) {
    transaction.partialSign(...additionalSigners);
  }

  return transaction;
}

/**
 * Get transaction status
 */
export async function getTransactionStatus(signature: string): Promise<{
  confirmed: boolean;
  finalized: boolean;
  error?: string;
  blockTime?: number;
  slot?: number;
}> {
  try {
    const status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });

    if (!status.value) {
      return {
        confirmed: false,
        finalized: false,
        error: 'Transaction not found',
      };
    }

    const transaction = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    return {
      confirmed: status.value.confirmationStatus === 'confirmed' || status.value.confirmationStatus === 'finalized',
      finalized: status.value.confirmationStatus === 'finalized',
      error: status.value.err ? JSON.stringify(status.value.err) : undefined,
      blockTime: transaction?.blockTime || undefined,
      slot: transaction?.slot,
    };
  } catch (error: any) {
    logger.error({ error: error.message, signature }, 'Failed to get transaction status');
    return {
      confirmed: false,
      finalized: false,
      error: error.message,
    };
  }
}

