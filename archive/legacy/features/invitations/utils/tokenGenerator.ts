/**
 * Token Generator Utility
 * Generates secure URL-safe tokens for invitations
 */
export class TokenGenerator {
  /**
   * Generate a secure URL-safe token for invitations
   * Uses crypto.getRandomValues for cryptographically secure randomness
   */
  static generateInvitationToken(): string {
    // Generate 32 random bytes (256 bits) for high security
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);

    // Convert to base64url encoding (URL-safe)
    return TokenGenerator.arrayBufferToBase64Url(array.buffer);
  }

  /**
   * Generate a shorter token for temporary operations (24 bytes = 192 bits)
   */
  static generateShortToken(): string {
    const array = new Uint8Array(24);
    crypto.getRandomValues(array);
    return TokenGenerator.arrayBufferToBase64Url(array.buffer);
  }

  /**
   * Convert ArrayBuffer to base64url (URL-safe base64)
   */
  private static arrayBufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';

    // Convert bytes to binary string
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    // Convert to base64 and make URL-safe
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Validate token format (base64url without padding)
   */
  static isValidToken(token: string): boolean {
    // Check if token matches base64url format
    const base64UrlRegex = /^[A-Za-z0-9_-]+$/;

    // Should be between 32-64 characters for our use case
    return base64UrlRegex.test(token) && token.length >= 32 && token.length <= 64;
  }

  /**
   * Generate a batch identifier for group invitations
   */
  static generateBatchId(): string {
    // Use current timestamp + random bytes for uniqueness
    const timestamp = Date.now().toString(36);
    const randomPart = TokenGenerator.generateShortToken().slice(0, 8);
    return `batch_${timestamp}_${randomPart}`;
  }
}
