import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { WalletSendTransactionError } from '@solana/wallet-adapter-base';
import genuinegradsIdl from '@/idl/genuinegrads.json';
import { waitForHeliusTransaction } from './helius';

const PROGRAM_ID = new PublicKey(genuinegradsIdl.address);

const REGISTER_UNIVERSITY_DISCRIMINATOR = Buffer.from([116, 154, 134, 139, 74, 110, 176, 157]);
const APPROVE_UNIVERSITY_DISCRIMINATOR = Buffer.from([54, 211, 87, 78, 137, 236, 70, 12]);
const DEACTIVATE_UNIVERSITY_DISCRIMINATOR = Buffer.from([51, 22, 119, 224, 46, 24, 242, 87]);
const INITIALIZE_CONFIG_DISCRIMINATOR = Buffer.from([208, 127, 21, 1, 194, 190, 196, 70]);

const GLOBAL_CONFIG_SEED = Buffer.from('global-config');
const UNIVERSITY_SEED = Buffer.from('university');
const UNIVERSITY_NAME_MAX = 64;
const UNIVERSITY_URI_MAX = 60;
const UNIVERSITY_ACCOUNT_SPACE =
  8 + // account discriminator
  32 + // admin pubkey
  32 + // authority pubkey
  4 + UNIVERSITY_NAME_MAX + // name string prefix + data
  4 + UNIVERSITY_URI_MAX + // metadata URI string prefix + data
  1 + // is_active
  8 + // created_at
  1; // bump
const MIN_BALANCE_BUFFER_LAMPORTS = 200_000; // ~0.0002 SOL safety buffer
const CONFIRMATION_POLL_INTERVAL_MS = 1_000;
const CONFIRMATION_TIMEOUT_MS = 60_000;

export type TransactionConfirmationSource =
  | 'helius'
  | 'rpc'
  | 'rpc-status'
  | 'wallet-status';

interface SendTransactionResult {
  signature: string;
  confirmationSource: TransactionConfirmationSource;
}

function getEnvSuperAdmin(): PublicKey {
  const key = process.env.NEXT_PUBLIC_SUPER_ADMIN_PUBKEY;
  if (!key) {
    throw new Error('NEXT_PUBLIC_SUPER_ADMIN_PUBKEY is not configured');
  }
  return new PublicKey(key);
}

function getRpcUrl(): string {
  return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
}

export function createConnection(): Connection {
  return new Connection(getRpcUrl(), 'confirmed');
}

function encodeString(value: string): Buffer {
  const bytes = Buffer.from(value, 'utf8');
  const length = Buffer.alloc(4);
  length.writeUInt32LE(bytes.length, 0);
  return Buffer.concat([length, bytes]);
}

function encodeOptionalString(value?: string | null): Buffer {
  if (!value) {
    return Buffer.from([0]);
  }
  return Buffer.concat([Buffer.from([1]), encodeString(value)]);
}

function deriveGlobalConfigPda(superAdmin: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([GLOBAL_CONFIG_SEED, superAdmin.toBuffer()], PROGRAM_ID);
}

function deriveUniversityPda(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([UNIVERSITY_SEED, authority.toBuffer()], PROGRAM_ID);
}

async function waitForRpcSignatureConfirmation(
  connection: Connection,
  signature: string,
  commitment: 'processed' | 'confirmed' | 'finalized' = 'confirmed',
  timeoutMs: number = CONFIRMATION_TIMEOUT_MS
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const status = await connection.getSignatureStatuses([signature]);
    const confirmationStatus = status.value?.[0];

    if (!confirmationStatus) {
      await new Promise((resolve) => setTimeout(resolve, CONFIRMATION_POLL_INTERVAL_MS));
      continue;
    }

    if (confirmationStatus.err) {
      throw new Error(
        `Transaction ${signature} failed: ${JSON.stringify(confirmationStatus.err)}`
      );
    }

    const isConfirmed =
      (commitment === 'processed' && confirmationStatus.confirmationStatus !== null) ||
      (commitment === 'confirmed' &&
        (confirmationStatus.confirmationStatus === 'confirmed' ||
          confirmationStatus.confirmationStatus === 'finalized')) ||
      (commitment === 'finalized' && confirmationStatus.confirmationStatus === 'finalized');

    if (isConfirmed) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, CONFIRMATION_POLL_INTERVAL_MS));
  }

  throw new Error(`Timed out waiting for transaction ${signature} confirmation via RPC`);
}

