# Finded Platform — Setup & Deployment Guide

## What's built

A production-ready Next.js 15 platform that:
- Imports restaurants via CSV/XLSX bulk upload
- Runs real AI queries across OpenAI, Anthropic, Gemini, and Perplexity
- Extracts and measures mention frequency, position scores, and model consensus
- Crawls restaurant websites for structured data signals
- Stores all raw responses and computed metrics in Supabase
- Provides an admin dashboard with audit management

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)
- At least one AI provider API key (all four recommended)
- A [Vercel](https://vercel.com) account for deployment

---

## Step 1 — Supabase setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** in your Supabase dashboard
3. Run `supabase/migrations/001_initial_schema.sql` — base tables, indexes, views, and RLS
4. Run `supabase/migrations/002_seed_prompts.sql` — seeds prompt templates
5. Run `supabase/migrations/003_v2_schema.sql` — the v2 tables/columns the app actually uses (entities, visibility_scores, competitors, signal gaps, monitoring, leads, …) and tightened RLS. **Required** — the app will error against 001 alone.
6. Note your project URL and keys from **Settings → API**

---

## Step 2 — Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=       # From Supabase Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # From Supabase Settings → API
SUPABASE_SERVICE_ROLE_KEY=      # From Supabase Settings → API (keep secret)

OPENAI_API_KEY=                 # platform.openai.com
ANTHROPIC_API_KEY=              # console.anthropic.com
GEMINI_API_KEY=                 # aistudio.google.com
PERPLEXITY_API_KEY=             # perplexity.ai/settings/api

CRON_SECRET=                    # Generate: openssl rand -hex 32
```

All four AI providers are optional — the audit engine runs with whichever keys are present.

---

## Step 3 — Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/admin/dashboard`.

---

## Step 4 — Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect your GitHub repo to Vercel and add environment variables in the Vercel dashboard under **Settings → Environment Variables**.

---

## Step 5 — Set up the audit queue (Supabase cron)

The audit queue is processed by calling `POST /api/queue/process`.

### Option A: Supabase cron job (recommended)

In Supabase dashboard → **Database → Extensions**, enable `pg_cron`.

Then run this SQL to process the queue every 2 minutes:

```sql
select cron.schedule(
  'process-audit-queue',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := 'https://your-app.vercel.app/api/queue/process',
    headers := '{"Content-Type": "application/json", "x-cron-secret": "YOUR_CRON_SECRET"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

Replace `your-app.vercel.app` and `YOUR_CRON_SECRET` with your actual values.

### Option B: Vercel cron (vercel.json)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/queue/process",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

Vercel Cron automatically sends an `Authorization: Bearer $CRON_SECRET` header when `CRON_SECRET` is set in the project's environment variables — the endpoints accept that as well as the `x-cron-secret` header used by the pg_cron job above. **Always set a real `CRON_SECRET`.** In production these endpoints fail closed: if `CRON_SECRET` is unset they return `503`, and if it's set every caller must present the matching secret (so the manual "Process queue" button in the admin UI works only in local development, or behind an authenticated admin layer you add).

---

## Step 6 — First audit

1. Go to `/admin/upload`
2. Upload a CSV with columns: `name, city, website, cuisine, email`
3. Check "Queue AI audits" and click Upload
4. Go to `/admin/audits` — you'll see audits in `queued` status
5. Click **Process queue** to manually trigger one, or wait for the cron job
6. Once completed, click **View results** to see the full metrics report

---

## Architecture notes

### Audit pipeline

There is a single audit engine: the Inngest function in
`lib/inngest/audit-function.ts`. `createAudit` dispatches an `audit/requested`
event; if that send fails the audit is parked in `audit_queue` and the cron
worker at `/api/queue/process` re-dispatches it to Inngest (it does not run a
separate engine). Inngest owns execution and retries.

```
createAudit → audit record → inngest.send('audit/requested')
   (on send failure → audit_queue → /api/queue/process re-dispatches)
                                                     ↓
                                  Inngest function (durable, batched steps)
                                                     ↓
                                          Website crawler runs
                                                     ↓
                              Prompts generated for business type + city
                                                     ↓
                          Each provider runs each prompt (batched)
                                                     ↓
                      Claude extracts entities (target + competitors)
                                                     ↓
        entities + mentions + model_runs written to Supabase
                                                     ↓
        visibility_scores + competitors + score_history computed
                                                     ↓
                                     audit.status = 'completed'
```

### Metrics calculated

| Metric | Formula |
|--------|---------|
| Mention frequency | `mentions / total_prompts` |
| Position score | Weighted avg: pos 1=100, 2=85, 3=70, 4=55, 5=40, 6+=20 |
| Model consensus | Count of distinct models that mentioned the restaurant |
| Share of voice | `restaurant_mentions / cohort_total_mentions` |

The position weights live in one place — `lib/engine/metrics-core.ts` — and are
shared by both the audit-time metrics (`metrics-v2.ts`, which persists
`visibility_scores`) and the read-time metrics (`metrics.ts`, used by the report
page and several API routes), so scores match no matter which path computes them.

### Rate limiting

The Inngest function runs prompts in batches with a short delay between calls
and relies on Inngest's step retries. Bulk uploads create one audit per row;
each is dispatched as its own Inngest run.

---

## Prompts

Prompts are generated per audit from the business type and city by
`lib/engine/prompt-generator.ts` (no manual prompt seeding required). The
generated set for each audit is recorded in the `prompt_runs` table.

---

## Project structure

```
finded/
├── app/
│   ├── admin/
│   │   ├── dashboard/page.tsx     # Overview metrics
│   │   ├── restaurants/page.tsx   # Restaurant list + audit trigger
│   │   ├── audits/page.tsx        # Audit list with status
│   │   ├── audits/[id]/page.tsx   # Full audit results
│   │   └── upload/page.tsx        # CSV/XLSX bulk import
│   └── api/
│       ├── restaurants/           # CRUD
│       ├── audits/                # Create + list + detail
│       ├── upload/                # Bulk import endpoint
│       ├── queue/process/         # Queue processor
│       └── metrics/dashboard/     # Dashboard aggregates
├── lib/
│   ├── engine/
│   │   ├── audit-runner.ts        # createAudit — dispatches to Inngest
│   │   ├── entity-extractor.ts    # Claude-based entity extraction
│   │   ├── metrics-core.ts        # Shared metric primitives (position weights)
│   │   ├── metrics.ts             # Read-time visibility metrics
│   │   ├── metrics-v2.ts          # Audit-time metrics → visibility_scores
│   │   ├── prompt-generator.ts    # Business-type + city prompt generation
│   │   ├── signal-gap-engine.ts   # External signal / gap analysis
│   │   └── website-auditor.ts     # Website crawler (SSRF-guarded)
│   ├── providers/
│   │   ├── openai.ts
│   │   ├── anthropic.ts
│   │   ├── gemini.ts
│   │   ├── perplexity.ts
│   │   └── index.ts               # Provider registry
│   └── supabase/client.ts
├── components/
│   ├── ui/index.tsx               # Badge, Card, Button, Spinner, etc.
│   └── admin/sidebar.tsx
├── types/database.ts              # All TypeScript types
└── supabase/migrations/
    ├── 001_initial_schema.sql
    └── 002_seed_prompts.sql
```

---

## Next steps (not yet built)

- **PDF report generation** — use `@react-pdf/renderer` or Puppeteer
- **Competitor comparison** — query multiple restaurants in the same cohort
- **Share of voice** — already calculated in `metrics.ts`, needs a UI
- **Customer portal** — restaurant owners viewing their own reports
- **Stripe payments** — unlock full reports for €29
- **Email notifications** — alert when audit completes
- **Trend charts** — recharts is already installed, just needs the UI
