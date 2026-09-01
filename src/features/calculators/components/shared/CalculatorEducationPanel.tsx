import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';

export type EducationBullet = {
  label?: string;
  text: string;
  tier?: 'loss' | 'breakeven' | 'good' | 'excellent';
};

export type EducationTable = {
  headers: string[];
  rows: string[][];
};

export type EducationSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: EducationBullet[];
  formula?: string;
  note?: string;
  table?: EducationTable;
};

type CalculatorEducationPanelProps = {
  slug: string;
  values?: Record<string, string>;
};

const BULLET_TIER_CLASS: Record<NonNullable<EducationBullet['tier']>, string> = {
  loss: 'bg-performance-loss',
  breakeven: 'bg-performance-breakeven',
  good: 'bg-performance-good',
  excellent: 'bg-performance-excellent',
};

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['strong', 'em', 'br', 'span'],
  ALLOWED_ATTR: ['class'],
};

function renderRichText(text: string, values?: Record<string, string>) {
  const interpolated = values ? text.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '') : text;
  const sanitized = DOMPurify.sanitize(interpolated, SANITIZE_CONFIG);
  return (
    <span
      // biome-ignore lint/security/noDangerouslySetInnerHtml: calculator education copy is sanitized
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}

function EducationBulletItem({ bullet }: { bullet: EducationBullet }) {
  const dotClass = bullet.tier ? BULLET_TIER_CLASS[bullet.tier] : 'bg-primary-green';

  return (
    <li className="flex items-start gap-2">
      <span className={`w-2 h-2 rounded-full ${dotClass} mt-2 shrink-0`} />
      <span className="text-neutral-600">
        {bullet.label ? (
          <>
            <strong className="text-neutral-800">{bullet.label}</strong> {bullet.text}
          </>
        ) : (
          renderRichText(bullet.text)
        )}
      </span>
    </li>
  );
}

export function CalculatorEducationPanel({ slug, values }: CalculatorEducationPanelProps) {
  const { t } = useTranslation('calculators');
  const sections = t(`calcs.${slug}.education.sections`, {
    returnObjects: true,
    defaultValue: [],
  }) as EducationSection[];

  if (!Array.isArray(sections) || sections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 lg:space-y-6" dir="auto">
      {sections.map((section, index) => (
        <section key={`${slug}-edu-${index}`}>
          <h2
            className={
              index === 0
                ? 'text-xl lg:text-2xl font-semibold text-neutral-800 mb-4'
                : 'text-lg lg:text-xl font-semibold text-neutral-800 mb-4'
            }
          >
            {section.heading}
          </h2>

          {section.paragraphs?.map((paragraph, pIndex) => (
            <p
              key={`${slug}-edu-${index}-p-${pIndex}`}
              className={`text-neutral-600 leading-relaxed${pIndex > 0 ? ' mt-4' : ''}`}
            >
              {renderRichText(paragraph, values)}
            </p>
          ))}

          {section.formula ? (
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl p-4 font-mono text-sm mt-4">
              <code className="text-neutral-800">{section.formula}</code>
            </div>
          ) : null}

          {section.bullets && section.bullets.length > 0 ? (
            <ul className="space-y-3 text-neutral-600 mt-4">
              {section.bullets.map((bullet, bIndex) => (
                <EducationBulletItem key={`${slug}-edu-${index}-b-${bIndex}`} bullet={bullet} />
              ))}
            </ul>
          ) : null}

          {section.table ? (
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs lg:text-sm">
                <thead>
                  <tr className="border-b border-neutral-200">
                    {section.table.headers.map((header) => (
                      <th
                        key={header}
                        className="text-start py-2 px-2 font-medium text-neutral-500 first:ps-0"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-neutral-600">
                  {section.table.rows.map((row, rowIndex) => (
                    <tr
                      key={`${slug}-edu-${index}-row-${rowIndex}`}
                      className={
                        rowIndex < section.table!.rows.length - 1
                          ? 'border-b border-neutral-100'
                          : undefined
                      }
                    >
                      {row.map((cell, cellIndex) => (
                        <td key={`${slug}-edu-${index}-cell-${cellIndex}`} className="py-2 px-2 first:ps-0">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {section.note ? (
            <p className="text-neutral-600 leading-relaxed mt-4 text-sm">{section.note}</p>
          ) : null}
        </section>
      ))}
    </div>
  );
}
