import { toast } from '@/shared/hooks/custom/use-toast';

export async function shareToClipboard(text: string | null): Promise<void> {
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard!', description: 'Results copied.' });
  } catch {
    console.warn('Clipboard write failed');
  }
}
