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

