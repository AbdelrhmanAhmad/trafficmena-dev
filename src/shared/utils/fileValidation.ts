/**
 * Comprehensive file validation utility for secure file uploads
 * Provides client-side validation for file type, size, and security checks
 */

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
  checkMimeType?: boolean;
  scanForMaliciousContent?: boolean;
}

// Default validation settings
const DEFAULT_OPTIONS: Required<FileValidationOptions> = {
  maxSizeBytes: 10 * 1024 * 1024, // 10MB default
  allowedTypes: [
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/webm',
  ],
  allowedExtensions: [
    '.pdf',
    '.ppt',
    '.pptx',
    '.doc',
    '.docx',
    '.txt',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.mp4',
    '.webm',
  ],
  checkMimeType: true,
  scanForMaliciousContent: true,
};

// Suspicious file patterns that could indicate malicious content
const SUSPICIOUS_PATTERNS = [
  /\.exe$/i,
  /\.scr$/i,
  /\.bat$/i,
  /\.cmd$/i,
  /\.com$/i,
  /\.pif$/i,
  /\.vbs$/i,
  /\.js$/i,
  /\.jar$/i,
  /\.app$/i,
  /\.deb$/i,
  /\.rpm$/i,
  /\.dmg$/i,
  /\.iso$/i,
  /\.img$/i,
  /\.bin$/i,
  /\.msi$/i,
  /\.apk$/i,
  // Double extension attempts
  /\.(pdf|doc|docx|ppt|pptx)\.exe$/i,
  /\.(pdf|doc|docx|ppt|pptx)\.scr$/i,
];

// Known malicious file signatures (magic bytes)
const MALICIOUS_SIGNATURES = [
  { signature: [0x4d, 0x5a], description: 'Windows PE executable' },
  { signature: [0x7f, 0x45, 0x4c, 0x46], description: 'Linux ELF executable' },
  { signature: [0xca, 0xfe, 0xba, 0xbe], description: 'Java class file' },
  { signature: [0xfe, 0xed, 0xfa, 0xce], description: 'Mach-O executable' },
];

/**
 * Validates a file for security and compliance with upload requirements
 */
