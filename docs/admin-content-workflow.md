# Admin Content Workflow — TrafficMENA Hub

**Updated:** 2025-10-20  
**Purpose:** Give the operations team a repeatable way to seed events and library assets now that the admin dashboard supports create/edit flows again.

---

## 1. Before You Start

- **Auth:** Sign in with an admin account. Only admins will see the creation buttons.
- **Assets:** PDFs, slide decks, and images up to **20 MB** can be uploaded straight from the admin forms—files land in the BunnyCDN storage zone configured in `server/.env`. Larger media (e.g. >20 MB video masters) should still be pushed manually and referenced via URL.
- **Event logistics:** Confirm timezones, speaker notes, meeting links, and capacity limits before opening the form.

> Tip: keep a simple checklist in Notion with “asset URL”, “event date”, and “follow‑up owner” so nothing ships half‑ready.

---

## 2. Creating / Editing Events

1. Navigate to **Admin → Events** and click **Create event**.
2. Fill in the essentials:
   - **Title**: keep it specific (“Growth Workshop: MENA Edition”).
   - **Date & time**: the picker stores local time and converts to ISO automatically.
   - **Format & location**: choose Event/Meetup/Mastermind/Retreat, add city or “Online”.
   - **Description**: the TipTap editor accepts formatted text and links. Keep it to the core promise.
 - **Optional**: Zoom/Meet link, capacity, comma-separated tags (max 12), and a cover image. Use the **Upload** button to push JPG/PNG/WebP straight to BunnyCDN—no manual CLI steps required once the Storage Zone credentials live in `server/.env`.
3. Review the live preview on the right; tags and capacity update in real time.
4. Press **Create event**. The dashboard toasts on success and redirects to the detail page.
5. Share the public link (`/meetups/:id`) with marketing or embed it in campaigns.

### Editing or Deleting
- From **Admin → Events**, click **View Details → Edit event**.
- Change fields as required; publish with **Update event**.
- To retire an event, choose **Delete event** and confirm the prompt. This removes the listing and automatically drops the cache.

---

## 3. Creating / Editing Library Assets

1. Navigate to **Admin → Content Library** and click **Add asset** (or **Add Your First Item** if empty).
2. In the form:
   - Pick the **asset type** (Video, Document, Presentation).
   - Provide the matching URL or upload directly:
     - **Video**: YouTube, Vimeo, or direct MP4 link (uploads still manual for large files).
     - **Document**: upload PDFs/PPT/PPTX ≤20 MB or paste an existing URL.
     - **Presentation**: upload deck files (≤20 MB) or use an embed URL (Google Slides “/embed”, etc.) plus optional provider code (`google_slides`, `canva`, …).
   - Use the editor for a concise summary (who, what, key takeaways).
   - Optionally link to the event it belongs to—the dropdown lists the latest 50 events.
3. Save with **Create asset**. You’ll be redirected to the admin detail view where you can double-check the player/iframe.
4. For edits, open the asset from **Admin → Content Library**, choose **Edit**, update links or descriptions, and save.
5. To remove outdated content, hit **Delete asset** and confirm. (Only owners and admins can delete; managers should escalate if clean-up is required.) The list view updates immediately; remember to manually delete any large media you uploaded outside the tool.

> Storage hygiene: assets uploaded through the form live in BunnyCDN. Deleting a library entry only removes the database row—you can remove the underlying file later if you don’t plan to reuse it.

---

## 4. Linking Events and Assets

Linking an asset to an event lets members jump from “Attended” to “Watch replay” in one click.

| Scenario | Recommended Flow |
| --- | --- |
| New workshop with replay | Create the event first → run the session → upload video → add library asset linked to the event |
| Historical resources | Seed library assets with “No linked event”, then update later once the event records exist |
| Slides & templates | Use **Presentation** type, add embed URL, and link to the originating event so members see context |

Members will see associated assets on the event detail screen once the asset is linked.

---

## 5. Post-Publish Checklist

- ✅ Event public page renders without missing images or broken HTML.
- ✅ Calendar entry includes the right timezone and location.
- ✅ Library asset URL loads in an incognito window (no auth leaks).
- ✅ Invitation / CRM tooling updated with the new event link.
- ✅ Runbook entry updated with the asset URL for reference (optional but keeps history tidy).

---

## 6. Troubleshooting

| Issue | Fix |
| --- | --- |
| **Form rejects capacity** | Only whole numbers 1–10,000 are allowed—clear the field if you don’t need a cap. |
| **Embed won’t load** | Convert Google Slides URLs to `/embed`, ensure Vimeo/YouTube links are public. |
| **Asset missing in dropdown** | Events query pulls the newest 50. If you can’t find an older event, paste the event UUID manually. |
| **Auth error** | Verify you’re logged in as an admin. Managers/users have read-only access. |

If the UI fails unexpectedly, capture the toast/error message and raise it in the engineering channel—Hono logs now include full request context for faster triage.

---

## 7. Quick Reference

- Admin dashboard: `/admin/meetups`, `/admin/library`
- Public endpoints leveraged: `/api/events`, `/api/library`
- Storage: BunnyCDN storage zone configured via `BUNNY_STORAGE_*`
- Support channel: `#trafficmena-ops`

Ship the event, publish the replay, learn faster. 🚀

---

## 8. Invite-Only Signup Toggle

- **Location:** Admin dashboard → General Settings card (top of the page). Only owners/admins can modify it; managers can view the setting but the switch is disabled.
- **When enabled:** Public `/signup` is gated. Only invited users can join and they will be signed in automatically once the invitation is activated.
- **When disabled:** Public OTP signup is restored for everyone.

### Operational Notes

1. **Default posture:** Leave invite-only **ON** while we validate the curated onboarding loop.
2. **Monitoring:** Check the “Invitation Activation” metrics panel — “Activated Members” should increase shortly after invites are accepted.
3. **Fallback:** If invitations are accepted but members report they’re not being signed in, flip invite-only **OFF** temporarily. This reverts to the standard OTP flow so nobody is blocked while engineering investigates.
4. **After a rollback:** Post in `#trafficmena-ops` so the team knows to pause new invites until the issue is resolved.

Remember to re-enable invite-only once the underlying issue is fixed so that new members continue through the invitation path.

### Member Experience (Invite-Only ON)

- Invite email → member confirms on `/invitation/:token` → they land directly on **Step 1** of the onboarding wizard (the “Continue with email” splash is skipped automatically).
- The invite email is locked in **Step 2** so members can’t overwrite it; the wizard still collects phone, goals, and challenges as normal.
- Step 5 attempts to activate the invite and create a Better Auth session. If activation falls back to OTP, the member continues through the same screen they would see in the open-signup flow.
- Admin metrics transition `pending → accepted → activated` as these steps complete; use the dashboard counts to confirm nothing is stuck in “pending”.

> If an invite was accepted previously and the member re-opens the link, the wizard resumes at Step 1 with their cached data so operations never lose the profile details gathered during onboarding.
