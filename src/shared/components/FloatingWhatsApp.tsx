import { useLocation } from 'react-router-dom';
import { WhatsAppIcon } from '@/shared/components/icons/WhatsAppIcon';
import { WHATSAPP_URL } from '@/shared/constants/contact';
import { isWidgetHidden } from '@/shared/utils/floatingWhatsApp';

const FloatingWhatsApp = () => {
  const { pathname } = useLocation();

  if (isWidgetHidden(pathname)) return null;

  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact TrafficMENA on WhatsApp"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-[calc(1rem+env(safe-area-inset-left))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-2"
    >
      <WhatsAppIcon className="h-7 w-7" aria-hidden="true" />
    </a>
  );
};

export default FloatingWhatsApp;
