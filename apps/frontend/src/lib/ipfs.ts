/**
 * IPFS utility functions for fetching data through backend proxy
 * This avoids CORS issues when fetching directly from IPFS gateways
 */

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql';
const BACKEND_URL = GRAPHQL_URL.replace('/graphql', '');

/**
 * Fetch data from IPFS through the backend proxy
 * This avoids CORS issues when fetching directly from IPFS gateways
 */
export async function fetchFromIPFS(url: string): Promise<any> {
  try {
    // Use the backend proxy to fetch IPFS data
    const proxyUrl = `${BACKEND_URL}/api/ipfs/proxy?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
    }

    // Try to parse as JSON first
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json();
    }

    // If not JSON, return as blob for images
    return await response.blob();
  } catch (error) {
    console.error('Error fetching from IPFS:', error);
    throw error;
  }
}

/**
 * Fetch metadata JSON from IPFS by hash
 */
export async function fetchMetadataByHash(hash: string): Promise<any> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/ipfs/metadata/${hash}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch metadata: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching metadata from IPFS:', error);
    throw error;
  }
}

/**
 * Get a proxied URL for an IPFS resource
 * Use this for <img> src attributes to avoid CORS issues
 */
export function getProxiedIPFSUrl(ipfsUrl: string): string {
  if (!ipfsUrl) return '';
  
  // If it's already a proxied URL, return as is
  if (ipfsUrl.includes('/api/ipfs/proxy')) {
    return ipfsUrl;
  }

  // Create a proxied URL
  return `${BACKEND_URL}/api/ipfs/proxy?url=${encodeURIComponent(ipfsUrl)}`;
}

/**
 * Extract IPFS hash from various URL formats
 */
export function extractIPFSHash(url: string): string | null {
  if (!url) return null;

  // Match ipfs:// protocol
  const ipfsProtocolMatch = url.match(/^ipfs:\/\/(.+)$/);
  if (ipfsProtocolMatch) {
    return ipfsProtocolMatch[1];
  }

  // Match /ipfs/ path in URL
  const ipfsPathMatch = url.match(/\/ipfs\/([^/?#]+)/);
  if (ipfsPathMatch) {
    return ipfsPathMatch[1];
  }

  return null;
}




