---
name: Drizzle field-rename without column rename
description: How to rename a Drizzle ORM field name in TypeScript without renaming the underlying DB column (avoids migration).
---

Rename only the JS field name while keeping the existing SQL column name to avoid any data-loss migration:

```ts
// Before:
gender: text("gender").notNull(),

// After (same DB column, new TS name):
biologicalSex: text("gender").notNull(),
```

`pnpm --filter @workspace/db run push` will see no schema change (column name unchanged) so it applies nothing and succeeds immediately.

**Why:** Useful when an existing NOT NULL column needs to be semantically renamed in the API/TS layer (e.g. gender → biologicalSex) without a real DB migration that could cause issues with existing rows.

**How to apply:** Change only the TS identifier; the string argument to `text()` stays the same as the existing column name.
