---
name: CareForm orval type imports
description: Deep file-path imports from @workspace/api-client-react break Vite and tsc in the careform artifact.
---

Do not use deep path imports like `@workspace/api-client-react/src/generated/api.schemas` or `@workspace/api-client-react/src/custom-fetch` — Vite cannot resolve them and tsc reports them as missing modules.

All generated types (`PatientInput`, `Allergy`, `ActivePass`, etc.) are re-exported from the package root's `index.ts`, so always import from `@workspace/api-client-react` directly.

For types that are NOT exported from the index (e.g. `ApiError` from custom-fetch), define a local structural type instead of importing from the internal file path.

**Why:** The lib package's `package.json` does not declare `exports` subpaths, so only the root index is accessible to consumers in the Vite/tsc resolution chain.
