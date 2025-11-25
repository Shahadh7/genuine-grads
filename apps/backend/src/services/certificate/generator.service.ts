import sharp from 'sharp';
import { logger } from '../../utils/logger.js';

export interface CertificateData {
  studentName: string;
  certificateTitle: string;
  universityName: string;
  degreeType: string;
  issueDate: string;
  description?: string;
  certificateNumber: string;
  program?: string;
  gpa?: number | string;
}

export interface CertificateTemplate {
  type: 'classic' | 'modern';
}

/**
 * Escape XML special characters for safe SVG embedding
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate SVG certificate template
 */
function generateCertificateSVG(data: CertificateData, template: CertificateTemplate): string {
  // Escape all dynamic data for XML safety
  const studentName = escapeXml(data.studentName);
  const certificateTitle = escapeXml(data.certificateTitle);
  const universityName = escapeXml(data.universityName);
  const degreeType = escapeXml(data.degreeType);
  const issueDate = escapeXml(data.issueDate);
  const certificateNumber = escapeXml(data.certificateNumber);

  if (template.type === 'classic') {
    return `
      <svg width="1200" height="850" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1e3a8a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
          </linearGradient>
        </defs>

        <!-- Background -->
        <rect width="1200" height="850" fill="url(#grad)"/>

        <!-- Outer Border -->
        <rect x="30" y="30" width="1140" height="790" fill="none" stroke="#fbbf24" stroke-width="10"/>

        <!-- Inner Border -->
        <rect x="50" y="50" width="1100" height="750" fill="none" stroke="#f59e0b" stroke-width="2"/>

        <!-- Title -->
        <text x="600" y="150" font-family="serif" font-size="48" font-weight="bold" fill="#ffffff" text-anchor="middle">
          Certificate of Achievement
        </text>

        <!-- Subtitle -->
        <text x="600" y="230" font-family="sans-serif" font-size="24" fill="#fbbf24" text-anchor="middle">
          This is to certify that
        </text>

        <!-- Student Name -->
        <text x="600" y="310" font-family="serif" font-size="56" font-weight="bold" font-style="italic" fill="#ffffff" text-anchor="middle">
          ${studentName}
        </text>

        <!-- Line under name -->
        <line x1="300" y1="330" x2="900" y2="330" stroke="#fbbf24" stroke-width="2"/>

        <!-- Achievement text -->
        <text x="600" y="380" font-family="sans-serif" font-size="24" fill="#ffffff" text-anchor="middle">
          has successfully completed ${degreeType} in
        </text>

        <!-- Certificate Title -->
        <text x="600" y="430" font-family="sans-serif" font-size="36" font-weight="bold" fill="#ffffff" text-anchor="middle">
          ${certificateTitle}
        </text>

        <!-- University Name -->
        <text x="600" y="480" font-family="sans-serif" font-size="28" fill="#ffffff" text-anchor="middle">
          from ${universityName}
        </text>

        <!-- Date -->
        <text x="600" y="530" font-family="sans-serif" font-size="20" fill="#fbbf24" text-anchor="middle">
          Issued on: ${issueDate}
        </text>

        <!-- Certificate Number -->
        <text x="600" y="560" font-family="sans-serif" font-size="16" fill="#ffffff" text-anchor="middle">
          Certificate No: ${certificateNumber}
        </text>

        <!-- Signature Section -->
        <text x="250" y="720" font-family="sans-serif" font-size="18" fill="#ffffff" text-anchor="start">
          Authorized Signature
        </text>
        <line x1="250" y1="710" x2="500" y2="710" stroke="#fbbf24" stroke-width="2"/>

        <text x="950" y="720" font-family="sans-serif" font-size="18" fill="#ffffff" text-anchor="end">
          University Seal
        </text>
        <line x1="700" y1="710" x2="950" y2="710" stroke="#fbbf24" stroke-width="2"/>

        <!-- Blockchain Badge -->
        <text x="1050" y="810" font-family="sans-serif" font-size="14" font-weight="bold" fill="#fbbf24" text-anchor="middle">
          Verified on Blockchain
        </text>
      </svg>
    `;
  } else {
    // Modern template
    return `
      <svg width="1200" height="850" xmlns="http://www.w3.org/2000/svg">
        <!-- Background -->
        <rect width="1200" height="850" fill="#ffffff"/>

        <!-- Accent Bar -->
        <rect width="1200" height="120" fill="#3b82f6"/>

        <!-- Title -->
        <text x="600" y="200" font-family="serif" font-size="48" font-weight="bold" fill="#1f2937" text-anchor="middle">
          Certificate of Achievement
        </text>

        <!-- Subtitle -->
        <text x="600" y="280" font-family="sans-serif" font-size="24" fill="#6b7280" text-anchor="middle">
          This is to certify that
        </text>

        <!-- Student Name -->
        <text x="600" y="360" font-family="serif" font-size="56" font-weight="bold" font-style="italic" fill="#1f2937" text-anchor="middle">
          ${studentName}
        </text>

        <!-- Line under name -->
        <line x1="300" y1="380" x2="900" y2="380" stroke="#3b82f6" stroke-width="2"/>

        <!-- Achievement text -->
        <text x="600" y="430" font-family="sans-serif" font-size="24" fill="#374151" text-anchor="middle">
          has successfully completed ${degreeType} in
        </text>

        <!-- Certificate Title -->
        <text x="600" y="480" font-family="sans-serif" font-size="36" font-weight="bold" fill="#1f2937" text-anchor="middle">
          ${certificateTitle}
        </text>

        <!-- University Name -->
        <text x="600" y="530" font-family="sans-serif" font-size="28" fill="#1f2937" text-anchor="middle">
          from ${universityName}
        </text>

        <!-- Date -->
        <text x="600" y="580" font-family="sans-serif" font-size="20" fill="#6b7280" text-anchor="middle">
          Issued on: ${issueDate}
        </text>

        <!-- Certificate Number -->
        <text x="600" y="610" font-family="sans-serif" font-size="16" fill="#6b7280" text-anchor="middle">
          Certificate No: ${certificateNumber}
        </text>

        <!-- Signature Section -->
        <text x="250" y="770" font-family="sans-serif" font-size="18" fill="#1f2937" text-anchor="start">
          Authorized Signature
        </text>
        <line x1="250" y1="760" x2="500" y2="760" stroke="#3b82f6" stroke-width="2"/>

        <text x="950" y="770" font-family="sans-serif" font-size="18" fill="#1f2937" text-anchor="end">
          University Seal
        </text>
        <line x1="700" y1="760" x2="950" y2="760" stroke="#3b82f6" stroke-width="2"/>

        <!-- Blockchain Badge -->
        <text x="1050" y="810" font-family="sans-serif" font-size="14" font-weight="bold" fill="#3b82f6" text-anchor="middle">
          Verified on Blockchain
        </text>
      </svg>
    `;
  }
}

/**
 * Generate certificate PNG from template data
 * @returns Buffer containing PNG image data
 */
export async function generateCertificatePNG(
  data: CertificateData,
  template: CertificateTemplate = { type: 'classic' }
): Promise<Buffer> {
  try {
    logger.info(
      {
        studentName: data.studentName,
        universityName: data.universityName,
        template: template.type
      },
      'Generating certificate PNG'
    );

    // Generate SVG
    const svgContent = generateCertificateSVG(data, template);

    // Convert SVG to PNG using sharp
    const pngBuffer = await sharp(Buffer.from(svgContent))
      .png()
      .toBuffer();

    logger.info({ size: pngBuffer.length }, 'Certificate PNG generated successfully');

    return pngBuffer;
  } catch (error: any) {
    logger.error({ error: error.message, data }, 'Failed to generate certificate PNG');
    throw new Error(`Certificate generation failed: ${error.message}`);
  }
}

/**
 * Generate certificate PNG as base64 string
 */
export async function generateCertificateBase64(
  data: CertificateData,
  template: CertificateTemplate = { type: 'classic' }
): Promise<string> {
  const pngBuffer = await generateCertificatePNG(data, template);
  return pngBuffer.toString('base64');
}
