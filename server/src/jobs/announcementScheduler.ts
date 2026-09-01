import { publishDueAnnouncements } from '../services/community/announcements.js';

const ANNOUNCEMENT_JOB_INTERVAL_MS = 60 * 1000;

export function startAnnouncementSchedulerJob(): void {
  const run = async () => {
    try {
      const count = await publishDueAnnouncements();
      if (count > 0) {
        console.info(`[announcement-scheduler] Published ${count} scheduled announcement(s)`);
      }
    } catch (error) {
      console.error('[announcement-scheduler] Failed to publish due announcements:', error);
    }
  };

  void run();
  setInterval(run, ANNOUNCEMENT_JOB_INTERVAL_MS);
}
