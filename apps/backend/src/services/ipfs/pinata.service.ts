import axios from 'axios';
import { env } from '../../env.js';
import { logger } from '../../utils/logger.js';

/**
 * Upload JSON metadata to IPFS via Pinata using JWT authentication
 */
export async function uploadMetadataToIPFS(metadata: Record<string, any>): Promise<string> {
  try {
    logger.info({ metadata }, 'Uploading metadata to IPFS via Pinata');

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      metadata,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.PINATA_JWT}`,
        },
      }
    );

    const ipfsHash = response.data.IpfsHash;
    const uri = `${env.PINATA_GATEWAY}/ipfs/${ipfsHash}`;
    
    logger.info({ ipfsHash, uri }, 'Metadata uploaded to IPFS successfully');
    
    return uri;
  } catch (error: any) {
    logger.error({ error: error.message, metadata }, 'Failed to upload metadata to IPFS');
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
}

/**
 * Upload file to IPFS via Pinata using JWT authentication
 */
export async function uploadFileToIPFS(
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  try {
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    formData.append('file', fileBuffer, fileName);

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${env.PINATA_JWT}`,
        },
      }
    );

    const ipfsHash = response.data.IpfsHash;
    const uri = `${env.PINATA_GATEWAY}/ipfs/${ipfsHash}`;
    
    logger.info({ ipfsHash, uri, fileName }, 'File uploaded to IPFS successfully');
    
    return uri;
  } catch (error: any) {
    logger.error({ error: error.message, fileName }, 'Failed to upload file to IPFS');
    throw new Error(`File upload failed: ${error.message}`);
  }
}

/**
 * Generate certificate metadata for NFT
 */
export interface CertificateMetadata {
  name: string;
  description: string;
  image?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties: {
    category: 'certificate';
    university: string;
    studentName: string;
    studentWallet: string;
    certificateNumber: string;
    issueDate: string;
    degreeType?: string;
    program?: string;
    gpa?: number;
    achievements?: string[];
  };
}

export function buildCertificateMetadata(params: {
  certificateName: string;
  description: string;
  universityName: string;
  studentName: string;
  studentWallet: string;
  certificateNumber: string;
  degreeType?: string;
  program?: string;
  gpa?: number;
  achievements?: string[];
  imageUrl?: string;
}): CertificateMetadata {
  const {
    certificateName,
    description,
    universityName,
    studentName,
    studentWallet,
    certificateNumber,
    degreeType,
    program,
    gpa,
    achievements,
    imageUrl,
  } = params;

  const attributes: Array<{ trait_type: string; value: string | number }> = [
    { trait_type: 'University', value: universityName },
    { trait_type: 'Student', value: studentName },
    { trait_type: 'Certificate Number', value: certificateNumber },
    { trait_type: 'Issue Date', value: new Date().toISOString().split('T')[0] },
  ];

  if (degreeType) {
    attributes.push({ trait_type: 'Degree Type', value: degreeType });
  }

  if (program) {
    attributes.push({ trait_type: 'Program', value: program });
  }

  if (gpa !== undefined) {
    attributes.push({ trait_type: 'GPA', value: gpa });
  }

  return {
    name: certificateName,
    description,
    image: imageUrl,
    attributes,
    properties: {
      category: 'certificate',
      university: universityName,
      studentName,
      studentWallet,
      certificateNumber,
      issueDate: new Date().toISOString(),
      degreeType,
      program,
      gpa,
      achievements,
    },
  };
}

/**
 * Collection metadata interface for NFT collections (Metaplex Standard)
 */
export interface CollectionMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  animation_url?: string;
  external_url?: string;
  seller_fee_basis_points: number;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties: {
    files: Array<{
      uri: string;
      type: string;
    }>;
    category: 'image';
  };
}

/**
 * Build collection metadata for university certificate collection
 * Follows Metaplex NFT Metadata Standard
 */
export function buildCollectionMetadata(params: {
  collectionName: string;
  universityName: string;
  imageUrl: string;
  websiteUrl?: string;
  symbol?: string;
  description?: string;
}): CollectionMetadata {
  const { collectionName, universityName, imageUrl, websiteUrl, symbol, description } = params;

  // Use provided symbol or generate from university name (first 3-4 chars, uppercase)
  const finalSymbol = symbol?.trim() || universityName
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 4)
    .toUpperCase() || 'CERT';

  // Use provided description or generate default
  const finalDescription = description?.trim() || `Official certificate collection from ${universityName}. Verify academic credentials instantly on the Solana blockchain using compressed NFT technology.`;

  // Determine image type from URL
  const imageType = imageUrl.toLowerCase().endsWith('.png')
    ? 'image/png'
    : imageUrl.toLowerCase().endsWith('.jpg') || imageUrl.toLowerCase().endsWith('.jpeg')
    ? 'image/jpeg'
    : imageUrl.toLowerCase().endsWith('.gif')
    ? 'image/gif'
    : imageUrl.toLowerCase().endsWith('.webp')
    ? 'image/webp'
    : 'image/png';

  return {
    name: collectionName,
    symbol: finalSymbol,
    description: finalDescription,
    image: imageUrl,
    external_url: websiteUrl,
    seller_fee_basis_points: 0, // No royalties for educational certificates
    attributes: [
      {
        trait_type: 'University',
        value: universityName,
      },
      {
        trait_type: 'Collection Type',
        value: 'Academic Certificates',
      },
      {
        trait_type: 'Blockchain',
        value: 'Solana',
      },
      {
        trait_type: 'Standard',
        value: 'Metaplex Compressed NFT',
      },
    ],
    properties: {
      files: [
        {
          uri: imageUrl,
          type: imageType,
        },
      ],
      category: 'image',
    },
  };
}

