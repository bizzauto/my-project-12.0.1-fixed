# Code Review: BizzAuto Project

> **Review Date:** May 21, 2026
> **Scope:** All source files (src/) — 33,881 total lines across ~95 files
> **Depth:** Deep (cross-file analysis)
> **Methodology:** Manual static analysis

---

## Finding Summary

| Severity | Count | Key Areas |
|----------|-------|-----------|
| 🔴 **Critical** | 7 | Security, data exposure, auth bypass risks |
| 🟠 **High** | 11 | Potential bugs, inconsistent patterns, missing validation |
| 🟡 **Medium** | 9 | Code quality, duplication, cleanup opportunities |
| 🔵 **Info** | 6 | Architecture notes, best practice suggestions |

---

## 🔴 Critical Findings

### C-01: `// @ts-nocheck` Disables Type Safety Across Key Files

**Files:** `src/server/routes/auth.ts`, `src/server/routes/whatsapp.ts`, `src/server/routes/leads.ts`, `src/components/LoginPage.tsx`

**Risk:** High — Bypasses all TypeScript type checking, masking potential type errors, undefined access, and API misuse.

**Details:** Multiple critical files use `// @ts-nocheck` at the top, disabling all TypeScript safety. This means:
- `req.body` properties are accessed without validation of shape
- Response objects may be missing required fields
- Refactoring becomes dangerous — no compile-time errors

**Recommendation:** Remove `// @ts-nocheck` and properly type all request handlers. Use Zod or the existing `zod` dependency for runtime validation.

---

### C-02: OTP Stored In-Memory — No Persistence, No Rate Limiting

**File:** `src/server/routes/auth.ts` (lines ~390-450)

**Risk:** High — The in-memory `otpStore` Map:
- Is lost on server restart (all active OTPs invalidated)
- Has no rate limiting — attacker can brute-force OTPs
- Has no cleanup mechanism for expired entries (memory leak over time)
- Cannot scale across multiple server instances

```typescript
const otpStore = new Map<string, { otp: string; expiresAt: number }>();
```

**Recommendation:** Use Redis (already a dependency) for OTP storage with TTL. Add rate limiting (max 5 attempts per email per 15 minutes).

---

### C-03: Password Reset Flow Does Not Actually Send Email

**File:** `src/server/routes/auth.ts` — `POST /forgot-password`

**Risk:** High — The endpoint returns `"If an account exists, an OTP has been sent"` but never actually sends an email. The `otpStore` is populated but no email transport is invoked.

```typescript
const otp = crypto.randomInt(100000, 999999).toString();
otpStore.set(email, { otp, expiresAt: Date.now() + 10 * 60 * 1000 });
// No email sent! User never receives OTP.
res.json({ success: true, message: 'If an account exists, an OTP has been sent' });
```

**Recommendation:** Integrate with `EmailService` (already exists in the project) to send the OTP via email.

---

### C-04: Test Endpoints Exposed in All Environments

**File:** `src/server/index.ts` (lines ~169-181)

**Risk:** Medium-High — Test endpoints (`/test-get`, `/test-nobody`, `/test`) are available in production. While they are harmless in this implementation, they represent an attack surface and information leak.

**Recommendation:** Wrap test endpoints in `if (NODE_ENV !== 'production')` block or remove them.

---

### C-05: Forgot-Password User Enumeration via Response Timing

**File:** `src/server/routes/auth.ts` — `POST /forgot-password`

**Risk:** Medium — The endpoint queries the database to check if the user exists before returning the same message. While the response message is the same, timing differences could theoretically be used to enumerate valid emails.

**Recommendation:** Remove the DB query — always set the OTP without checking existence first. The user check should happen at verification time only.

---

### C-06: Hardcoded Fallback JWT Secret

**File:** `src/server/utils/auth.ts` (line 5)

**Risk:** High — If `JWT_SECRET` is not set in environment, the fallback is a hardcoded string `'dev-jwt-secret-do-not-use-in-production'`.

```typescript
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-do-not-use-in-production';
```

**Recommendation:** The warning is good, but in production the app should **refuse to start** if `JWT_SECRET` is not set. Throw an error or use a startup validation.

---

### C-07: Encryption Key Potentially Random on Each Server Start

**File:** `src/server/utils/auth.ts` (line 7)

**Risk:** High — If `ENCRYPTION_KEY` is not set, it generates a random key on **every server start**, making all previously encrypted data (WhatsApp tokens, API keys) permanently undecryptable.

```typescript
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
```

**Recommendation:** Same as C-06 — validate critical secrets at startup. If `ENCRYPTION_KEY` is missing, log a clear error and exit.

---

## 🟠 High Findings

### H-01: `prisma['autoReply']` Bracket Notation — Potential Runtime Error

