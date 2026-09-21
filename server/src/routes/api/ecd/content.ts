import { asc, eq } from 'drizzle-orm';
import type { Hono } from 'hono';
import { db } from '../../../db/client.js';
import {
  ecdPartners,
  ecdSpeakers,
  ecdTicketFeatures,
  ecdTicketPackages,
} from '../../../db/schema/ecd.js';

function serializePackage(
  pkg: typeof ecdTicketPackages.$inferSelect,
  features: Array<typeof ecdTicketFeatures.$inferSelect>,
) {
  return {
    ticketType: pkg.ticketType,
    displayName: pkg.displayName,
    eyebrow: pkg.eyebrow,
    title: pkg.title,
    tagline: pkg.tagline,
    description: pkg.description,
    badge: pkg.badge,
    ctaLabel: pkg.ctaLabel,
    priceCents: pkg.priceCents,
    priceEgp: pkg.priceCents / 100,
    features: features
      .filter((f) => f.ticketType === pkg.ticketType)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((f) => ({
        id: f.id,
        kind: f.kind,
        label: f.label,
        emphasis: f.emphasis === 1,
        sortOrder: f.sortOrder,
      })),
  };
}

/** Public marketing content for the static HTML home + checkout price hydrate. */
export function registerEcdContentRoutes(app: Hono) {
  app.get('/content', async (c) => {
    const [partners, speakers, packages, features] = await Promise.all([
      db
        .select()
        .from(ecdPartners)
        .where(eq(ecdPartners.published, 1))
        .orderBy(asc(ecdPartners.sortOrder), asc(ecdPartners.name)),
      db
        .select()
        .from(ecdSpeakers)
        .where(eq(ecdSpeakers.published, 1))
        .orderBy(asc(ecdSpeakers.sortOrder), asc(ecdSpeakers.name)),
      db.select().from(ecdTicketPackages),
      db.select().from(ecdTicketFeatures).orderBy(asc(ecdTicketFeatures.sortOrder)),
    ]);

    const byType: Record<string, ReturnType<typeof serializePackage>> = {};
    for (const pkg of packages) {
      byType[pkg.ticketType] = serializePackage(pkg, features);
    }

    return c.json({
      data: {
        partners: partners.map((p) => ({
          id: p.id,
          name: p.name,
          logoUrl: p.logoUrl,
          websiteUrl: p.websiteUrl,
          sortOrder: p.sortOrder,
        })),
        speakers: speakers.map((s) => ({
          id: s.id,
          name: s.name,
          role: s.role,
          company: s.company,
          photoUrl: s.photoUrl,
          roomIndex: s.roomIndex,
          speakerType: s.speakerType,
          statusTag: s.statusTag,
          expertise: s.expertise ?? [],
          sessionTitle: s.sessionTitle,
          sessionLabel: s.sessionLabel,
          proof: s.proof,
          featured: s.featured === 1,
          featuredSortOrder: s.featuredSortOrder,
          sortOrder: s.sortOrder,
        })),
        rooms: [
          { index: 0, name: 'Main Stage', color: '#101010', text: '#101010' },
          { index: 1, name: 'Second Stage', color: '#4a5563', text: '#4a5563' },
          {
            index: 2,
            name: 'Acquisition workshops',
            color: '#05ef62',
            text: '#047a32',
          },
          {
            index: 3,
            name: 'CRO & Retention workshops',
            color: '#006681',
            text: '#006681',
          },
          {
            index: 4,
            name: 'Operations & Logistics workshops',
            color: '#ffb020',
            text: '#8a5a00',
          },
        ],
        speakerTypes: ['Founder', 'Operator', 'Executive', 'Specialist'],
        packages: {
          ct: byType.ct ?? null,
          fj: byType.fj ?? null,
        },
      },
    });
  });
}

export { serializePackage };
