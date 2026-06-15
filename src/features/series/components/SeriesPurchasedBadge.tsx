import { BadgeCheck } from 'lucide-react';

export default function SeriesPurchasedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
      <BadgeCheck className="h-3.5 w-3.5" />
      تم الشراء
    </span>
  );
}