**Files:** `src/server/routes/whatsapp.ts` (multiple locations)

**Risk:** High — Uses bracket notation `prisma['autoReply']` to access the Prisma model. If the Prisma model is named differently in the schema (e.g., `auto_reply` or `AutoReply`), this will throw a runtime error.

**Recommendation:** Verify the exact model name in `prisma/schema.prisma` and use dot notation with proper typing instead.

---

### H-02: Lead Capture Endpoints Have No Authentication

**Files:** `src/server/routes/leads.ts` — `POST /indiamart/:businessId`, `POST /justdial/:businessId`, `POST /facebook/:businessId`, `POST /instagram/:businessId`, `POST /capture/:businessId`

**Risk:** Medium — These webhook endpoints accept POST data with a `businessId` parameter but have no authentication. Anyone who discovers a business ID can submit fake leads.

**Recommendation:** Add HMAC signature verification or IP whitelisting for webhook endpoints. The `capture/:businessId` endpoint is intentionally public (website forms), so use rate limiting there.

---

### H-03: Public Lead Capture Auto-Replies Silently Fail

**File:** `src/server/routes/leads.ts` — `POST /capture/:businessId`

**Risk:** Medium — Auto-reply WhatsApp/Email failures are caught silently:
```typescript
} catch (e: any) {
  console.error('Auto-reply WhatsApp failed:', e.message);
}
```

**Recommendation:** Log failures with structured logging (use the Winston logger, not console.error). Consider a retry queue via BullMQ (already a dependency).

---

### H-04: `forgot-password` and `verify-otp` Use Synchronous In-Memory Operations

**File:** `src/server/routes/auth.ts`

**Risk:** Medium — OTP verification is purely in-memory with no audit trail. No record of who requested password resets or when.

**Recommendation:** Log all password reset attempts with email, timestamp, IP address, and success/failure status.

---

### H-05: Login Error Messages Reveal Whether User Exists

**File:** `src/server/routes/auth.ts` — `POST /login`

**Risk:** Low-Medium — The error message `'Invalid email or password'` is correct (same for wrong email or wrong password), but the initial 2FA check reveals whether a user exists:
```typescript
// Check if 2FA is enabled
if (user.twoFactorEnabled) {
```

An attacker would know the email exists if they get a 2FA prompt vs. a generic error.

**Recommendation:** Apply consistent timing and response regardless of 2FA status.

---

### ~~H-06: LoginPage Has `@ts-nocheck` and Global API Exposure~~ ✅ **RESOLVED**

**File:** `src/components/LoginPage.tsx`

**Risk:** Medium — The component exposes the API client globally.

**Change:** Commit `ff03955` removed `@ts-nocheck` and all `window.apiClient` global assignments from `LoginPage.tsx`. The file now uses `useAuthStore` for login with no debug artifacts.

---

### H-07: WhatsApp Webhook `/webhook/:businessId` — No Token Verification

**File:** `src/server/routes/whatsapp.ts`

**Risk:** Medium — The webhook endpoint only verifies `hub.verify_token` for the initial handshake, but incoming message payloads are not authenticated. Anybody who knows a business ID can POST fake webhook data.

**Recommendation:** Use the stored `waWebhookSecret` to verify webhook payload signatures using HMAC-SHA256 as per Meta's webhook security guidelines.

---

### H-08: Multiple `window.location` Usage Can Cause SSR/Capricorn Issues

**File:** Various frontend components

**Risk:** Low-Medium — Direct usage of `window.location.pathname` in `AppWrapper.tsx` and other components can cause issues in server-side rendering or static generation contexts.

**Recommendation:** Use React Router's `useLocation()` hook consistently instead of `window.location`.

---

### H-09: Compression Middleware Imported But Disabled

**File:** `src/server/index.ts` (line ~42)

**Risk:** Low — `compression` is imported but commented out:
```typescript
// app.use(compression());
```

This means all API responses are sent uncompressed, increasing bandwidth usage.

**Recommendation:** Enable compression, especially for JSON API responses. Consider `res.compress()` selectively or enable globally.

---

### H-10: Graceful Shutdown `process.exit(0)` Prevents Final Log Flush

**File:** `src/server/index.ts` — SIGTERM handler

**Risk:** Low — `process.exit(0)` immediately terminates the process without waiting for Winston logger buffer flush.

**Recommendation:** Use `logger.on('finish', () => process.exit(0))` after calling `logger.end()` to ensure final logs are written.

---

### H-11: WhatsApp Template Deletion Via Meta API Uses Client-Provided ID

**File:** `src/server/routes/whatsapp.ts` — `DELETE /templates/:id`

