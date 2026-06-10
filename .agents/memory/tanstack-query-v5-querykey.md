---
name: TanStack Query v5 queryKey required in UseQueryOptions
description: Passing a query options object to orval-generated hooks requires an explicit queryKey field.
---

In TanStack Query v5 (`@tanstack/react-query@5.x`), `UseQueryOptions` requires `queryKey`. When passing `{ query: { retry: false, ... } }` to an orval-generated hook, TypeScript will error unless you include the key.

Fix: pass the generated key getter as `queryKey`:

```typescript
useGetActivePass(id, {
  query: {
    queryKey: getGetActivePassQueryKey(id),
    retry: false,
    refetchOnWindowFocus: false,
  },
});
```

Every orval-generated query has a matching `getXxxQueryKey(...)` export. Use it both here and when calling `queryClient.invalidateQueries({ queryKey: getXxxQueryKey(id) })`.

**Why:** TanStack Query v5 made `queryKey` a required field in `UseQueryOptions` (non-optional), whereas v4 had it optional.
