import { useEffect, useState } from 'react';

// Mirrors the hero of the ECommerce Day site, which Caddy serves as static HTML
// at /ecommerce-day/ (outside the SPA), so links are plain <a>, not <Link>.
const ECD_BASE = '/ecommerce-day';
const EVENT_START = new Date('2026-11-05T10:00:00+02:00').getTime();
const UNITS = ['Days', 'Hours', 'Mins', 'Secs'];

const pad = (n: number) => String(n).padStart(2, '0');

function useCountdown(target: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const diff = target - now;
  if (diff <= 0) return null;
  return [
    String(Math.floor(diff / 86_400_000)),
    pad(Math.floor((diff / 3_600_000) % 24)),
    pad(Math.floor((diff / 60_000) % 60)),
    pad(Math.floor((diff / 1000) % 60)),
  ];
}

const mono = "font-['JetBrains_Mono',monospace]";
const badge = `${mono} inline-flex items-center gap-2 rounded-full border px-4 py-[9px] text-[12px] uppercase tracking-[0.08em]`;

export function EcdHero() {
  const countdown = useCountdown(EVENT_START);

  return (
    <section className="font-['Manrope',system-ui,-apple-system,sans-serif] leading-normal text-[#1e2422] antialiased">
      <div
        className={`${mono} mb-[14px] inline-flex items-center gap-[10px] text-[12px] uppercase tracking-[0.14em] text-[#7a827d]`}
      >
        Powered by TrafficMENA
      </div>
      <h1 className="mb-[28px] text-[clamp(40px,8vw,88px)] font-extrabold leading-[0.95] tracking-[-0.02em]">
        ECOMMERCE DAY
      </h1>

      <div className="mb-[26px] flex flex-wrap gap-[10px]">
        <span className={`${badge} border-[#d5dae0] bg-white`}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 10h18" />
          </svg>
          5 November 2026
        </span>
        <span className={`${badge} border-[#d5dae0] bg-white`}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          Creativa Innovation Hub, Giza
        </span>
        <span className={`${badge} border-[#bfefcf] bg-[#eafbf0] text-[#04c44e]`}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#04C44E"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
          </svg>
          Where MENA Ecommerce Meets Global Minds
        </span>
      </div>

      <div className="grid grid-cols-1 items-center gap-10 min-[901px]:grid-cols-[1.05fr_0.95fr] min-[901px]:gap-[52px]">
        <div className="order-2 min-[901px]:order-none">
          <h2 className="mb-[18px] text-[clamp(28px,3.4vw,40px)] font-extrabold leading-[1.16] tracking-[-0.01em]">
            Step Into the Ecommerce Growth Ecosystem
          </h2>
          <p className="mb-[30px] max-w-[56ch] text-[18px] leading-[1.7] text-[#4b534e]">
            Learn from MENA and global leaders through real decisions, expert sessions, and focused
            workshops.
            <br />
            Network with the operators, platforms, and partners shaping ecommerce growth.
          </p>

          <div className="mb-[34px] flex flex-col items-stretch gap-5 min-[521px]:flex-row min-[521px]:flex-wrap min-[521px]:items-center">
            <a
              href={`${ECD_BASE}/tickets.html`}
              className="inline-flex min-h-[52px] items-center justify-center gap-2 whitespace-nowrap rounded-[12px] border-[1.5px] border-[#05ef62] bg-[#05ef62] px-[30px] text-[15px] font-bold text-[#12291b] transition-[background,color,box-shadow] duration-150 hover:bg-[#20f374] hover:text-[#12291b] hover:shadow-[0_14px_40px_rgba(16,16,16,0.08)]"
            >
              Get Your Ticket
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </a>
            <a
              href={`${ECD_BASE}/`}
              className="text-[15px] font-bold text-[#04c44e] underline underline-offset-4"
            >
              View ECommerce Day
            </a>
          </div>

          <div>
            <div
              className={`${mono} mb-[10px] text-[11px] uppercase tracking-[0.12em] text-[#7a827d]`}
            >
              ECommerce Day starts in
            </div>
            {countdown ? (
              <div className="flex flex-wrap gap-[10px]">
                {countdown.map((value, i) => (
                  <div
                    key={UNITS[i]}
                    className="min-w-[66px] rounded-[12px] bg-[#1e2422] px-[6px] py-3 text-center text-white"
                  >
                    <div className="text-[24px] font-extrabold tabular-nums text-[#05ef62]">
                      {value}
                    </div>
                    <div className="mt-[2px] text-[9px] uppercase tracking-[0.08em] text-[#b9c2bc]">
                      {UNITS[i]}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="my-4 inline-block rounded-[12px] bg-[#eafbf0] px-5 py-3 text-[18px] font-extrabold text-[#04c44e]">
                ECommerce Day is live
              </div>
            )}
          </div>
        </div>

        <div className="relative order-1 min-[901px]:order-none">
          <div className="aspect-[4/3] overflow-hidden rounded-[28px] border border-[#e6eaee] shadow-[0_30px_70px_rgba(16,16,16,0.12)]">
            <img
              src={`${ECD_BASE}/assets/hero-ground-logo.webp`}
              width={1254}
              height={1254}
              alt="Aerial view of the venue plaza with the TrafficMENA mark"
              className="h-full w-full object-cover"
              fetchPriority="high"
              decoding="async"
            />
          </div>
          <div className="absolute bottom-[-18px] left-[-6px] flex items-center gap-[10px] rounded-[14px] border border-[#e6eaee] bg-white px-[18px] py-[14px] shadow-[0_14px_40px_rgba(16,16,16,0.08)]">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#04C44E"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
            </svg>
            <div>
              <div className="text-[15px] font-extrabold leading-[1.2]">Real Operators</div>
              <div className="text-[11px] text-[#7a827d]">Not theory, not recycled slides</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
