# Vennzya Fashion Hub

E-commerce storefront and admin for **Vennzya Fashion Hub** — an Indian online retailer selling
women's clothing, jewellery and fashion accessories.

Built as a modular monolith: one Next.js deployment, split internally into feature modules
(`src/modules/<domain>`) so a bug is traceable to one place.

---

## What's built

**Storefront**

- Home, About, Contact, FAQ, Testimonials
- Shop catalogue with URL-driven search, filters (category, price, size, colour, metal, stone),
  sorting and crawlable pagination
- Category pages, product pages with stock-aware variant selection and image gallery
- Cart (persists across reloads), checkout, order confirmation
- Policy pages (privacy, terms, shipping, returns) editable from the admin without a deploy
- WhatsApp enquiry links throughout

**Commerce**

- GST-inclusive pricing with a correct CGST/SGST vs IGST split based on place of supply
- Sequential, gapless GST invoice numbers per financial year (`VFH-2627-00001`)
- Coupons: percentage/flat, minimum order, caps, expiry, total and per-customer usage limits
- Razorpay (UPI / cards / netbanking) **and** Cash on Delivery
- Oversell-proof stock: atomic conditional decrement inside the order transaction, with every
  stock change journalled in `StockMovement`
- Transactional email (Resend): order confirmed on COD placement or online capture, shipped when
  admin attaches tracking. Without `RESEND_API_KEY` the send is logged, not attempted, so local
  checkout still works. Preview the templates with `pnpm email:dev`
- Idempotent payment confirmation — the browser callback and the Razorpay webhook both converge
  on one guarded state transition, so a closed tab or a redelivered webhook can't double-process

**Admin** (`/admin`)

- Staff sign-in, route protection, dashboard (today's revenue, orders to fulfil, COD to collect,
  low stock, new messages)
- Role and per-capability permissions (owner vs staff), staff invites, audit log on every mutation

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, RSC) · React 19 · TypeScript (strict) |
| API | tRPC v11 + TanStack Query (REST route handlers only for webhooks) |
| Database | PostgreSQL + Prisma 7 |
| Auth | Better Auth (staff email/password; phone-OTP wired for customers) |
| Validation | Zod v4 + `@t3-oss/env-nextjs` (env validated at boot) |
| UI | Tailwind CSS v4 + Radix primitives, Manrope + Inter |
| Payments | Razorpay + COD |
| Tests | Vitest (98 unit tests) + Playwright (12 E2E) |
| Tooling | Biome, Husky, GitHub Actions-ready |

---

## Running it locally

Requires **Node 22+**, **pnpm** and **Docker**.

```bash
pnpm install
cp .env.example .env        # then fill in the values you have
pnpm docker:up              # Postgres + Redis + Mailpit
pnpm db:migrate             # apply migrations
pnpm db:seed                # demo catalogue, owner account, policies
pnpm dev                    # http://localhost:3000
```

The seed prints the admin sign-in URL. The owner's email and password come from `OWNER_EMAIL`
and `OWNER_PASSWORD` in `.env`.

```bash
pnpm test        # unit tests
pnpm test:e2e    # end-to-end (needs the dev server or lets Playwright start one)
pnpm typecheck   # tsc --noEmit
pnpm lint        # biome
pnpm db:studio   # browse the database
```

Outgoing email is caught locally by Mailpit at http://localhost:8025.

---

## Deploying to Vercel

Order matters: pages are pre-rendered at build time and read the catalogue, so the database must
exist **and be migrated and seeded before the first Vercel build**, or that build fails.

**1. Create a Postgres database.** [Neon](https://neon.tech) free tier works. Copy both the
pooled and the unpooled (direct) connection strings.

**2. Migrate and seed it from your machine** — before importing into Vercel:

```bash
DATABASE_URL="<neon-pooled-url>" DIRECT_URL="<neon-direct-url>" pnpm db:deploy
DATABASE_URL="<neon-pooled-url>" DIRECT_URL="<neon-direct-url>" pnpm db:seed
```

**3. Import the repo into Vercel** — it detects Next.js automatically. No build-command override
is needed: `prisma generate` runs from `postinstall`.

**4. Set environment variables** in Vercel (Project → Settings → Environment Variables) before
you deploy:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Pooled Postgres URL |
| `DIRECT_URL` | yes | Unpooled URL — migrations use this |
| `BETTER_AUTH_SECRET` | yes | 32+ random chars (`openssl rand -base64 32`) |
| `REVALIDATE_SECRET` | yes | Any random string |
| `NEXT_PUBLIC_APP_URL` | yes | Your deployment URL, e.g. `https://vennzya.vercel.app` |
| `SELLER_STATE` | yes | GST place of supply, e.g. `Tamil Nadu` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | yes | With country code, e.g. `919000000000` |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | no | Online payments; without them checkout still works on COD |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | no | Same key id, exposed to the browser |
| `RESEND_API_KEY`, `EMAIL_FROM` | no | Transactional email |
| `MSG91_*` | no | SMS OTP for customer login |
| `CLOUDINARY_*`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | no | Product image hosting |
| `UPSTASH_REDIS_REST_*` | no | Distributed rate limiting (falls back to in-memory) |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_SENTRY_DSN` | no | Analytics, error tracking |
| `OWNER_EMAIL`, `OWNER_PASSWORD` | no | Used by the seed only |

Optional integrations degrade gracefully: without Razorpay keys the checkout offers Cash on
Delivery only; without an SMS provider the login OTP is printed to the server log.

**5. Razorpay webhook** (when you add live keys): point it at
`https://<your-domain>/api/webhooks/razorpay` for the `payment.captured`, `order.paid` and
`payment.failed` events, and set `RAZORPAY_WEBHOOK_SECRET` to the signing secret.

---

## Project layout

```
prisma/            schema, migrations, seed
e2e/               Playwright specs (checkout, admin access)
src/
  app/
    (storefront)/  public pages
    (admin)/       protected admin app
    (admin-auth)/  staff sign-in (outside the protected layout)
    api/           tRPC, Better Auth, Razorpay webhook
  modules/         catalog · cart · checkout · orders · payments · discounts
                   staff · content · support · notifications
  server/          Prisma client, tRPC setup, rate limiting
  lib/             env, money, GST, formatting, India helpers
  components/      ui · storefront · admin
```

Each module owns its Prisma access (`repository.ts`), business rules (`service.ts`) and its
validated tRPC surface (`router.ts`). Cross-module calls go through services, never another
module's repository.

---

## Before going live

- [ ] Razorpay merchant account and KYC, then live keys + webhook secret
- [ ] Replace the placeholder policy copy — **the seeded privacy, terms, shipping and returns
      text is a placeholder and must be reviewed by the owner or a legal professional**
- [ ] Real logo, brand colours and product photography (the demo uses Unsplash images)
- [ ] Domain, and a GA4 property + Search Console verification
- [ ] WhatsApp Business API access if you want automated order notifications (the `wa.me`
      links work today without it)
- [ ] Register every account — domain, hosting, database, payment gateway — **in the business
      owner's name**

## Not built yet

Admin CRUD screens for products, orders, discounts, customers and content; customer phone-OTP
login UI; email and WhatsApp order notifications; sitemap/robots; CI pipeline.
