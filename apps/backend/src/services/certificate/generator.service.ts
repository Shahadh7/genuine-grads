import sharp from 'sharp';
import QRCode from 'qrcode';
import { logger } from '../../utils/logger.js';
import { env } from '../../env.js';

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

// Design template interfaces matching the certificate designer
export interface DesignElement {
  id: string;
  type: 'placeholder' | 'static_text' | 'qr_placeholder' | 'image';
  value?: string;
  x: number;
  y: number;
  fontSize?: number;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  width?: number;
  height?: number;
  src?: string;
}

export interface DesignTemplate {
  backgroundColor: string;
  elements: DesignElement[];
}

export interface DynamicCertificateData {
  metadata: Record<string, string | number>;
  certificateNumber: string;
  verificationUrl?: string;
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

/**
 * Map font weight to SVG font-weight value
 */
function mapFontWeight(fontWeight: string | undefined): string {
  switch (fontWeight) {
    case 'bold':
      return '700';
    case 'semibold':
      return '600';
    case 'medium':
      return '500';
    case 'normal':
    default:
      return '400';
  }
}

/**
 * Calculate text anchor for SVG based on text alignment
 */
function getTextAnchor(textAlign: string | undefined): string {
  switch (textAlign) {
    case 'center':
      return 'middle';
    case 'right':
      return 'end';
    case 'left':
    default:
      return 'start';
  }
}

/**
 * Measure text width using character-based calculation
 * 
 * This approximates the width that would be measured by Canvas measureText()
 * using relative character widths for better accuracy. The frontend designer
 * uses the browser's Canvas API for exact measurements, while this backend
 * function provides a close approximation for SVG text rendering.
 * 
 * The character widths are calibrated to match sans-serif fonts as closely
 * as possible, ensuring that certificates generated on the backend align
 * similarly to how they appear in the designer preview.
 * 
 * @param text - The text to measure
 * @param fontSize - Font size in pixels
 * @param fontWeight - Font weight ('normal', 'medium', 'semibold', 'bold')
 * @returns Approximate width in pixels
 */
function measureTextWidth(text: string, fontSize: number, fontWeight: string | undefined): number {
  // Character width categories for sans-serif fonts (relative to fontSize)
  // These values are empirically derived to match browser Canvas API measurements
  const charWidths: Record<string, number> = {
    // Narrow characters
    'i': 0.28, 'l': 0.28, 'I': 0.28, 'j': 0.28, 't': 0.35, 'f': 0.35, 'r': 0.38,
    // Regular characters
    'a': 0.56, 'b': 0.56, 'c': 0.50, 'd': 0.56, 'e': 0.56, 'g': 0.56, 'h': 0.56,
    'k': 0.50, 'n': 0.56, 'o': 0.56, 'p': 0.56, 'q': 0.56, 's': 0.50, 'u': 0.56,
    'v': 0.50, 'x': 0.50, 'y': 0.50, 'z': 0.50,
    // Wide characters
    'm': 0.83, 'w': 0.78,
    // Uppercase
    'A': 0.67, 'B': 0.67, 'C': 0.72, 'D': 0.72, 'E': 0.67, 'F': 0.61, 'G': 0.78,
    'H': 0.72, 'J': 0.50, 'K': 0.67, 'L': 0.56, 'M': 0.83, 'N': 0.72, 'O': 0.78,
    'P': 0.67, 'Q': 0.78, 'R': 0.72, 'S': 0.67, 'T': 0.61, 'U': 0.72, 'V': 0.67,
    'W': 0.94, 'X': 0.67, 'Y': 0.67, 'Z': 0.61,
    // Numbers
    '0': 0.56, '1': 0.56, '2': 0.56, '3': 0.56, '4': 0.56, '5': 0.56,
    '6': 0.56, '7': 0.56, '8': 0.56, '9': 0.56,
    // Special characters
    ' ': 0.28, '.': 0.28, ',': 0.28, ':': 0.28, ';': 0.28, '!': 0.28, '?': 0.56,
    '-': 0.33, '_': 0.56, '(': 0.33, ')': 0.33, '[': 0.28, ']': 0.28,
    '{': 0.33, '}': 0.33, '/': 0.28, '\\': 0.28, '|': 0.24, '@': 1.0,
    '#': 0.56, '$': 0.56, '%': 0.89, '^': 0.47, '&': 0.67, '*': 0.39,
    '+': 0.58, '=': 0.58, '<': 0.58, '>': 0.58, '~': 0.58, '`': 0.33,
    '"': 0.35, "'": 0.19,
  };
  
  // Default width for unknown characters
  const defaultWidth = 0.56;
  
  // Weight multipliers
  let weightMultiplier = 1.0;
  switch (fontWeight) {
    case 'bold':
      weightMultiplier = 1.08;
      break;
    case 'semibold':
      weightMultiplier = 1.05;
      break;
    case 'medium':
      weightMultiplier = 1.02;
      break;
    case 'normal':
    default:
      weightMultiplier = 1.0;
      break;
  }
  
  // Calculate total width
  let totalWidth = 0;
  for (const char of text) {
    const charWidth = charWidths[char] || defaultWidth;
    totalWidth += charWidth * fontSize * weightMultiplier;
  }
  
  return totalWidth;
}

/**
 * Calculate X position offset based on text alignment and actual text width
 * 
 * In the designer, x,y represent the top-left corner of the element's bounding box.
 * For SVG text, we need to adjust the x coordinate based on text-anchor:
 * 
 * - Left alignment (text-anchor="start"): x stays at the left edge
 * - Center alignment (text-anchor="middle"): x moves to the center based on ACTUAL text width
 * - Right alignment (text-anchor="end"): x moves to the right edge based on ACTUAL text width
 * 
 * This ensures that text in the generated certificate appears exactly where it
 * was positioned in the designer, accounting for varying text lengths.
 * 
 * @param x - The x coordinate from the designer (left edge of element)
 * @param text - The actual text to be rendered
 * @param fontSize - Font size in pixels
 * @param fontWeight - Font weight
 * @param textAlign - The text alignment ('left', 'center', or 'right')
 * @returns The adjusted x coordinate for SVG text positioning
 */
function getAlignedX(
  x: number, 
  text: string,
  fontSize: number,
  fontWeight: string | undefined,
  textAlign: string | undefined
): number {
  // Measure the actual text width
  const textWidth = measureTextWidth(text, fontSize, fontWeight);
  
  switch (textAlign) {
    case 'center':
      // For center alignment, x should be at the center of the actual text width
      // This works with text-anchor="middle" to center the text
      return x + textWidth / 2;
    case 'right':
      // For right alignment, x should be at the right edge of the actual text width
      // This works with text-anchor="end" to right-align the text
      return x + textWidth;
    case 'left':
    default:
      // For left alignment, x is already correct
      // This works with text-anchor="start" to left-align the text
      return x;
  }
}

/**
 * Replace placeholders in text with actual values
 */
function replacePlaceholders(text: string, metadata: Record<string, string | number>): string {
  return text.replace(/\{([^}]+)\}/g, (match, key) => {
    const value = metadata[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Generate QR code as SVG data URI
 */
async function generateQRCodeSVG(url: string, size: number): Promise<string> {
  try {
    const qrSvg = await QRCode.toString(url, {
      type: 'svg',
      width: size,
      margin: 0,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    return qrSvg;
  } catch (error) {
    logger.error({ error, url }, 'Failed to generate QR code');
    return '';
  }
}

/**
 * Generate SVG from design template with dynamic data
 */
async function generateDynamicCertificateSVG(
  designTemplate: DesignTemplate,
  data: DynamicCertificateData
): Promise<string> {
  const { backgroundColor, elements } = designTemplate;
  const { metadata, certificateNumber, verificationUrl } = data;

  // Canvas dimensions (matching the designer)
  const canvasWidth = 800;
  const canvasHeight = 600;

  // Build SVG elements
  const svgElements: string[] = [];

  for (const element of elements) {
    const { type, value, x, y, fontSize, fontWeight, textAlign, color, width, height, src } = element;

    if (type === 'placeholder') {
      // Replace placeholder with actual value
      const displayValue = value ? replacePlaceholders(value, metadata) : '';
      const escapedValue = escapeXml(displayValue);
      const size = fontSize || 16;
      const weight = mapFontWeight(fontWeight);
      const alignedX = getAlignedX(x, displayValue, size, fontWeight, textAlign);
      const anchor = getTextAnchor(textAlign);
      
      // In the designer, x,y represent the top-left corner of the element
      // For SVG text with dominant-baseline="hanging", y represents the top of the text
      // This ensures the generated certificate matches the designer preview exactly

      svgElements.push(`
        <text
          x="${alignedX}"
          y="${y}"
          font-family="DejaVu Sans, Verdana, Geneva, sans-serif"
          font-size="${size}"
          font-weight="${weight}"
          fill="${color || '#374151'}"
          text-anchor="${anchor}"
          dominant-baseline="hanging"
        >${escapedValue}</text>
      `);
    } else if (type === 'static_text') {
      // Static text - render as-is
      const displayValue = value || '';
      const escapedValue = escapeXml(displayValue);
      const size = fontSize || 14;
      const weight = mapFontWeight(fontWeight);
      const alignedX = getAlignedX(x, displayValue, size, fontWeight, textAlign);
      const anchor = getTextAnchor(textAlign);
      
      // In the designer, x,y represent the top-left corner of the element
      // For SVG text with dominant-baseline="hanging", y represents the top of the text
      // This ensures the generated certificate matches the designer preview exactly

      svgElements.push(`
        <text
          x="${alignedX}"
          y="${y}"
          font-family="DejaVu Sans, Verdana, Geneva, sans-serif"
          font-size="${size}"
          font-weight="${weight}"
          fill="${color || '#374151'}"
          text-anchor="${anchor}"
          dominant-baseline="hanging"
        >${escapedValue}</text>
      `);
    } else if (type === 'qr_placeholder') {
      // Generate QR code for verification
      const qrUrl = verificationUrl || `${env.FRONTEND_URL || 'https://genuinegrads.xyz'}/verify/${certificateNumber}`;
      const qrSize = Math.min(width || 100, height || 100);
      const qrSvg = await generateQRCodeSVG(qrUrl, qrSize);

      if (qrSvg) {
        // Extract the inner content of the QR SVG and position it
        const qrContent = qrSvg
          .replace(/<\?xml[^?]*\?>/g, '')
          .replace(/<svg[^>]*>/g, '')
          .replace(/<\/svg>/g, '');

        svgElements.push(`
          <g transform="translate(${x}, ${y})">
            <rect x="0" y="0" width="${width || 100}" height="${height || 100}" fill="#ffffff"/>
            <svg x="0" y="0" width="${width || 100}" height="${height || 100}" viewBox="0 0 ${qrSize} ${qrSize}">
              ${qrContent}
            </svg>
          </g>
        `);
      }
    } else if (type === 'image' && src) {
      // Embed image (base64 or URL)
      // For base64 images (data URIs), embed directly
      // For URLs, we'll use xlink:href
      const imgWidth = width || 100;
      const imgHeight = height || 100;

      if (src.startsWith('data:')) {
        svgElements.push(`
          <image
            x="${x}"
            y="${y}"
            width="${imgWidth}"
            height="${imgHeight}"
            href="${src}"
            preserveAspectRatio="xMidYMid meet"
          />
        `);
      } else {
        // External URL - encode for SVG
        const escapedSrc = escapeXml(src);
        svgElements.push(`
          <image
            x="${x}"
            y="${y}"
            width="${imgWidth}"
            height="${imgHeight}"
            href="${escapedSrc}"
            preserveAspectRatio="xMidYMid meet"
          />
        `);
      }
    }
  }

  // Construct the full SVG
  const svg = `
    <svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <rect width="${canvasWidth}" height="${canvasHeight}" fill="${backgroundColor || '#ffffff'}"/>
      ${svgElements.join('\n')}
    </svg>
  `;

  return svg;
}

/**
 * Generate certificate PNG from design template with dynamic data
 * This is the main function to generate certificates from custom templates
 */
export async function generateCertificateFromTemplate(
  designTemplate: DesignTemplate,
  data: DynamicCertificateData
): Promise<Buffer> {
  try {
    logger.info(
      {
        certificateNumber: data.certificateNumber,
        elementCount: designTemplate.elements.length,
      },
      'Generating certificate from template'
    );

    // Generate SVG from template
    const svgContent = await generateDynamicCertificateSVG(designTemplate, data);

    // Log SVG content for debugging (first 500 chars)
    logger.debug(
      {
        svgPreview: svgContent.substring(0, 500),
        svgLength: svgContent.length,
      },
      'Generated SVG content'
    );

    // Convert SVG to PNG using sharp
    const pngBuffer = await sharp(Buffer.from(svgContent))
      .png()
      .toBuffer();

    logger.info({ size: pngBuffer.length }, 'Certificate PNG generated from template successfully');

    return pngBuffer;
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack, data }, 'Failed to generate certificate from template');
    throw new Error(`Certificate generation from template failed: ${error.message}`);
  }
}

/**
 * Generate certificate PNG from design template as base64
 */
export async function generateCertificateFromTemplateBase64(
  designTemplate: DesignTemplate,
  data: DynamicCertificateData
): Promise<string> {
  const pngBuffer = await generateCertificateFromTemplate(designTemplate, data);
  return pngBuffer.toString('base64');
}
