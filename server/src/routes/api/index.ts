import { Hono } from 'hono';
import { registerAuthRoutes } from './auth.js';
import { registerEventRoutes } from './events.js';
import { registerInvitationRoutes } from './invitations.js';
import { registerLibraryRoutes } from './library.js';
import { registerSeriesRoutes } from './series.js';
import { registerSettingsRoutes } from './settings.js';
import { registerSkillRoutes } from './skills.js';
import { registerTrackRoutes } from './tracks.js';
import { registerUploadRoutes } from './uploads.js';
import { registerUserRoutes } from './users.js';

export function registerApiRoutes(app: Hono) {
  const api = new Hono();

  registerAuthRoutes(api);
  registerUserRoutes(api);
  registerEventRoutes(api);
  registerLibraryRoutes(api);
  registerTrackRoutes(api);
  registerSeriesRoutes(api);
  registerSkillRoutes(api);
  registerInvitationRoutes(api);
  registerSettingsRoutes(api);
  registerUploadRoutes(api);

  app.route('/api', api);
}
