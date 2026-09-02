import { activateDueNotificationCampaigns } from '../services/notifications/campaigns.js';
import { processPendingNotificationDeliveries } from '../services/notifications/worker.js';

const NOTIFICATION_JOB_INTERVAL_MS = 30 * 1000;

let notificationJobInProgress = false;

export function startNotificationDeliveryJob(): void {
  const run = async (trigger: 'startup' | 'interval') => {
    if (notificationJobInProgress) {
      console.warn('[notification-delivery] Previous run still in progress, skipping', {
        trigger,
      });
      return;
    }

    notificationJobInProgress = true;
    try {
      const activated = await activateDueNotificationCampaigns();
      const stats = await processPendingNotificationDeliveries(50);
      if (activated > 0 || stats.claimed > 0) {
        console.info('[notification-delivery] Run complete', {
          trigger,
          activated,
          ...stats,
        });
      }
    } catch (error) {
      console.error('[notification-delivery] Run failed', { trigger, error });
    } finally {
      notificationJobInProgress = false;
    }
  };

  void run('startup');

  setInterval(() => {
    void run('interval');
  }, NOTIFICATION_JOB_INTERVAL_MS);

  console.log('[server] Notification delivery job scheduled (every 30 seconds)');
}
