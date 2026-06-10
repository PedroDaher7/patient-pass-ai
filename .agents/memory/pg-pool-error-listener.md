---
name: pg Pool error listener
description: pg Pool emits 'error' on idle connection failures; without a listener Node.js crashes the process (unhandled EventEmitter error).
---

Node.js EventEmitters throw an uncaught exception when 'error' is emitted with no listener. The pg Pool inherits this — a dropped or TLS-rejected idle connection in production silently crashes the server.

**Rule:** Register a listener on the pool immediately at startup, before the server begins listening.

**Where:** `artifacts/api-server/src/index.ts` — import `pool` from `@workspace/db` and attach:

```typescript
pool.on("error", (err) => {
  logger.error({ err }, "Unexpected database pool error");
});
```

**Why:** In production (Cloud Run / autoscale), pg connections go through TLS with stricter SSL enforcement than dev. Transient connection resets or cert warnings emit errors on idle clients. Without the listener the process crashes, the health check at `/api/healthz` never gets a 200, and the promote step fails.

**How to apply:** Any time a new API server entry point is created that uses `@workspace/db`, add the pool error listener before `app.listen`.