**Risk:** Medium — The route accepts an `id` parameter and uses it directly in the Meta API call URL without validating that it belongs to the user's business:
```typescript
await axios.delete(`https://graph.facebook.com/v18.0/${id}`, ...);
```

While the access token scopes the request, this is fragile. A malformed ID could expose internal errors.

**Recommendation:** Validate that the ID starts with the expected template ID prefix or fetch the template first to verify ownership.

---

## 🟡 Medium Findings

### M-01: Duplicate CSS Definitions in `src/index.css`

**File:** `src/index.css`

**Details:** Multiple CSS classes and keyframes are defined twice:
- `@keyframes shimmer` (lines 110-115 and lines 387-393)
- `@keyframes float` (lines 105-109 and lines 397-402)
- `.gradient-text` (lines 52-57 and lines 358-364)
- `.hover-lift` (lines 82-86 and lines 371-377)
- `.shimmer` (lines 110-115 and lines 387-393)
- `:focus-visible` (lines 130-134 and lines 248-252)
- `.animate-float` (lines 105-109 and lines 397-402)

Each duplicate has slightly different values, so the last one defined will win. This means some intended styles are silently overridden.

**Recommendation:** Consolidate into a single definition per class/keyframe. Use CSS custom properties for shared animation values.

---

### M-02: `&#8377;` HTML Entity Used in JSX

**File:** `src/components/DashboardPage.tsx` (line ~145)

```typescriptx
<p className="font-medium text-gray-900 dark:text-white">
  {contact.dealValue ? `&#8377;${contact.dealValue.toLocaleString()}` : '-'}
</p>
```

**Issue:** JSX renders HTML entities literally in text interpolations. `&#8377;` will display as the literal string `&#8377;` rather than the ₹ symbol.

**Recommendation:** Use the Unicode character directly: `\u20B9` or `₹` in a string template literal.

---

### M-03: DashboardPage HTML Entity Render Issue

**File:** `src/components/DashboardPage.tsx` — Similar to M-02, the `&apos;` entity used in:
```typescriptx
<p>Here&apos;s what&apos;s happening with your business today.</p>
```

While `&apos;` works in JSX text content, this is an inconsistency — other parts of the codebase use template literals.

---

### M-04: Leads CSV Export Has No Row Limit

**File:** `src/server/routes/leads.ts` — `POST /export/csv`

**Issue:** The CSV export fetches all leads without pagination. A business with 50,000 contacts would get a massive response that could crash the server or browser.

**Recommendation:** Add streaming or pagination. Stream CSV rows or limit to a configurable max (e.g., 10,000 rows) with a warning.

---

### M-05: `leadsByMonth` GroupBy on `createdAt` Returns Individual Timestamps

**File:** `src/server/routes/leads.ts` — `GET /leads/stats`

**Issue:** The `prisma.contact.groupBy({ by: ['createdAt'] })` groups by the full timestamp, not by month. This will return one group per unique timestamp rather than monthly aggregates.

```typescript
prisma.contact.groupBy({
  by: ['createdAt'], // Should group by month, not full timestamp
  where: { businessId },
  _count: true,
});
```

**Recommendation:** Use raw SQL or Prisma's `$queryRaw` to group by month, or add a `createdAtMonth` computed field to the schema.

---

### M-06: Auth Middleware Updates `lastLoginAt` on Every Authenticated Request

**File:** `src/server/middleware/auth.ts` (line ~48)

**Issue:** The `authenticate` middleware updates `lastLoginAt` on **every** request, not just login:
```typescript
await prisma.user.update({
  where: { id: user.id },
  data: { lastLoginAt: new Date() },
});
```

This causes an unnecessary DB write on every API call and makes the `lastLoginAt` field meaningless.

**Recommendation:** Remove this from the middleware. `lastLoginAt` should only be updated in the login route.

---

### M-07: Dynamic Import Inside Request Handlers

**Files:** `src/server/routes/auth.ts` (login), `src/server/routes/leads.ts` (bulk-reply, sheets export), `src/server/middleware/auth.ts`

**Issue:** Dynamic `import()` calls inside request handlers add latency and potential race conditions:
```typescript
const { TwoFactorService } = await import('../services/twoFactor.service.js');
const { GoogleSheetsService } = await import('../services/google-sheets.service.js');
```

**Recommendation:** Move these to top-level imports where possible. Only use dynamic imports for genuinely optional dependencies (like plugin-based architectures).

---

### M-08: `EvolutionApiService` Saves Messages Without Contact ID

**File:** `src/server/services/evolution.service.ts` — `sendText` method

**Issue:** When sending messages via Evolution API, the message is saved without a `contactId`:
```typescript
await prisma.message.create({
  data: {
    businessId,
    direction: 'outbound',
    type: 'text',
    content: message,
    waMessageId: response.data?.key?.id,
    status: 'sent',
  },
});
```

This means sent messages won't appear in conversation threads.