export function validateFile(
  file: File,
  options: FileValidationOptions = {},
): FileValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if file exists
  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors, warnings };
  }

  // Validate file size
  if (file.size > opts.maxSizeBytes) {
    errors.push(
      `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(opts.maxSizeBytes)})`,
    );
  }

  // Check for zero-byte files
  if (file.size === 0) {
    errors.push('File is empty (0 bytes)');
  }

  // Validate file extension
  const fileExtension = getFileExtension(file.name);
  if (!opts.allowedExtensions.includes(fileExtension.toLowerCase())) {
    errors.push(
      `File extension "${fileExtension}" is not allowed. Allowed extensions: ${opts.allowedExtensions.join(', ')}`,
    );
  }

  // Validate MIME type
  if (opts.checkMimeType && !opts.allowedTypes.includes(file.type)) {
    errors.push(
      `File type "${file.type}" is not allowed. Allowed types: ${opts.allowedTypes.join(', ')}`,
    );
  }

  // Check for suspicious file patterns
  if (opts.scanForMaliciousContent) {
    const suspiciousPattern = SUSPICIOUS_PATTERNS.find((pattern) => pattern.test(file.name));
    if (suspiciousPattern) {
      errors.push(
        `File name contains suspicious pattern. This type of file is not allowed for security reasons.`,
      );
    }

    // Check for null bytes in filename (potential directory traversal)
    if (file.name.includes('\0')) {
      errors.push('File name contains null bytes - potential security threat');
    }

    // Check for path traversal attempts
    if (file.name.includes('../') || file.name.includes('..\\')) {
      errors.push('File name contains path traversal characters - potential security threat');
    }

    // Warn about potentially risky files
    if (file.name.includes('macro') || file.name.includes('script')) {
      warnings.push('File name suggests it may contain macros or scripts - ensure content is safe');
    }
  }

  // Additional security checks for specific file types
  if (file.type === 'application/pdf') {
    if (file.size < 100) {
      warnings.push("PDF file is unusually small - verify it's a valid document");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates multiple files at once
 */
export function validateFiles(
  files: FileList | File[],
  options: FileValidationOptions = {},
): FileValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  const fileArray = Array.from(files);

  if (fileArray.length === 0) {
    allErrors.push('No files provided');
    return { isValid: false, errors: allErrors, warnings: allWarnings };
  }

  fileArray.forEach((file, index) => {
    const result = validateFile(file, options);

    if (!result.isValid) {
      result.errors.forEach((error) => {
        allErrors.push(`File ${index + 1} (${file.name}): ${error}`);
      });
    }

    result.warnings.forEach((warning) => {
      allWarnings.push(`File ${index + 1} (${file.name}): ${warning}`);
    });
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Enhanced file content scanning for malicious signatures and content
 * SECURITY: Addresses CWE-434 (Unrestricted Upload of File with Dangerous Type)
 */
export async function scanFileContent(file: File): Promise<FileValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // SECURITY: Read first 512 bytes for more comprehensive signature detection
    const headerBuffer = await file.slice(0, 512).arrayBuffer();
    const headerBytes = new Uint8Array(headerBuffer);

    // SECURITY: Check against known malicious signatures
    for (const { signature, description } of MALICIOUS_SIGNATURES) {
      if (bytesStartWith(headerBytes, signature)) {
        errors.push(
          `SECURITY THREAT: File contains ${description} signature - potentially malicious content detected`,
        );
      }
    }

    // SECURITY: Additional signature checks for embedded executables
    const additionalMaliciousSignatures = [
      {
        signature: [0x50, 0x4b, 0x03, 0x04],
        types: ['zip', 'jar', 'apk'],
        description: 'ZIP-based archive (could contain executables)',
      },
      {
        signature: [0x52, 0x61, 0x72, 0x21],
        types: ['rar'],
        description: 'RAR archive (could contain executables)',
      },
      {
        signature: [0x1f, 0x8b],
        types: ['gz'],
        description: 'GZIP archive (could contain executables)',
      },
    ];

    for (const { signature, description } of additionalMaliciousSignatures) {
      if (bytesStartWith(headerBytes, signature) && !file.name.toLowerCase().endsWith('.pdf')) {
        warnings.push(`File appears to be ${description} - verify contents are safe`);
      }
    }

    // SECURITY: Check for script content in text-based files
    if (file.type.includes('text') || file.type.includes('xml') || file.type.includes('html')) {
      const textBuffer = await file.slice(0, 2048).arrayBuffer(); // Read more for text files
      const text = new TextDecoder().decode(textBuffer).toLowerCase();

      const scriptPatterns = [
        '<script',
        'javascript:',
        'vbscript:',
        'onw+s*=', // Event handlers
        'eval(',
        'settimeout(',
        'setinterval(',
        'document.cookie',
        'window.location',
        'xmlhttprequest',
        'fetch(',
      ];

      for (const pattern of scriptPatterns) {
        if (text.includes(pattern.toLowerCase()) || new RegExp(pattern, 'i').test(text)) {
          errors.push(
            `SECURITY THREAT: File contains potentially malicious script content: ${pattern}`,
          );
        }
      }
    }

    // SECURITY: Check for PDF-specific threats
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const pdfBuffer = await file.slice(0, 1024).arrayBuffer();
      const pdfText = new TextDecoder().decode(pdfBuffer);

      // Check for PDF signature
      if (!pdfText.startsWith('%PDF-')) {
        errors.push('File claims to be PDF but does not have valid PDF signature');
      }

      // Check for embedded JavaScript in PDF
      if (pdfText.toLowerCase().includes('/javascript') || pdfText.toLowerCase().includes('/js')) {
        warnings.push('PDF contains JavaScript - this could be a security risk');
      }

      // Check for suspicious PDF elements
      const suspiciousPdfElements = ['/launch', '/gotor', '/uri', '/submitform'];
      for (const element of suspiciousPdfElements) {
        if (pdfText.toLowerCase().includes(element)) {
          warnings.push(`PDF contains ${element} element - could be used for malicious purposes`);
        }
      }
    }

    // SECURITY: Check for Office document macros
    if (
      file.type.includes('officedocument') ||
      file.name.match(/\.(docx|xlsx|pptx|docm|xlsm|pptm)$/i)
    ) {
      // Office documents are ZIP files, check for macro-enabled extensions
      if (file.name.match(/\.(docm|xlsm|pptm)$/i)) {
        warnings.push(
          'File is macro-enabled Office document - macros could contain malicious code',
        );
      }

      // Check file size - unusually small Office docs might be malicious
      if (file.size < 1000) {
        warnings.push('Office document is unusually small - verify it is legitimate');
      }
    }

    // SECURITY: File size anomaly detection
    if (file.type === 'application/pdf' && file.size < 100) {
      errors.push('PDF file is too small to be legitimate (less than 100 bytes)');
    }

    if (file.size > 100 * 1024 * 1024) {
      // 100MB
      warnings.push('File is very large - ensure this is expected and monitor upload resources');
    }

    // SECURITY: Filename analysis for social engineering attempts
    const suspiciousFilenamePatterns = [
      /\.(exe|scr|bat|cmd|com|pif|vbs|js|jar)$/i,
      /\.(pdf|doc|docx|xls|xlsx|ppt|pptx)\.(exe|scr|bat|cmd)$/i, // Double extensions
      /urgent|important|invoice|receipt|prize|winner|security|update/i,
    ];

    for (const pattern of suspiciousFilenamePatterns) {
      if (pattern.test(file.name)) {
        errors.push(
          `SECURITY THREAT: Filename "${file.name}" matches suspicious pattern - potential social engineering attempt`,
        );
      }
    }
  } catch (error) {
    console.error('File content scanning error:', error);
    warnings.push('Could not complete security scan - upload with extreme caution');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Helper function to get file extension
 */
function getFileExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  return lastDotIndex !== -1 ? filename.substring(lastDotIndex) : '';
}

/**
 * Helper function to format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Helper function to check if bytes start with a specific signature
 */
function bytesStartWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;

  for (let i = 0; i < signature.length; i++) {
    if (bytes[i] !== signature[i]) return false;
  }

  return true;
}

/**
 * Generate a secure filename by sanitizing the original name
 */
export function sanitizeFilename(filename: string): string {
  // SECURITY FIX: Use a safer approach that doesn't use control character ranges to prevent ReDoS
  let sanitized = filename
    .replace(/[<>:"/\\|?*]/g, '_') // Remove dangerous chars without control char range
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, '') // Remove trailing dots
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .toLowerCase(); // Convert to lowercase for consistency

  sanitized = Array.from(sanitized)
    .map((char) => {
      const code = char.charCodeAt(0);
      const isControl = (code >= 0 && code <= 31) || (code >= 127 && code <= 159);
      return isControl ? '_' : char;
    })
    .join('');

  // Ensure filename is not empty and not too long
  if (!sanitized || sanitized === '_') {
    sanitized = 'document';
  }

  if (sanitized.length > 100) {
    const extension = getFileExtension(sanitized);
    const name = sanitized.substring(0, 100 - extension.length);
    sanitized = name + extension;
  }

  return sanitized;
}

/**
 * Predefined validation configurations for common use cases
 */
export const FILE_VALIDATION_PRESETS: Record<string, FileValidationOptions> = {
  DOCUMENTS_ONLY: {
    maxSizeBytes: 25 * 1024 * 1024, // 25MB
    allowedTypes: [
      'application/pdf',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
    allowedExtensions: ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt'],
    checkMimeType: true,
    scanForMaliciousContent: true,
  },
  IMAGES_ONLY: {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    checkMimeType: true,
    scanForMaliciousContent: true,
  },
  MEDIA_FILES: {
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'audio/mp3',
      'audio/wav',
    ],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mp3', '.wav'],
    checkMimeType: true,
    scanForMaliciousContent: true,
  },
};