async function sendTransaction(
  connection: Connection,
  wallet: WalletContextState,
  transaction: Transaction
): Promise<SendTransactionResult> {
  if (!wallet.publicKey || !wallet.sendTransaction) {
    throw new Error('Wallet not connected');
  }

  transaction.feePayer = wallet.publicKey;

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;

  let signature: string | null = null;

  try {
    signature = await wallet.sendTransaction(transaction, connection, {
      skipPreflight: false,
    });

    try {
      await waitForHeliusTransaction(signature, { commitment: 'confirmed' });
      return { signature, confirmationSource: 'helius' };
    } catch (wsError) {
      console.warn('Helius confirmation failed, falling back to RPC confirm', wsError);
    }

    try {
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'confirmed'
      );
      return { signature, confirmationSource: 'rpc' };
    } catch (rpcError) {
      console.warn('RPC confirmTransaction failed, polling signature status', rpcError);

      try {
        await waitForRpcSignatureConfirmation(connection, signature, 'confirmed');
        return { signature, confirmationSource: 'rpc-status' };
      } catch (statusError) {
        console.warn('RPC signature polling failed', statusError);
        throw rpcError;
      }
    }
  } catch (error) {
    console.error('sendTransaction failed', error);

    if (error instanceof WalletSendTransactionError) {
      const walletError = error as WalletSendTransactionError & {
        logs?: string[];
        cause?: unknown;
        signature?: string;
      };

      const fallbackSignature =
        walletError.signature ||
        (walletError.cause && typeof walletError.cause === 'object'
          ? (walletError.cause as { signature?: string }).signature
          : undefined);

      if (fallbackSignature) {
        console.warn(
          'Wallet reported an error but provided a signature; attempting confirmation with Helius'
        );

        try {
          await waitForHeliusTransaction(fallbackSignature, { commitment: 'confirmed' });
          return { signature: fallbackSignature, confirmationSource: 'helius' };
        } catch (wsError) {
          console.warn(
            'Helius confirmation failed for fallback signature, checking via RPC statuses',
            wsError
          );
        }

        try {
          await waitForRpcSignatureConfirmation(connection, fallbackSignature, 'confirmed');
          return { signature: fallbackSignature, confirmationSource: 'wallet-status' };
        } catch (statusError) {
          console.warn('RPC status polling failed for fallback signature', statusError);
        }
      }
    }

    let message = 'Failed to send transaction';

    if (error instanceof WalletSendTransactionError) {
      const walletError = error as WalletSendTransactionError & {
        logs?: string[];
        cause?: unknown;
      };

      if (walletError.logs && walletError.logs.length > 0) {
        message = `Transaction simulation failed:\n${walletError.logs.join('\n')}`;
      } else if (error.message) {
        message = error.message;
        if (
          (!message || message.trim().length === 0 || message === 'Unexpected error') &&
          walletError.cause instanceof Error &&
          walletError.cause.message
        ) {
          message = walletError.cause.message;
        }
      }
    } else if (error instanceof Error && error.message) {
      message = error.message;
    }

    if (!message || message.trim().length === 0 || message === 'Unexpected error') {
      message =
        'Wallet failed to send the transaction. Please check your wallet popup or browser console for detailed logs.';
    }

    if (signature) {
      // Provide the signature so upstream handlers can determine if the tx actually landed.
      throw Object.assign(new Error(message), { signature });
    }

    throw new Error(message);
  }
}

export interface RegisterUniversityParams {
  wallet: WalletContextState;
  connection: Connection;
  name: string;
  metadataUri?: string | null;
}

export async function registerUniversityOnChain({
  wallet,
  connection,
  name,
  metadataUri,
}: RegisterUniversityParams): Promise<{
  signature: string;
  universityPda: string;
  confirmationSource: TransactionConfirmationSource;
}> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const trimmedName = name.trim();
  if (trimmedName.length < 3 || trimmedName.length > UNIVERSITY_NAME_MAX) {
    throw new Error(`University name must be between 3 and ${UNIVERSITY_NAME_MAX} characters.`);
  }

  if (metadataUri && metadataUri.length > UNIVERSITY_URI_MAX) {
    throw new Error(`Website / metadata URL must be ${UNIVERSITY_URI_MAX} characters or fewer.`);
  }

  const superAdmin = getEnvSuperAdmin();
  const [globalConfigPda] = deriveGlobalConfigPda(superAdmin);
  const [universityPda] = deriveUniversityPda(wallet.publicKey);

  const globalConfigAccount = await connection.getAccountInfo(globalConfigPda);
  if (!globalConfigAccount) {
    throw new Error(
      'Platform global configuration is not initialized on-chain. Please contact the platform super admin.'
    );
  }

  const existingUniversityAccount = await connection.getAccountInfo(universityPda);
  if (existingUniversityAccount) {
    throw new Error(
      'This wallet is already registered on-chain. If you need to re-register, please contact the platform administrator.'
    );
  }

  const requiredLamports =
    (await connection.getMinimumBalanceForRentExemption(UNIVERSITY_ACCOUNT_SPACE)) +
    MIN_BALANCE_BUFFER_LAMPORTS;
  const currentBalance = await connection.getBalance(wallet.publicKey);
  if (currentBalance < requiredLamports) {
    throw new Error(
      'Insufficient SOL balance to cover account rent. Please top up the wallet with at least 0.01 SOL and try again.'
    );
  }

  const data = Buffer.concat([
    REGISTER_UNIVERSITY_DISCRIMINATOR,
    encodeString(trimmedName),
    encodeOptionalString(metadataUri ?? null),
  ]);

  const keys = [
    { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
    { pubkey: globalConfigPda, isSigner: false, isWritable: false },
    { pubkey: universityPda, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data,
  });

  const transaction = new Transaction().add(instruction);
  const { signature, confirmationSource } = await sendTransaction(connection, wallet, transaction);

  return { signature, universityPda: universityPda.toBase58(), confirmationSource };
}

