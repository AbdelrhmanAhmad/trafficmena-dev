/**
 * Secure embed URL validation utility
 * Implements domain allowlisting and XSS prevention for embed content
 * Addresses CWE-79 (Cross-site Scripting) vulnerabilities
 */

export interface EmbedUrlValidationResult {
  isValid: boolean;
  embedType: 'canva' | 'gamma' | 'google_slides' | 'youtube' | 'vimeo' | 'bunny' | 'iframe' | null;
  errors: string[];
  warnings: string[];
  sanitizedUrl?: string;
}

// SECURITY: Strict domain allowlist for embed content
const ALLOWED_EMBED_DOMAINS = {
  canva: ['canva.com'],
  gamma: ['gamma.app'],
  google_slides: ['docs.google.com', 'drive.google.com'],
  youtube: ['youtube.com', 'youtu.be', 'youtube-nocookie.com'],
  vimeo: ['vimeo.com', 'player.vimeo.com'],
  bunny: [
    'bunnycdn.com',
    'b-cdn.net',
    'iframe.videodelivery.net',
    'iframe.mediadelivery.net', // Bunny CDN video delivery
    'mediadelivery.net', // Bunny CDN media delivery platform
    'video.bunnycdn.com',
    'stream.bunnycdn.com',
  ],
  // Additional trusted domains can be added here
} as const;

// SECURITY: Blocked domains that are known to be problematic
const BLOCKED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  'internal',
  'admin',
  'api',
  'file://',
  'javascript:',
  'data:',
  'blob:',
  'about:',
] as const;

// SECURITY: Suspicious URL patterns that could indicate XSS attempts
const SUSPICIOUS_PATTERNS = [
  /javascript:/i,
  /data:/i,
  /blob:/i,
  /about:/i,
  /<script/i,
  /on\w+\s*=/i, // Event handlers like onclick, onload, etc.
  /expression\s*\(/i,
  /url\s*\(/i,
  /import\s+/i,
  /@import/i,
  /eval\s*\(/i,
  /setTimeout\s*\(/i,
  /setInterval\s*\(/i,
] as const;

/**
 * Validates an embed URL for security and determines its type
 */
export function validateEmbedUrl(url: string): EmbedUrlValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Handle empty/null URLs
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      embedType: null,
      errors: ['URL is required'],
      warnings: [],
    };
  }

  const trimmedUrl = url.trim();

  if (trimmedUrl === '') {
    return {
      isValid: false,
      embedType: null,
      errors: ['URL cannot be empty'],
      warnings: [],
    };
  }

  // SECURITY: Check for suspicious patterns first
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(trimmedUrl)) {
      errors.push(`URL contains potentially malicious content: ${pattern.source}`);
    }
  }

  // SECURITY: Validate URL format
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch (error) {
    return {
      isValid: false,
      embedType: null,
      errors: ['Invalid URL format'],
      warnings: [],
    };
  }

  // SECURITY: Only allow HTTPS (except for localhost in development)
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    errors.push('Only HTTPS URLs are allowed for security');
  }

  if (parsedUrl.protocol === 'http:' && !parsedUrl.hostname.includes('localhost')) {
    errors.push('HTTP URLs are only allowed for localhost (use HTTPS for production)');
  }

  // SECURITY: Check against blocked domains
  const hostname = parsedUrl.hostname.toLowerCase();
  for (const blockedDomain of BLOCKED_DOMAINS) {
    if (hostname.includes(blockedDomain)) {
      errors.push(`Domain '${hostname}' is blocked for security reasons`);
    }
  }

  // SECURITY: Determine embed type and validate against allowed domains
  const embedType = determineEmbedType(parsedUrl);

  if (!embedType) {
    errors.push(`Domain '${hostname}' is not in the allowed list of embed providers`);
  } else {
    const allowedDomains = ALLOWED_EMBED_DOMAINS[embedType];
    const isDomainAllowed = allowedDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );

    if (!isDomainAllowed) {
      errors.push(`Domain '${hostname}' is not authorized for ${embedType} embeds`);
    }
  }

  // SECURITY: Additional validation based on embed type
  if (embedType && errors.length === 0) {
    const typeValidation = validateEmbedTypeSpecific(parsedUrl, embedType);
    errors.push(...typeValidation.errors);
    warnings.push(...typeValidation.warnings);
  }

  // SECURITY: Generate sanitized URL
  let sanitizedUrl: string | undefined;
  if (errors.length === 0) {
    sanitizedUrl = sanitizeEmbedUrl(parsedUrl, embedType);
  }

  return {
    isValid: errors.length === 0,
    embedType,
    errors,
    warnings,
    sanitizedUrl,
  };
}

