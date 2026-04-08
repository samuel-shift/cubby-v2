# Cubby V2 — Setup Guide

## Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (custom warm design tokens)
- **Auth:** NextAuth v5 (magic link via Resend)
- **DB/ORM:** Supabase (PostgreSQL) + Prisma 6
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **AI:** Anthropic SDK (Claude Vision)

---

## 1. Create the GitHub repo

```bash
gh repo create samuel-shift/cubby-v2 --private --source=. --remote=origin --push
```

---

## 2. Install dependencies

```bash
npm install
```

---

## 3. Set up environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
cp .env.local.example .env.local
```

**Required:**
- `AUTH_SECRET` — generate with `openssl rand -base64 32`
- `DATABASE_URL` + `DIRECT_URL` — from Supabase project → Settings → Database
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project → API
- `ANTHROPIC_API_KEY` — for Claude Vision (receipt/snapshot/meal parsing)

**For magic link email:**
- Create a [Resend](https://resend.com) account
- Add `EMAIL_SERVER_PASSWORD` = your Resend API key
- Verify your sending domain in Resend

---

## 4. Set up Prisma / database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to Supabase (creates tables)
npm run db:push
```

---

## 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 6. Deploy to Vercel

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Settings → Environment Variables → paste all from .env.local
```

Or connect via Vercel Dashboard → Import Git Repository → select `samuel-shift/cubby-v2`

---

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Authenticated routes (with bottom nav)
│   │   ├── page.tsx        # Home — dashboard hub (CRITICAL)
│   │   ├── pantry/         # My Kitchen — list/grid toggle
│   │   ├── recipes/        # Recipes feed + [id] detail
│   │   ├── shopping/       # Shopping — My List + Cookbook
│   │   ├── insights/       # Insights dashboard
│   │   ├── profile/        # Profile + settings
│   │   ├── log/            # Log food — unified entry + sub-flows
│   │   └── swipe/          # Swipe Status
│   ├── (onboarding)/       # Unauthenticated flows
│   │   ├── onboarding/     # 6-step onboarding
│   │   └── auth/verify/    # Magic link sent screen
│   ├── api/
│   │   ├── auth/           # NextAuth handler
│   │   ├── inventory/      # GET/POST items, PATCH/DELETE [id]
│   │   ├── log/vision/     # Claude Vision endpoint
│   │   ├── barcode/[barcode]/ # Open Food Facts lookup
│   │   └── user/onboarding/   # Save onboarding prefs
│   └── splash/             # Splash screen (low priority)
├── components/
│   ├── nav/BottomNav.tsx   # 5-tab bottom nav
│   ├── ui/                 # Button, Card, Badge, Input, PageHeader, ExpiryPill
│   ├── home/               # HomeHeader, ExpiryBanners, MyKitchenCard,
│   │                       # MoneySavedTracker, EatMeSoonCarousel,
│   │                       # RecipeIdeasFan, DataInsightNudge, ChallengesSection
│   ├── pantry/             # PantryClient (list/grid toggle)
│   ├── log/                # LogFoodClient
│   ├── onboarding/         # OnboardingClient (6-step + AnimatePresence)
│   ├── swipe/              # SwipeStatusClient (drag + spring + confetti)
│   └── splash/             # SplashClient
├── lib/
│   ├── prisma.ts           # Prisma client singleton
│   ├── supabase/           # client.ts + server.ts
│   └── utils.ts            # cn(), formatExpiryLabel(), getCategoryEmoji(), etc.
├── auth.ts                 # NextAuth config
└── middleware.ts           # Route protection
```

---

## Gap Analysis Implementation Notes

See Notion: [Figma Design vs Current Build — Gap Analysis](https://www.notion.so/33c25159c97681c8a1dccc3955d4dabe)

**Key decisions baked in:**

| Decision | Implementation |
|---|---|
| 5-tab nav (not 4) | Shopping kept as first-class tab |
| Expiry banners on home | `ExpiryBanners` component embedded on home, not behind `/pantry` tap |
| List + grid toggle in pantry | List default when >15 items, grid for smaller inventories |
| No product photos in pantry | Category emoji system (V1); OFf photos deferred to V2 |
| Voice input greyed out | Mic button renders with `pointer-events-none opacity-40` |
| Friend's Fridge coming soon | Challenge card greyed out with "Coming soon" label |
| Detail level step removed | Onboarding is 6 steps, not 7 |
| Two-tier warning colours | `cubby-salmon` (soft) + `cubby-urgent` (functional urgency) |
| Shadows stripped | Global `box-shadow: none !important` in globals.css |

---

## What's TODO (wire up)

These components are scaffolded with UI but need backend wiring:

- `EatMeSoonCarousel` — fetch real expiring items from API
- `MoneySavedTracker` — fetch `user.moneySaved` 
- `RecipeIdeasFan` — fetch AI-generated recipe suggestions
- `DataInsightNudge` — fetch personalised insights
- `ChallengesSection` — fetch `UserChallenge` progress
- `BarcodeScanner` — implement camera + OFf lookup
- `ReceiptScanner` — implement photo capture + Claude Vision
- `MealLogClient` — implement photo + item extraction
- `WasteLogClient` — implement photo + waste tracking
- `SwipeStatusClient` — fetch real items from API, wire PATCH calls
