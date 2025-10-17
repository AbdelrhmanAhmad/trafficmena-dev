/**
 * Social Media Sharing Utilities for Invitations
 * Simple utilities for sharing invitation links on social platforms
 */

/**
 * Generate a shareable invitation link
 */
export function generateInvitationLink(token: string): string {
  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://trafficmena.com';
  return `${baseUrl}/signup?invitation=${token}`;
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Share on WhatsApp
 */
export function shareOnWhatsApp(inviteLink: string, customMessage?: string): void {
  const defaultMessage = `Join TrafficMENA Hub - the premier digital marketing community for MENA! 🚀

Learn from industry experts, attend exclusive events, and grow your career.

${inviteLink}`;

  const message = encodeURIComponent(customMessage || defaultMessage);
  window.open(`https://wa.me/?text=${message}`, '_blank');
}

/**
 * Share on Facebook
 */
export function shareOnFacebook(inviteLink: string): void {
  const url = encodeURIComponent(inviteLink);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
}

/**
 * Share on Twitter/X
 */
export function shareOnTwitter(inviteLink: string, customMessage?: string): void {
  const defaultMessage =
    'Join me on TrafficMENA Hub - the premier digital marketing community for MENA! 🚀';
  const text = encodeURIComponent(customMessage || defaultMessage);
  const url = encodeURIComponent(inviteLink);
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
}

/**
 * Share on LinkedIn
 */
export function shareOnLinkedIn(inviteLink: string): void {
  const url = encodeURIComponent(inviteLink);
  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank');
}

/**
 * Share on Telegram
 */
export function shareOnTelegram(inviteLink: string, customMessage?: string): void {
  const defaultMessage = 'Join TrafficMENA Hub - the premier digital marketing community for MENA!';
  const text = encodeURIComponent(customMessage || defaultMessage);
  const url = encodeURIComponent(inviteLink);
  window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
}

/**
 * Generate QR code URL for invitation link
 */
export function generateQRCodeUrl(inviteLink: string): string {
  const encodedUrl = encodeURIComponent(inviteLink);
  // Using a public QR code API service
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}`;
}

/**
 * Share via native share API (mobile)
 */
export async function shareNative(inviteLink: string, customMessage?: string): Promise<boolean> {
  const defaultMessage = 'Join TrafficMENA Hub - the premier digital marketing community for MENA!';

  if (!navigator.share) {
    return false;
  }

  try {
    await navigator.share({
      title: 'TrafficMENA Hub Invitation',
      text: customMessage || defaultMessage,
      url: inviteLink,
    });
    return true;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
    }
    return false;
  }
}

/**
 * Get all share options with their handlers
 */
export function getShareOptions(inviteLink: string) {
  return [
    {
      name: 'WhatsApp',
      icon: 'whatsapp',
      color: 'green',
      handler: () => shareOnWhatsApp(inviteLink),
    },
    {
      name: 'Facebook',
      icon: 'facebook',
      color: 'blue',
      handler: () => shareOnFacebook(inviteLink),
    },
    {
      name: 'Twitter',
      icon: 'twitter',
      color: 'sky',
      handler: () => shareOnTwitter(inviteLink),
    },
    {
      name: 'LinkedIn',
      icon: 'linkedin',
      color: 'blue',
      handler: () => shareOnLinkedIn(inviteLink),
    },
    {
      name: 'Telegram',
      icon: 'telegram',
      color: 'blue',
      handler: () => shareOnTelegram(inviteLink),
    },
    {
      name: 'Copy Link',
      icon: 'copy',
      color: 'gray',
      handler: () => copyToClipboard(inviteLink),
    },
  ];
}
