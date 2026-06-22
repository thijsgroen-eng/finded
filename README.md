# Finded

Finded measures how visible a business (restaurants by default, but the engine is
business-type aware) is to AI assistants. It asks the major models — OpenAI,
Anthropic, Gemini, and Perplexity — natural questions like *"best restaurants in
Amsterdam"*, extracts which businesses each model recommends, and scores the
target's mention frequency, ranking position, sentiment, share of voice, and
competitive gaps. It also audits the business's website and external signals
(knowledge graph, directories, reviews) and generates concrete fixes.

> **Caveat on methodology:** ungrounded chat models (e.g. `gpt-4o-mini`,
> `claude-haiku`) answer from training data, while Perplexity retrieves live.
> Results reflect model memory as much as real-world standing, and the
> "estimated visitors / revenue" figures are illustrative heuristics, not
> measured outcomes. Treat scores as directional.

## Stack

- **Next.js 15** (App Router) + **React 19**, TypeScript, Tailwind v4
- **Supabase** (Postgres) for storage; service-role access from server routes
- **Inngest** for the durable, multi-step audit pipeline
- **Vercel** for hosting and cron

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in Supabase + provider keys (see DEPLOYMENT.md)
npm run dev
```

Open http://localhost:3000 — it redirects to `/admin/dashboard`.

Database setup, environment variables, the audit queue, and cron configuration
are documented in [DEPLOYMENT.md](./DEPLOYMENT.md). Run **all three** migrations
in `supabase/migrations/` — `003_v2_schema.sql` is required for the app to work.

## Layout

```
app/        Next.js routes — admin UI under /admin, API under /api
lib/engine  Audit orchestration, entity extraction, metrics, website/signal auditing
lib/inngest Durable audit + fix functions
lib/providers  Pluggable model providers (OpenAI / Anthropic / Gemini / Perplexity)
supabase/migrations  SQL schema
types/database.ts    Shared TypeScript types
```