/**
 * Determines the embed type based on the URL hostname
 */
function determineEmbedType(url: URL): EmbedUrlValidationResult['embedType'] {
  const hostname = url.hostname.toLowerCase();

  // Check each embed type's allowed domains
  for (const [type, domains] of Object.entries(ALLOWED_EMBED_DOMAINS)) {
    if (domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
      return type as EmbedUrlValidationResult['embedType'];
    }
  }

  return null;
}

/**
 * Performs type-specific validation for embed URLs
 */
function validateEmbedTypeSpecific(
  url: URL,
  embedType: NonNullable<EmbedUrlValidationResult['embedType']>,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (embedType) {
    case 'canva':
      if (!url.pathname.includes('/design/') && !url.pathname.includes('/embed/')) {
        warnings.push('Canva URL should contain /design/ or /embed/ for proper embedding');
      }
      break;

    case 'gamma':
      if (!url.pathname || url.pathname === '/') {
        warnings.push(
          'Gamma URL appears to be incomplete - ensure you have the full presentation URL',
        );
      }
      break;

    case 'google_slides':
      if (!url.pathname.includes('/presentation/') && !url.pathname.includes('/file/')) {
        warnings.push('Google Slides URL should be a presentation or file share link');
      }
      if (url.pathname.includes('/edit')) {
        warnings.push('Consider using the share/embed URL instead of edit URL for better security');
      }
      break;

    case 'youtube':
      if (url.searchParams.get('v') === null && !url.pathname.includes('/embed/')) {
        errors.push('YouTube URL must include a video ID (v parameter or /embed/ path)');
      }
      break;

    case 'vimeo':
      if (!url.pathname.match(/\/\d+/) && !url.pathname.includes('/video/')) {
        warnings.push('Vimeo URL should include a video ID');
      }
      break;

    case 'bunny':
      // Bunny CDN validation - flexible validation for various Bunny CDN formats
      if (!url.pathname || url.pathname === '/') {
        warnings.push('Bunny CDN URL appears incomplete - ensure you have the full video URL');
      }
      // Allow both /play/ and /embed/ paths for Bunny CDN
      if (
        !url.pathname.includes('/play/') &&
        !url.pathname.includes('/embed/') &&
        !url.pathname.match(/\/\d+\//)
      ) {
        warnings.push('Bunny CDN URL should include a video ID or embed path');
      }
      break;
  }

  return { errors, warnings };
}

/**
 * Sanitizes an embed URL by removing potentially dangerous parameters
 */
function sanitizeEmbedUrl(
  url: URL,
  embedType: NonNullable<EmbedUrlValidationResult['embedType']>,
): string {
  const sanitizedUrl = new URL(url.toString());

  // SECURITY: Remove potentially dangerous parameters (but allow legitimate video controls)
  const dangerousParams = [
    'javascript',
    'onclick',
    'onload',
    'onerror',
    'eval',
    'script',
    // NOTE: autoplay and loop are legitimate video parameters, don't remove them
  ];

  dangerousParams.forEach((param) => {
    if (sanitizedUrl.searchParams.has(param)) {
      sanitizedUrl.searchParams.delete(param);
    }
  });

  // SECURITY: Type-specific sanitization
  switch (embedType) {
    case 'youtube':
      // Force nocookie version for better privacy
      if (sanitizedUrl.hostname === 'www.youtube.com') {
        sanitizedUrl.hostname = 'www.youtube-nocookie.com';
      }
      // Ensure embed format
      if (sanitizedUrl.pathname.includes('/watch')) {
        const videoId = sanitizedUrl.searchParams.get('v');
        if (videoId) {
          sanitizedUrl.pathname = `/embed/${videoId}`;
          sanitizedUrl.searchParams.delete('v');
        }
      }
      break;

    case 'google_slides':
      // Convert to embed format for security
      if (sanitizedUrl.pathname.includes('/edit')) {
        sanitizedUrl.pathname = sanitizedUrl.pathname.replace('/edit', '/embed');
      } else if (sanitizedUrl.pathname.includes('/view')) {
        sanitizedUrl.pathname = sanitizedUrl.pathname.replace('/view', '/embed');
      }
      break;

    case 'bunny':
      // Force responsive player to prevent fixed-size embeds inside responsive containers
      sanitizedUrl.searchParams.set('responsive', 'true');
      if (!sanitizedUrl.searchParams.has('preload')) {
        sanitizedUrl.searchParams.set('preload', 'true');
      }
      // Explicitly disable autoplay - Bunny defaults to autoplay=true when not set
      sanitizedUrl.searchParams.set('autoplay', 'false');
      // Normalize Bunny Stream "play" URLs to embed URLs for full-size player rendering
      if (
        (sanitizedUrl.hostname === 'iframe.mediadelivery.net' ||
          sanitizedUrl.hostname === 'iframe.videodelivery.net') &&
        sanitizedUrl.pathname.startsWith('/play/')
      ) {
        sanitizedUrl.pathname = sanitizedUrl.pathname.replace('/play/', '/embed/');
      }
      break;
  }

  return sanitizedUrl.toString();
}

/**
 * Generates safe iframe attributes for embedding
 */
export function getSecureIframeAttributes(
  url: string,
  embedType: NonNullable<EmbedUrlValidationResult['embedType']>,
): Record<string, any> {
  const baseAttributes: Record<string, any> = {
    src: url,
    frameBorder: '0',
    allowFullScreen: true,
    loading: 'lazy',
    referrerPolicy: 'strict-origin-when-cross-origin',
  };

  // SECURITY: Strict sandbox attributes by default
  const sandbox = ['allow-scripts', 'allow-same-origin', 'allow-presentation', 'allow-forms'];

  // SECURITY: Type-specific security attributes
  switch (embedType) {
    case 'youtube':
    case 'vimeo':
      sandbox.push('allow-autoplay');
      baseAttributes.allow =
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      break;

    case 'bunny':
      // Bunny CDN is a trusted source - skip sandbox to allow full player rendering
      baseAttributes.allow =
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen';
      // Return early without sandbox for bunny
      return baseAttributes;

    case 'canva':
    case 'gamma':
    case 'google_slides':
      // Stricter sandbox for presentation content
      baseAttributes.allow = 'clipboard-write; fullscreen';
      break;

    default:
      // Most restrictive for unknown types
      baseAttributes.allow = 'fullscreen';
      break;
  }

  baseAttributes.sandbox = sandbox.join(' ');

  return baseAttributes;
}

/**
 * Batch validation for multiple embed URLs
 */
export function validateMultipleEmbedUrls(urls: string[]): EmbedUrlValidationResult[] {
  return urls.map((url) => validateEmbedUrl(url));
}

/**
 * Check if an embed URL is safe for immediate rendering
 */
export function isEmbedUrlSafeToRender(url: string): boolean {
  const validation = validateEmbedUrl(url);
  return validation.isValid && validation.errors.length === 0;
}
