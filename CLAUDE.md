# Customer Evaluation Dashboard — Template

This project is a **standalone, customer-facing energy insight evaluation tool**.
It lets one specific customer read AI-generated energy insights & saving measures and rate them.
Ratings are stored in a **shared Supabase database** used by all customer dashboards.

---

## How to spin up a new customer instance

### 1. Copy this project
```bash
cp -r "HH Dashboard/" "NEW CLIENT Dashboard/"
cd "NEW CLIENT Dashboard/"
```

### 2. Install dependencies
```bash
npm install
```

### 3. Upload customer data to Supabase
Edit `scripts/upload-huhn-data.mjs` — copy it to e.g. `scripts/upload-clientname.mjs` and change:
```js
const COMPANY_NAME = 'New Client GmbH'
const INDUSTRY     = 'Industry type'
const VERSION      = '1.0'
const RUN_DATE     = 'YYYY-MM-DD'
const NOTES        = 'Description of this analysis run'

const INSIGHTS_FILE = join(__dirname, '../path/to/statistical_insights.json')
const MEASURES_FILE = join(__dirname, '../path/to/measures_output.json')
```
Then run (the `--dns-result-order=ipv4first` flag is required on Windows/VPN):
```bash
node --dns-result-order=ipv4first scripts/upload-clientname.mjs
```
The script prints the **Company ID** and **Run ID** on success. Save these.

### 4. Update the root page redirect
In `app/page.tsx`, replace the hardcoded run ID:
```tsx
const HUHN_RUN_ID = 'd7981f4a-...'   // ← replace with the Run ID from step 3
```

### 5. Update branding
In `components/layout/customer-header.tsx`:
```tsx
<p>New Client GmbH</p>
<p>Energie-Analyse · Bewertungsportal</p>
```
In `app/layout.tsx`:
```tsx
title: 'New Client – Energie-Bewertung'
```

### 6. Test locally
```bash
npm run dev
# opens on http://localhost:3000 (or next available port)
```

### 7. Deploy to Vercel
```bash
git init && git add -A && git commit -m "Initial commit"
git remote add origin https://github.com/your-org/your-repo
git branch -M main && git push -u origin main
```
In Vercel → Import project → Add env vars:
```
NEXT_PUBLIC_SUPABASE_URL  = https://xaguubezlvbsvooxbvat.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_XLphKgdn9MohYVH5FKD7EQ_Rh21oOmM
```

---

## Stack

- **Next.js 16** (App Router, TypeScript strict)
- **Tailwind CSS v4**
- **Shadcn v4** — uses `@base-ui/react` (NOT Radix UI)
- **Framer Motion** — card animations & accordions
- **Supabase** (Postgres) — shared across all customer dashboards
- **Lucide React** — icons

### Critical: Shadcn v4 / Base UI constraint
`components/ui/button.tsx` has `"use client"` → `buttonVariants` cannot be called from server components.
```tsx
// ✅ In server components always use:
import { LinkButton } from '@/components/ui/link-button'

// ❌ Will crash at runtime:
import { buttonVariants } from '@/components/ui/button'
```

---

## Visual Design System

Inspired by the N-ERGIE customer report (`github.com/…/N-ERGIE-customer-measures`).

### Color palette (inline styles throughout, not Tailwind classes)
```
Navy:        #00095B   — headings, titles, primary text
Blue:        #1A2FEE   — interactive, links, active states, icons
Blue tint:   rgba(26,47,238,0.08)  — badge backgrounds, icon boxes
Green:       #059669   — savings, positive, high confidence
Orange:      #b45309   — medium confidence, investment
Red:         #dc2626   — anomalies, negative, high effort
Gray text:   #737373   — secondary text
Light gray:  #AEAEAE   — tertiary text, placeholders
Border:      #E5E5E5   — card borders
Soft bg:     #FAFAFA   — expanded section backgrounds
Yellow:      rgba(226,236,43,0.9) — evaluator confirmation in dark header
```

### Header
Dark navy (`#00095B`) sticky header. Left: company name + icon. Right: evaluator name input (white-on-dark style). When name is entered, shows yellow confirmation text.

### Location selector
Large card-style buttons (not tabs) with MapPin icon, location name, insight count. Active = blue border + blue ring. Used when a run has multiple locations.

### Insight cards
- White rounded-xl cards, blue border+shadow when expanded
- Click header to expand (Framer Motion accordion)
- Two-column layout on desktop (≥lg): content left, rating panel right
- Content: type badge + confidence badge + savings badge → title → description (clamped 2 lines when collapsed)
- Expanded: savings KPI boxes, full description under "Analyse" header, hypotheses as colored pills (problem=red, benign=green, opportunity=blue), linked measures list
- **No JSON debug sections** (Finding Detail, Time Context etc. are intentionally removed for customer-facing view)
- Rating panel always visible on desktop right column

### Measure cards (inside insight accordion)
- Compact row: wrench icon, category + effort badges, title, short description, savings + amortization preview
- Click → opens full detail modal
- Modal: KPI grid (savings EUR, kWh, investment, amortization), description, Begründung (blue left-border panel), Datenpunkte (green checkmarks), Fragen (structured Q&A), rating form at bottom

### Rating UI (`InlineRating`)
- Three large vertical buttons: Positiv / Neutral / Negativ (with icon)
- **Clicking a button immediately saves to database** (impression only)
- After save: ✓ confirmation + auto-expands detail section
- Detail section: Verständlichkeit / Relevanz / Plausibilität + sub-ratings (1–5 scale)
- Separate "Detailbewertung absenden" button for detail ratings
- "Erneut bewerten" link to reset
- Always shows "Tragen Sie Ihren Namen oben ein…" if no evaluator name set

---

## Database Schema (Supabase, shared)