**Recommendation:** Look up or upsert the contact by phone number before saving the message.

---

### M-09: No Rate Limiting on Auth Endpoints

**Files:** `src/server/routes/auth.ts` — Login, Register, Forgot Password

**Issue:** None of the authentication endpoints have rate limiting. An attacker can:
- Brute-force passwords via login
- Flood the registration endpoint
- Repeatedly request password resets

**Recommendation:** Add rate limiting using `express-rate-limit` or the existing Redis service. Recommended limits:
- Login: 5 attempts per IP per minute
- Register: 3 attempts per IP per hour
- Forgot Password: 3 attempts per email per hour

---

## 🔵 Info Findings

### I-01: Well-Architected Route/Service Separation

**Observation:** The project follows a clean architecture pattern:
- Routes handle HTTP concerns (validation, response formatting)
- Services contain business logic
- Middleware handles cross-cutting concerns (auth, rate limiting)
- Prisma provides type-safe database access

This is a solid foundation that makes the codebase maintainable.

---

### I-02: Good Use of Zustand for State Management

**Observation:** The use of Zustand for both `authStore` and `themeStore` is appropriate — lightweight, performant, and simple. The stores are well-structured with clear actions and proper localStorage persistence.

---

### I-03: Evolution API Service Is Well-Encapsulated

**Observation:** The `EvolutionApiService` class is a good example of a well-encapsulated service. It handles:
- Instance lifecycle (create, connect, disconnect, delete)
- Message sending (text, media, templates, bulk)
- Webhook processing
- Contact management

The `encrypt`/`decrypt` usage for tokens is good security practice.

---

### I-04: Comprehensive API Client Abstraction

**Observation:** `src/lib/api.ts` provides a well-organized client with:
- Axios interceptors for token injection
- Centralized error handling
- Per-feature API modules (auth, contacts, leads, whatsapp, etc.)
- TypeScript-friendly pattern

---

### I-05: Production Build Configuration Is Production-Ready

**Observation:** `vite.config.ts` has good production settings:
- JS chunk splitting with `manualChunks`
- ESM target
- CSS minification
- Proper output directory structure (`dist/client/` for frontend, `dist/server/` for backend)

---

### I-06: CSRF Protection Is Implemented

**Observation:** The `csrf.service.ts` middleware generates and validates CSRF tokens. This is a good security practice, though it's only active in the auth middleware and may not cover all state-changing endpoints.

---

## Recommendations by Priority

### Immediate Fixes (Security-Critical)
1. Remove `// @ts-nocheck` from route files and add proper types
2. Move OTP storage to Redis with TTL and rate limiting
3. Implement forgot-password email sending via `EmailService`
4. Remove test endpoints from production
5. Add startup validation for `JWT_SECRET` and `ENCRYPTION_KEY`

### Short-Term (High Impact)
6. Fix HTML entity rendering in Dashboard (`&#8377;`)
7. Remove `lastLoginAt` update from auth middleware
8. ~~Remove global `window.apiClient` assignments from LoginPage~~ ✅ **RESOLVED** (commit `ff03955`)
9. Consolidate duplicate CSS in `index.css`
10. Add rate limiting to auth endpoints

### Medium-Term (Code Quality)
11. Verify `prisma['autoReply']` model name in Prisma schema
12. Fix leads stats grouping by month
13. Add pagination/streaming for CSV exports
14. Move dynamic `import()` calls to top-level
15. Enable compression middleware

---

## Files with Most Issues

| File | Lines | Issues |
|------|-------|--------|
| `src/server/routes/auth.ts` | 459 | C-02, C-03, C-05, H-05, H-09, M-09 |
| `src/server/routes/whatsapp.ts` | 1,310 | C-01, H-01, H-07, H-11 |
| `src/index.css` | 500+ | M-01 (duplicate definitions) |
| `src/server/routes/leads.ts` | 597 | C-01, H-02, H-03, M-04, M-05 |
| `src/components/LoginPage.tsx` | 202 | C-01, H-06 |
| `src/server/middleware/auth.ts` | 209 | M-06 |
| `src/components/DashboardPage.tsx` | 426 | M-02, M-03 |
| `src/server/index.ts` | 237 | C-04, H-09, H-10 |

---

## Overall Assessment

The codebase is **functionally complete** with good architectural patterns (route/service separation, Zustand stores, Prisma ORM). The main concerns are:

1. **Security gaps in auth flow** — OTP handling, password reset, missing rate limiting
2. **TypeScript bypass** — `@ts-nocheck` in critical server files removes the safety net
3. **CSS debt** — Duplicate definitions will cause visual inconsistencies
4. **Observability** — Scattered `console.error` logging instead of structured Winston usage

The project has a solid foundation but needs a focused security pass before production deployment.
