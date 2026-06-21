# Phase 2 Code Review Report

**Reviewed:** 10 files (routes/ + services/ + workers/)
**Date:** ${new Date().toISOString().split('T')[0]}

---

## 1. Executive Summary

| Metric | Count |
|--------|-------|
| Files with `@ts-nocheck` | **7 / 10** |
| Active TypeScript errors | **5** (4 in posters.ts, 1 in ai.service.ts) |
| Clean files | **3** (email.ts, worker.ts, email.service.ts) |
| Logic bugs | **3** (posters field mismatch, reviews isRead, google-business URL) |
| Stub/placeholder implementations | **3** |

---

## 2. TypeScript Status

### 2.1 Files WITH `@ts-nocheck` (need fixing)

| File | Location | Status | Notes |
|------|----------|--------|-------|
| `src/server/routes/posters.ts` | Top + bottom | ❌ | **4 active TS errors** — see §3 |
| `src/server/routes/reviews.ts` | Top + bottom | ❌ | Uses `isRead` field that doesn't exist in Prisma schema |
| `src/server/routes/google-business.ts` | Bottom only (ineffective) | ⚠️ | `@ts-nocheck` is at line 344, **does nothing** — top-level check active |
| `src/server/workers/index.ts` | Top | ❌ | Large file, heavy `any` usage |
| `src/server/services/google-sheets.service.ts` | Top | ❌ | Extensive `as any` casts |
| `src/server/services/lead-capture.service.ts` | Top | ❌ | Returns `Promise<any>` |
| `src/server/services/ai.service.ts` | Line 2 | ❌ | **1 active TS error** — missing `.js` import extension |

### 2.2 Files WITHOUT `@ts-nocheck` (clean) ✅

| File | Notes |
|------|-------|
| `src/server/routes/email.ts` | Already properly typed (fixed in earlier pass) |
| `src/server/worker.ts` | Minimal wrapper, clean |
| `src/server/services/email.service.ts` | Well-typed throughout |

---

## 3. TypeScript Compiler Errors (5 total)

### 3.1 `src/server/routes/posters.ts` — 4 errors

| Line | Error | Field | Issue |
|------|-------|-------|-------|
| 18 | TS2353 | `usageCount` | Doesn't exist in `PosterTemplateOrderByWithRelationInput` |
| 43 | TS2353 | `templateData` | Doesn't exist in `PosterTemplateCreateInput` — field is `content` |
| 54 | TS2353 | `usageCount` | Doesn't exist in `PosterTemplateUpdateInput` |
| 75 | TS2353 | `usageCount` | Doesn't exist in `PosterTemplateUpdateInput` |

**Root cause:** `PosterTemplate` schema (prisma/schema.prisma:1084) has:
- `content` (String) — NOT `templateData`
- No `usageCount` field
- No `thumbnailUrl` field

**Fix needed:** 
1. Add `usageCount` (`Int @default(0)`) and `thumbnailUrl` (`String?`) to the Prisma schema (requires migration)
2. OR rename code to use existing fields (`content` instead of `templateData`)

### 3.2 `src/server/services/ai.service.ts` — 1 error

| Line | Error | Issue |
|------|-------|-------|
| 4 | TS2834 | `import { prisma } from '../../index'` missing `.js` extension |

**Fix:** Change to `import { prisma } from '../../index.js'`

---

## 4. Logic Bugs

### 4.1 `posters.ts` — Field name mismatch with Prisma schema

The code references **3 fields** that don't exist in the PosterTemplate model:
| Code reference | Should be |
|----------------|-----------|
| `templateData` | `content` |
| `usageCount` | Does not exist — add to schema or remove |
| `thumbnailUrl` | Does not exist — add to schema or remove |

Also: `isSystem` references should be `isSystem` — this field **does** exist ✅

### 4.2 `reviews.ts` — `isRead` field doesn't exist

```ts
// Line 13: filter uses non-existent field
if (status) where.isRead = status === 'unread' ? false : true;
```

The Review schema has `isPublished` and `isFeatured`, **not** `isRead`. This query will throw a Prisma runtime error if `isRead` isn't in the schema.

**Fix:** Either:
- Add `isRead` to the Prisma schema, or
- Change to `isPublished` which already exists

Additionally, the boolean logic `status === 'unread' ? false : true` means any non-'unread' value (including typos) sets `isRead: true`. Should validate `status` is one of `['unread', 'read']`.

### 4.3 `google-business.ts` — Wrong URL for reviews endpoint