```sql
companies       id, name (UNIQUE), industry, created_at
locations       id, company_id, original_location_id, title, street_name, street_number
pipeline_runs   id, company_id, version, run_date, notes, created_at
insights        id, run_id, location_id, original_id, type, priority_score,
                savings_kwh_per_year, savings_eur_per_year, confidence,
                title, description, raw_json, created_at
measures        id, run_id, insight_id, location_id, original_insight_id,
                title, short_description, description,
                yearly_savings_eur_from/to, yearly_savings_kwh_from/to,
                investment_from/to, amortisation_months, confidence,
                effort_level, investment_type, category, raw_json, created_at
evaluations     id, item_type ('insight'|'measure'), insight_id, measure_id,
                evaluator_name,
                impression ('positive'|'negative'|'neutral'),
                comprehensibility, relevance, plausibility,
                rating_title, rating_description, rating_hypotheses,
                rating_reasoning, rating_questions,
                notes, created_at
```
Migrations in `supabase/migrations/` — both must be applied before deploying.

### Data input JSON format
**Insights file** (`statistical_insights_*.json`): array of objects with:
`id, locationId, type, priorityScore, savingsKwhPerYear, savingsEurPerYear, confidence, title, description, context.location.{id,title,streetName,streetNumber}, hypotheses[], timeContext, findingDetail, deviceAttribution`

**Measures file** (`measures_output_*.json`): array of objects with:
`insightId, locationId, title, shortDescription, description, yearlySavingsRangeFrom/To, yearlySavingsEnergyRangeFrom/To, investmentRangeFrom/To, amortisationPeriodInMonths, confidence, effortLevel, investmentType, category, reasoning, evidences[], questions[]`

### Confidence scale difference
- Insights: 0–1 scale (show as `× 100` for %)
- Measures: 0–100 scale (show directly as %)

---

## Project Structure

```
/
├── app/
│   ├── layout.tsx                  # Root layout — NO sidebar, EvaluatorProvider only
│   ├── page.tsx                    # Root: directly loads hardcoded run, renders CustomerHeader + RunDetailClient
│   ├── companies/[companyId]/      # Still exists but not linked from customer UI (admin use)
│   ├── dashboard/                  # Still exists but not linked from customer UI (admin use)
│   └── upload/                     # Still exists but not linked from customer UI (admin use)
├── components/
│   ├── layout/
│   │   └── customer-header.tsx     # Navy header with company name + evaluator name input
│   ├── run-detail-client.tsx       # Main client component: location selector + InsightList
│   ├── insights/
│   │   ├── insight-card.tsx        # N-ERGIE style card with two-column layout + rating
│   │   └── insight-list.tsx        # Maps insights → InsightCard with index
│   ├── measures/
│   │   ├── measure-card.tsx        # Compact row + detail modal + InlineRating
│   │   └── measure-list.tsx        # Maps measures → MeasureCard with index
│   ├── rating/
│   │   ├── inline-rating.tsx       # Immediate-save impression buttons + optional details
│   │   └── metric-rating.tsx       # 1–5 number buttons + N/A
│   └── ui/                         # Shadcn components — do not modify
├── actions/
│   ├── runs.ts                     # getRunDetail, getCompanies, etc.
│   └── evaluations.ts              # submitEvaluation, getEvaluationsForRun
├── lib/
│   ├── evaluator-context.tsx       # EvaluatorProvider + useEvaluator(); localStorage-persisted
│   ├── supabase/client.ts          # Browser Supabase client
│   ├── supabase/server.ts          # Server Supabase client (SSR)
│   └── types.ts                    # All TypeScript types
└── scripts/
    └── upload-huhn-data.mjs        # One-time data upload script (copy + adapt per client)
```

---

## Known Issues & Fixes

### IPv6 timeout on Windows / VPN (especially China VPN)
Node.js on Windows tries IPv6 first → Supabase connection times out.
**Fix already applied** in `package.json` via `cross-env NODE_OPTIONS=--dns-result-order=ipv4first`.
This only affects local dev. Vercel is unaffected.

The upload script also needs the flag:
```bash
node --dns-result-order=ipv4first scripts/upload-clientname.mjs
```

### Supabase "publishable" key format
The key `sb_publishable_...` is Supabase's newer anon key format. It works identically to the old `eyJ...` JWT format with `@supabase/ssr`.

### ViewModeContext / compact mode removed
This project intentionally has **no compact/detailed toggle** — always detailed. The `ViewModeProvider` and `useViewMode()` are still in `lib/view-mode-context.tsx` (used by other routes) but `InlineRating` and all customer-facing components no longer import it. Don't re-add `compact` logic to these components.

### Multiple evaluations per evaluator
The DB has no unique constraint on (evaluator_name, insight_id). Clicking a thumb saves one row immediately; submitting detail ratings saves a second row. This is intentional — the pipeline-dashboard aggregates both. Don't add a unique constraint.

---

## Running Locally

```bash
npm run dev     # http://localhost:3000 (or next available port)
npm run build   # verify TypeScript + production build before deploying
npx tsc --noEmit  # fast type-check only
```

---

## Vercel Deployment Checklist

- [ ] Repo pushed to GitHub
- [ ] Vercel project created, linked to repo
- [ ] Env vars set in Vercel dashboard:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] No need for `cross-env` flag on Vercel (IPv6 not an issue there)
- [ ] `npm run build` passes locally before pushing

---

## Pipeline Dashboard (internal admin tool)

The companion project at `../pipeline-dashboard` is the **internal evaluator dashboard** used by the ecoplanet team. It shows all companies, all runs, charts, comparisons. The customer dashboards (like this one) share its Supabase database but are deployed separately per customer.

The pipeline-dashboard also has the upload UI (`/upload`) if you need to re-upload or add runs without using the script.
