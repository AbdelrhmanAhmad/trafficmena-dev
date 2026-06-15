import { Hono } from 'hono';
import { csrfMiddleware } from '../../utils/csrf.js';
import { registerAdminMetricsRoutes } from './adminMetrics.js';
import { registerAuthRoutes } from './auth.js';
import { registerEventRoutes } from './events.js';
import { registerInvitationRoutes } from './invitations.js';
import { registerLibraryRoutes } from './library.js';
import { registerCertificateRoutes } from './certificates.js';
import { registerDigitalProductRoutes } from './digitalProducts.js';
import { registerMasterclassRoutes } from './masterclasses.js';
import { registerOrderRoutes } from './orders.js';
import { registerPaymentRoutes } from './payments.js';
import { registerPromoCodeRoutes } from './promoCodes.js';
import { registerSeriesRoutes } from './series.js';
import { registerSeriesGrantsRoutes } from './seriesGrants.js';
import { registerSettingsRoutes } from './settings.js';
import { registerSkillRoutes } from './skills.js';
import { registerSubscriptionRoutes } from './subscriptions.js';
import { registerSubscriptionGrantRoutes } from './subscriptionsGrants.js';
import { registerTrackEnrollmentRoutes } from './trackEnrollments.js';
import { registerTrackRoutes } from './tracks.js';
import { registerUploadRoutes } from './uploads.js';
import { registerUserRoutes } from './users.js';

export function registerApiRoutes(app: Hono) {
  const api = new Hono();

  api.use('*', csrfMiddleware);

  registerAuthRoutes(api);
  registerAdminMetricsRoutes(api);
  registerUserRoutes(api);
  registerEventRoutes(api);
  registerLibraryRoutes(api);
  registerTrackRoutes(api);
  registerTrackEnrollmentRoutes(api);
  registerSeriesRoutes(api);
  registerSeriesGrantsRoutes(api);
  registerSkillRoutes(api);
  registerInvitationRoutes(api);
  registerSettingsRoutes(api);
  registerUploadRoutes(api);
  registerCertificateRoutes(api);
  registerDigitalProductRoutes(api);
  registerMasterclassRoutes(api);
  registerOrderRoutes(api);
  registerPaymentRoutes(api);
  registerPromoCodeRoutes(api);
  registerSubscriptionGrantRoutes(api);
  registerSubscriptionRoutes(api);

  app.route('/api', api);
}
