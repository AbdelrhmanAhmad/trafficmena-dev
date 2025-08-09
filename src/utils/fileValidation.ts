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
    'video/webm'
  ],
  allowedExtensions: [
    '.pdf', '.ppt', '.pptx', '.doc', '.docx', '.txt',
    '.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm'
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
  { signature: [0x4D, 0x5A], description: 'Windows PE executable' },
  { signature: [0x7F, 0x45, 0x4C, 0x46], description: 'Linux ELF executable' },
  { signature: [0xCA, 0xFE, 0xBA, 0xBE], description: 'Java class file' },
  { signature: [0xFE, 0xED, 0xFA, 0xCE], description: 'Mach-O executable' },
];

/**
 * Validates a file for security and compliance with upload requirements
 */
export function validateFile(
  file: File,
  options: FileValidationOptions = {}
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
      `File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(opts.maxSizeBytes)})`
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
      `File extension "${fileExtension}" is not allowed. Allowed extensions: ${opts.allowedExtensions.join(', ')}`
    );
  }

  // Validate MIME type
  if (opts.checkMimeType && !opts.allowedTypes.includes(file.type)) {
    errors.push(
      `File type "${file.type}" is not allowed. Allowed types: ${opts.allowedTypes.join(', ')}`
    );
  }

  // Check for suspicious file patterns
  if (opts.scanForMaliciousContent) {
    const suspiciousPattern = SUSPICIOUS_PATTERNS.find(pattern => 
      pattern.test(file.name)
    );
    if (suspiciousPattern) {
      errors.push(
        `File name contains suspicious pattern. This type of file is not allowed for security reasons.`
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
      warnings.push('PDF file is unusually small - verify it\'s a valid document');
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
  options: FileValidationOptions = {}
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
      result.errors.forEach(error => {
        allErrors.push(`File ${index + 1} (${file.name}): ${error}`);
      });
    }
    
    result.warnings.forEach(warning => {
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
 * Scans file content for malicious signatures (basic client-side check)
 */
export async function scanFileContent(file: File): Promise<FileValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Read first 100 bytes to check for malicious signatures
    const buffer = await file.slice(0, 100).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Check against known malicious signatures
    for (const { signature, description } of MALICIOUS_SIGNATURES) {
      if (bytesStartWith(bytes, signature)) {
        errors.push(`File contains ${description} signature - potentially malicious content detected`);
      }
    }

    // Check for script tags in files that shouldn't have them
    if (file.type.includes('text') || file.type.includes('xml')) {
      const text = new TextDecoder().decode(buffer);
      if (text.toLowerCase().includes('<script') || text.toLowerCase().includes('javascript:')) {
        warnings.push('File contains script content - ensure this is intentional and safe');
      }
    }

  } catch (error) {
    warnings.push('Could not scan file content - upload with caution');
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
  // Remove or replace dangerous characters
  let sanitized = filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') // Replace dangerous chars with underscore
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, '') // Remove trailing dots
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .toLowerCase(); // Convert to lowercase for consistency

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
      'text/plain'
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
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm', 'audio/mp3', 'audio/wav'
    ],
    allowedExtensions: [
      '.jpg', '.jpeg', '.png', '.gif', '.webp',
      '.mp4', '.webm', '.mp3', '.wav'
    ],
    checkMimeType: true,
    scanForMaliciousContent: true,
  },
};