---
name: PatientInput dynamic form handlers
description: How to write generic form handlers (handleNested, handleArrayChange) for a typed Zod/orval PatientInput without TypeScript overlap errors.
---

TypeScript will reject `prev as Record<string, unknown>` when `prev` is a typed interface like `PatientInput` because there's no index signature. Route through `unknown` first:

```ts
const handleNested = (parent: string, field: string, value: string) => {
  setFormData(prev => {
    if (!prev) return prev;
    const map = prev as unknown as Record<string, unknown>;   // ← through unknown
    const cur = (map[parent] ?? {}) as Record<string, unknown>;
    return { ...prev, [parent]: { ...cur, [field]: value } } as PatientInput;
  });
};
```

Same pattern for array handlers — cast `prev` through `unknown` before indexing by string key, then cast the return value back to `PatientInput`.

**Why:** Strict TypeScript requires types to "sufficiently overlap" for direct `as` casts. The `unknown` intermediate satisfies this without disabling strictness.

**How to apply:** Any time you need dynamic property access on a well-typed form state object.
