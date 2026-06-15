import { Phone, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentUser } from '@/app/hooks/useCurrentUser';
import { useAuth } from '@/shared/context/AuthContext';

export function PhoneCompletionBanner() {
  const { user } = useAuth();
  const { data, isLoading } = useCurrentUser({ enabled: !!user });
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (!user || dismissed) return null;

  // Reserve space while loading to prevent layout shift
  if (isLoading) return <div className="h-[44px] border-b border-transparent" />;

  if (data?.profile?.phone_number) return null;

  return (
    <div
      role="alert"
      className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
    >
      <Phone className="h-4 w-4 shrink-0" />
      <p className="flex-1">Add your WhatsApp number to receive event reminders and updates.</p>
      <button
        type="button"
        onClick={() => navigate('/dashboard/profile')}
        className="shrink-0 rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700"
      >
        Complete Profile
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-md p-1 text-amber-600 hover:bg-amber-100"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
