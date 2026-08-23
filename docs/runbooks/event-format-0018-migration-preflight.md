# Event Format 0018 Migration Preflight

Migration `0018_fast_sleepwalker.sql` backfills the explicit `event_format` column from legacy
location and meeting-link data. Run this gate before applying it to production so the team can
review rows whose delivery mode changes user-visible pricing or access decisions.

## Required Gate

1. Run the report against the production database:
   ```bash
   npm --prefix server run db:preflight:event-format
   ```
2. Store the full output from `preflight_event_format_report.sql` in the deployment ticket. If the
   report returns no rows, record `No event_format preflight rows returned`.
3. Review the output, especially rows marked as behavior
   changes from the old `meetingLink && !location` inference.
4. Confirm a production database backup or provider snapshot exists before running the migration.
5. Record human signoff in the deployment notes before running `0018_fast_sleepwalker.sql`.
6. Run the migration with the guard signoff variables set:
   ```bash
   EVENT_FORMAT_0018_SIGNOFF=preflight-reviewed-backup-confirmed \
   EVENT_FORMAT_0018_SIGNOFF_BY="approver@example.com" \
   npm --prefix server run db:migrate
   ```
7. If signoff is not recorded, stop the migration and resolve the data questions first.

## Signoff Note

Use this exact shape in the deployment ticket:

```text
Human signoff: event_format preflight reviewed for production on YYYY-MM-DD. Approved to run 0018_fast_sleepwalker.sql.
```
