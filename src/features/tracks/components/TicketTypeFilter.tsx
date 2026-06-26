import type { TicketType } from '@/app/api/payments';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { TICKET_TYPE_LABELS, TICKET_TYPE_ORDER } from '../ticketTypes';

type TicketTypeFilterValue = TicketType | 'all';

type TicketTypeFilterProps = {
  value: TicketTypeFilterValue;
  onChange: (value: TicketTypeFilterValue) => void;
};

// Filter dropdown for the enrolled tables, mirroring the role filter on the admin users page.
export function TicketTypeFilter({ value, onChange }: TicketTypeFilterProps) {
  return (
    <Select onValueChange={(next) => onChange(next as TicketTypeFilterValue)} value={value}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="All ticket types" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All ticket types</SelectItem>
        {TICKET_TYPE_ORDER.map((type) => (
          <SelectItem key={type} value={type}>
            {TICKET_TYPE_LABELS[type]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
