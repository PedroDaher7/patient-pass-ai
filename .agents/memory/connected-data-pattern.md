---
name: Connected data / recentUpdates pattern
description: How "updated since last visit" is implemented in CarePass — DB column, badge detection, provider banner, lastViewedAt.
---

## Rule
`recentUpdates` is a JSONB array on patientsTable: `{ category, label, updatedAt }[]`.
- Patient side writes to it on dialog close (new items only, via pre-edit snapshot diff).
- Provider side reads it + `lastViewedAt` from `GET /api/codes/:code` to show the updates banner.

**Why:** Keeps the feature entirely within the existing save flow; no new endpoints needed.

## How to apply

### API: lastViewedAt
In `codes.ts`, capture the most recent `accessHistoryTable` entry BEFORE inserting the current view. Return it as `lastViewedAt: string | null` in `CodeValidationResult`.

### Patient side: badge detection
- `recentUpdates` is initialized from `patient.recentUpdates` in the formData useEffect.
- A `useEffect([editingSection, formData])` captures a snapshot of `medications/conditions/allergies` names in `useRef` sets when the dialog opens (`prev===null, cur!==null`). On close (`prev!==null, cur===null`) it diffs and appends new entries to `formData.recentUpdates`.
- After any successful save following a dialog close, show toast "Saved. Your providers will see this at your next visit." via a `pendingSaveToast` ref.

### Provider side: comparison
Date-level comparison (not timestamp): `u.updatedAt >= lastViewedDate` where both are `YYYY-MM-DD` strings. This shows today's updates even on a repeat same-day view.

### Seed order matters
Put the "recently added" medication first in the seed array so it appears in the section card preview (which shows only the first 3 items).
