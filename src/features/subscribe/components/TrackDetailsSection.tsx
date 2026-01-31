import { BookOpen, Gift, Megaphone } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
  CONTENT_MARKETING_BONUS,
  CONTENT_MARKETING_SESSIONS,
  PERFORMANCE_MARKETING_BONUS,
  PERFORMANCE_MARKETING_SESSIONS,
} from '../content';

type Session = {
  number: number;
  topic: string;
};

function SessionTable({ sessions }: { sessions: Session[] }) {
  return (
    <div className="space-y-1">
      {sessions.map((session, i) => (
        <div
          key={session.number}
          className={cn(
            'grid grid-cols-[2.5rem_1fr] gap-4 px-4 py-3 rounded-lg transition-colors',
            i % 2 === 0 ? 'bg-neutral-50/80' : 'bg-white',
          )}
        >
          <span className="text-sm font-semibold text-neutral-400">{session.number}</span>
          <span className="text-sm text-neutral-700">{session.topic}</span>
        </div>
      ))}
    </div>
  );
}

function BonusSection({ items }: { items: string[] }) {
  return (
    <div className="mt-6 rounded-xl bg-gradient-to-r from-amber-50 to-amber-50/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="h-4 w-4 text-amber-600" />
        <span className="text-sm font-semibold text-amber-800">BONUS: Offline Day Materials</span>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-amber-700">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrackCard({
  title,
  description,
  sessions,
  bonus,
  icon: Icon,
  outcome,
}: {
  title: string;
  description: string;
  sessions: Session[];
  bonus: string[];
  icon: typeof BookOpen;
  outcome: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 transition-all duration-300 hover:shadow-lg">
      <div className="flex items-start gap-4 mb-6">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#05ef62]/20 to-[#29cf9f]/10">
          <Icon className="h-6 w-6 text-[#05ef62]" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-neutral-900">{title}</h3>
          <p className="mt-1 text-sm text-neutral-600">{description}</p>
        </div>
      </div>

      <SessionTable sessions={sessions} />
      <BonusSection items={bonus} />

      <div className="mt-6 rounded-xl bg-neutral-900 p-4">
        <p className="text-sm text-white/90">
          <span className="font-semibold text-[#05ef62]">Outcome:</span> {outcome}
        </p>
      </div>
    </div>
  );
}

export function TrackDetailsSection() {
  return (
    <section className="relative w-full overflow-hidden rounded-[28px] border border-neutral-200 bg-neutral-50 p-6 shadow-[0_10px_35px_-18px_rgba(16,16,16,0.45)] sm:p-8">
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <span className="text-sm font-normal text-neutral-500">Premium Content</span>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          Everything You Get With Premium
        </h2>
        <p className="mt-3 text-sm text-neutral-600">
          Two complete learning tracks designed to make you a specialized marketer
        </p>
      </div>

      <div className="relative z-10 mt-10 grid gap-8 lg:grid-cols-2">
        <TrackCard
          title="Content Marketing Track"
          description="6 sessions + offline day materials"
          sessions={CONTENT_MARKETING_SESSIONS}
          bonus={CONTENT_MARKETING_BONUS}
          icon={BookOpen}
          outcome="Build a content system that attracts, engages, and converts, with a portfolio to prove you can do it."
        />

        <TrackCard
          title="Performance Marketing Track"
          description="7 sessions + offline day materials"
          sessions={PERFORMANCE_MARKETING_SESSIONS}
          bonus={PERFORMANCE_MARKETING_BONUS}
          icon={Megaphone}
          outcome="Master paid advertising across Meta, Google, TikTok, and Snapchat, plus learn how to scale campaigns and even build an agency."
        />
      </div>
    </section>
  );
}
