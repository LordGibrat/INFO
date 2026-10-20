# Muza Decors

Production: https://muza-decors.vercel.app
Private administration: https://muza-decors.vercel.app/admin

Kazakh-first responsive storefront and private desktop/mobile order administration. The original PHP draft remains in the repository root.

## Features

- Authentic Instagram portfolio with source links; Kazakh/Russian customer interface.
- Quote requests saved to Neon PostgreSQL with duplicate submission protection.
- Pickup in Oral, local delivery, or manually arranged Kazpost shipping with full recipient/address details.
- Protected admin: search, statuses, notes, shipping cost, tracking, call and WhatsApp links.
- XLSX download and validated upload without a Microsoft account. Only four admin fields can change; stale updates reject the batch.
- Optional delegated Microsoft 365 OneDrive workbook connection and explicit two-way synchronization. Not configured in the published version; see `docs/microsoft-setup.md`.
- No automatic payment processing, shipping labels, messages, or Kazpost booking.

## Development

Node.js 22 or later; npm (keep the lockfile).

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

The development server is http://127.0.0.1:3100. Configure `.env.local` using `.env.example`; never commit secrets. In dotenv files escape the dollar signs in `ADMIN_PASSWORD_HASH` as `\$` because Next.js expands environment variables. Vercel environment values use the raw hash.

`npm run db:migrate` creates the required tables. Run live database tests against a configured database with `RUN_DB_TESTS=1 npm test`; tests remove only their own generated fixtures.

## Deployment

Vercel project `muza-decors` in team `wgs9`; run from this `site/` directory:

```sh
npx vercel deploy --prod --scope wgs9
```

Required production secrets: `DATABASE_URL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`; `SITE_URL` is the canonical HTTPS origin. Admin secrets are shared separately, never in this repository.

Admin sessions are signed, expire after eight hours, and use secure HttpOnly cookies. Production state-changing requests require a trusted Origin. Database counters limit order/login traffic. Excel imports are bounded to 4 MiB and reject formulas, unknown rows, changed customer fields, and stale edits.

## Operations

Use the Kazakh guide inside `/admin`. Download a fresh workbook before editing; after upload download another fresh version for subsequent edits. Keep customer files private. Confirm pricing, shipping availability and completion with customers manually.

Only password-authenticated administrators can access customer orders. The business owner should control admin-password distribution, database retention, and backup/recovery policies. Rotating `SESSION_SECRET` invalidates admin sessions and requires reconnecting any optional Microsoft account.