export interface ApproveUniversityParams {
  wallet: WalletContextState;
  connection: Connection;
  universityAuthority: PublicKey;
}

async function ensureGlobalConfig(
  connection: Connection,
  wallet: WalletContextState,
  superAdmin: PublicKey
): Promise<{ globalConfigPda: PublicKey; wasInitialized: boolean }> {
  const [globalConfigPda] = deriveGlobalConfigPda(superAdmin);
  const accountInfo = await connection.getAccountInfo(globalConfigPda);

  if (accountInfo) {
    return { globalConfigPda, wasInitialized: false };
  }

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: superAdmin, isSigner: true, isWritable: true },
      { pubkey: globalConfigPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: INITIALIZE_CONFIG_DISCRIMINATOR,
  });

  const transaction = new Transaction().add(instruction);
  await sendTransaction(connection, wallet, transaction);

  return { globalConfigPda, wasInitialized: true };
}

export async function approveUniversityOnChain({
  wallet,
  connection,
  universityAuthority,
}: ApproveUniversityParams): Promise<{
  signature: string;
  universityPda: string;
  confirmationSource: TransactionConfirmationSource;
}> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const superAdmin = getEnvSuperAdmin();
  if (wallet.publicKey.toBase58() !== superAdmin.toBase58()) {
    throw new Error('Connected wallet is not the configured super admin');
  }

  const { globalConfigPda } = await ensureGlobalConfig(connection, wallet, superAdmin);
  const [universityPda] = deriveUniversityPda(universityAuthority);

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: superAdmin, isSigner: true, isWritable: false },
      { pubkey: globalConfigPda, isSigner: false, isWritable: true },
      { pubkey: universityAuthority, isSigner: false, isWritable: false },
      { pubkey: universityPda, isSigner: false, isWritable: true },
    ],
    data: APPROVE_UNIVERSITY_DISCRIMINATOR,
  });

  const transaction = new Transaction().add(instruction);
  const { signature, confirmationSource } = await sendTransaction(connection, wallet, transaction);

  return { signature, universityPda: universityPda.toBase58(), confirmationSource };
}

export interface DeactivateUniversityParams {
  wallet: WalletContextState;
  connection: Connection;
  universityAuthority: PublicKey;
}

export async function deactivateUniversityOnChain({
  wallet,
  connection,
  universityAuthority,
}: DeactivateUniversityParams): Promise<{
  signature: string;
  universityPda: string;
  confirmationSource: TransactionConfirmationSource;
}> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  const superAdmin = getEnvSuperAdmin();
  if (wallet.publicKey.toBase58() !== superAdmin.toBase58()) {
    throw new Error('Connected wallet is not the configured super admin');
  }

  const { globalConfigPda } = await ensureGlobalConfig(connection, wallet, superAdmin);
  const [universityPda] = deriveUniversityPda(universityAuthority);

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: superAdmin, isSigner: true, isWritable: false },
      { pubkey: globalConfigPda, isSigner: false, isWritable: true },
      { pubkey: universityAuthority, isSigner: false, isWritable: false },
      { pubkey: universityPda, isSigner: false, isWritable: true },
    ],
    data: DEACTIVATE_UNIVERSITY_DISCRIMINATOR,
  });

  const transaction = new Transaction().add(instruction);
  const { signature, confirmationSource } = await sendTransaction(connection, wallet, transaction);

  return { signature, universityPda: universityPda.toBase58(), confirmationSource };
}
