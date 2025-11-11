import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { env } from '../../env.js';
import { logger } from '../../utils/logger.js';

export class SolanaService {
  private connection: Connection;
  private programId: PublicKey;
  private superAdminPubkey: PublicKey;

  constructor() {
    this.connection = new Connection(env.SOLANA_RPC_URL, 'confirmed');
    this.programId = new PublicKey(env.SOLANA_PROGRAM_ID);
    this.superAdminPubkey = new PublicKey(env.SOLANA_SUPER_ADMIN_PUBKEY);
    
    logger.info('SolanaService initialized', {
      network: env.SOLANA_NETWORK,
      programId: this.programId.toString(),
    });
  }

  /**
   * Derive PDA for GlobalConfig
   * PDA: ["global-config", super_admin]
   */
  deriveGlobalConfigPDA(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('global-config'), this.superAdminPubkey.toBuffer()],
      this.programId
    );
  }

  /**
   * Derive PDA for University
   * PDA: ["university", university_authority]
   */
  deriveUniversityPDA(universityAuthority: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('university'), universityAuthority.toBuffer()],
      this.programId
    );
  }

  async fetchUniversityAccount(universityAuthority: PublicKey): Promise<any | null> {
    try {
      const [universityPDA] = this.deriveUniversityPDA(universityAuthority);
      
      const accountInfo = await this.connection.getAccountInfo(universityPDA);
      
      if (!accountInfo) {
        return null;
      }

      // TODO: Deserialize account data using Anchor's Account deserializer
      // For now, return raw data
      logger.info('Fetched university account', {
        universityPDA: universityPDA.toString(),
        dataLength: accountInfo.data.length,
      });

      return {
        publicKey: universityPDA.toString(),
        lamports: accountInfo.lamports,
        owner: accountInfo.owner.toString(),
        // data: deserializedData, // TODO: implement deserialization
      };
    } catch (error) {
      logger.error('Failed to fetch university account', { error });
      return null;
    }
  }

  /**
   * Check if a University PDA exists on-chain
   */
  async universityExists(universityAuthority: PublicKey): Promise<boolean> {
    const [universityPDA] = this.deriveUniversityPDA(universityAuthority);
    const accountInfo = await this.connection.getAccountInfo(universityPDA);
    return accountInfo !== null;
  }

  /**
   * Get SOL balance for an address
   */
  async getBalance(address: PublicKey): Promise<number> {
    const balance = await this.connection.getBalance(address);
    return balance / LAMPORTS_PER_SOL;
  }

  async confirmSignature(signature: string): Promise<void> {
    const maxAttempts = 10;
    const delayMs = 500;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { value } = await this.connection.getSignatureStatuses([signature]);
      const status = value[0];

      if (status) {
        if (status.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
        }

        if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
          return;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    throw new Error(`Signature ${signature} not confirmed on-chain`);
  }

  // ===== Private Helper Methods =====
}

// Singleton instance
export const solanaService = new SolanaService();

