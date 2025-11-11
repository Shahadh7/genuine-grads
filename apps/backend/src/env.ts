import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables
config();

const envSchema = z.object({
  // Node
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000'),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  
  // Databases
  SHARED_DATABASE_URL: z.string().url('SHARED_DATABASE_URL must be a valid URL'),
  UNIVERSITY_DATABASE_URL: z.string().url('UNIVERSITY_DATABASE_URL must be a valid URL'),
  
  // Solana & Helius
  SOLANA_NETWORK: z.enum(['mainnet-beta', 'devnet', 'testnet']).default('devnet'),
  SOLANA_RPC_URL: z.string().url('SOLANA_RPC_URL must be a valid URL'),
  SOLANA_PROGRAM_ID: z.string().min(32, 'SOLANA_PROGRAM_ID is required (program address)'),
  SOLANA_SUPER_ADMIN_PUBKEY: z.string().min(32, 'SOLANA_SUPER_ADMIN_PUBKEY is required (wallet public key)'),
  HELIUS_API_KEY: z.string().min(1, 'HELIUS_API_KEY is required'),
  HELIUS_WEBHOOK_SECRET: z.string().optional(),
  
  // Encryption
  MASTER_ENCRYPTION_KEY: z.string().length(64, 'MASTER_ENCRYPTION_KEY must be 64 hex characters'),
  
  // Pinata (IPFS)
  PINATA_JWT: z.string().min(1, 'PINATA_JWT is required'),
  PINATA_GATEWAY: z.string().url('PINATA_GATEWAY must be a valid URL').default('https://gateway.pinata.cloud'),
  
  // Redis
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),
  
  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  
  // Super Admin
  SUPER_ADMIN_EMAIL: z.string().email('SUPER_ADMIN_EMAIL must be a valid email'),
  SUPER_ADMIN_PASSWORD: z.string().min(8, 'SUPER_ADMIN_PASSWORD must be at least 8 characters'),
  
  // ZKP (optional)
  ZKP_GENERATOR_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = parsed.data;

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