```ts
// Line ~164: Uses gbpLocationId as account ID in URL
`https://mybusiness.googleapis.com/v4/accounts/${business.gbpLocationId}/reviews`
```

Should be:
```
`https://mybusiness.googleapis.com/v4/accounts/${business.gbpAccountId}/locations/${business.gbpLocationId}/reviews`
```

This affects: `/reviews`, `/reviews/:reviewId/reply`, `/posts`, `/posts/:id`, `/stats`

### 4.4 `workers/index.ts` — LeadProcessingWorker is a stub

```ts
const leadProcessingWorker = new Worker('lead-processing', async (job: Job) => {
  const { businessId, leadData, source } = job.data;
  return { processed: true, source }; // Always returns true, no actual processing
});
```

Doesn't call `LeadCaptureService` or perform any lead processing. Actual lead capture is done inline in webhook handlers.

---

## 5. Type Safety Issues (P2)

### 5.1 `req: any, res: any` used extensively

| File | Occurrences |
|------|-------------|
| `posters.ts` | 7+ handlers |
| `reviews.ts` | 4 handlers |
| `google-business.ts` | 10 handlers |
| `workers/index.ts` | 6 workers + helpers |

**Fix:** Replace with proper `AuthRequest, Response` types and import `authenticate, AuthRequest` from `../middleware/auth.js`.

### 5.2 `as any` casts

| File | Locations |
|------|-----------|
| `google-sheets.service.ts` | `integration.config as any`, `config as any`, multiple spreads |
| `workers/index.ts` | `results as any`, `publishedIds as any`, `scheduled.templateVars as string[]` |
| `lead-capture.service.ts` | `contact.metadata as any`, `Promise<any>` return types |

### 5.3 Dynamic `import()` in request handlers

Multiple files use dynamic `import()` inside request handlers:
```ts
const axios = await import('axios');
const { decrypt } = await import('../utils/auth.js');
```

This adds latency to every request. Move to top-level imports.

---

## 6. Security Observations

| Issue | File | Risk |
|-------|------|------|
| GBP tokens encrypted, but account/location IDs stored in plaintext | `google-business.ts` | Low |
| Dynamic imports (minor latency, not a security vulnerability) | `google-business.ts`, `workers/index.ts` | Low |
| SMTP auth silently fails with cryptic errors if env vars missing | `email.service.ts` | Low |
| WhatsApp auto-reply failures silently swallowed (logged only) | `lead-capture.service.ts` | Medium |
| No rate limiting on Google Sheets API | `google-sheets.service.ts` | Low |
| No validation on social publish tokens before API calls | `workers/index.ts` | Medium |

---

## 7. Stub/Placeholder Implementations

| File | Endpoint/Function | What it returns |
|------|------------------|-----------------|
| `posters.ts` | `/generate` | `via.placeholder.com` URL |
| `posters.ts` | `/:id/download` | `via.placeholder.com` redirect |
| `reviews.ts` | `/sync` | `{ synced: 0, message: 'Integration required' }` |
| `workers/index.ts` | `leadProcessingWorker` | `{ processed: true }` (no actual processing) |

---

## 8. Action Recommendations

### Immediate (fix in 1 session)
1. **Fix 5 TS errors** — `posters.ts` fields + `ai.service.ts` import extension
2. **Fix `reviews.ts` isRead bug** — Add field to schema or change to `isPublished`
3. **Fix google-business.ts `@ts-nocheck` placement** — Remove bottom comment (it does nothing)
4. **Fix google-business.ts GBP URLs** — Use correct API paths

### Short-term (next session)
5. **Remove `@ts-nocheck` from `google-business.ts`** — Already effectively clean, just needs `req: any, res: any` → proper types
6. **Remove `@ts-nocheck` from `reviews.ts`** — After fixing `isRead` bug and adding `AuthRequest` types
7. **Remove `@ts-nocheck` from `ai.service.ts`** — After fixing import extension + verifying types

### Medium-term
8. **Remove `@ts-nocheck` from `posters.ts`** — Requires schema changes or code restructuring
9. **Remove `@ts-nocheck` from `workers/index.ts`** — Heaviest lift, many `any` types
10. **Remove `@ts-nocheck` from service files** — google-sheets.service.ts, lead-capture.service.ts

---

## 9. Comparison with Previous Audits

Compared to the 11 route files already cleaned in previous passes (auth, leads, appointments, automation, chatbot, documents, ecommerce, whatsapp, etc.), these Phase 2 files are at an earlier stage of type-safety maturity:

- The already-fixed files now compile **without `@ts-nocheck`** and use **proper `AuthRequest/Response` types** throughout
- The Phase 2 files still have **7/10 with `@ts-nocheck`** and **3 files with actual TS errors**
- The service-layer files (google-sheets.service.ts, lead-capture.service.ts, ai.service.ts) are the most challenging due to heavy use of dynamic types and JSON/Prisma Json field interactions

---

*Generated by automated code review - ${new Date().toISOString()}*
