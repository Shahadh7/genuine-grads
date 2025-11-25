import { graphqlClient } from './graphql-client';

export interface UniversityPublicInfo {
  name: string;
  logoUrl?: string | null;
  isVerified: boolean;
}

export interface CertificatePublicInfo {
  badgeTitle: string;
  issueDate: string;
  degreeType?: string | null;
  studentName?: string | null;
  university: UniversityPublicInfo;
}

export interface RevocationInfo {
  isRevoked: boolean;
  revokedAt?: string | null;
  reason?: string | null;
}

export interface BlockchainProof {
  mintAddress?: string | null;
  transactionSignature?: string | null;
  merkleTreeAddress?: string | null;
  metadataUri?: string | null;
  verifiedAt?: string | null;
}

export interface CertificateVerification {
  isValid: boolean;
  status: string;
  verificationTimestamp: string;
  certificate: CertificatePublicInfo | null;
  revocationInfo: RevocationInfo | null;
  blockchainProof: BlockchainProof | null;
}

export async function verifyCertificate(params: {
  certificateNumber?: string;
  mintAddress?: string;
}): Promise<CertificateVerification> {
  const response = await graphqlClient.verifyCertificatePublic(params);

  if (response.errors?.length) {
    throw new Error(response.errors[0]?.message ?? 'Verification failed');
  }

  if (!response.data?.verifyCertificatePublic) {
    throw new Error('Certificate verification failed');
  }

  return response.data.verifyCertificatePublic;
}