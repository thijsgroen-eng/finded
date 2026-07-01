<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Finded product principle

Finded is an **AI Visibility Platform for restaurants**, not a one-time PDF tool.
The customer journey is: Free Visibility Check → AI Visibility Audit (€49) →
Implementation (€299) → Monthly Monitoring (future).

**Every change must either:**
1. improve the customer's understanding of how AI discovers, interprets and
   recommends their restaurant, **or**
2. contribute to Finded's proprietary dataset (the Observation Engine) that
   benchmarks and explains visibility over time.

If a feature does neither, don't build it. Concretely:
- Recommendations cite **evidence** (audit data or measured patterns) with an
  **impact** and a **confidence** band — never generic SEO advice.
- Positioning is "we measure how AI recommends restaurants and help you improve",
  never "rank #1 in ChatGPT" or guaranteed rankings.
- Never fabricate stats; only show measured/aggregate data, and never expose an
  individual customer's data in benchmarks.
- Keep what works (audit engine, crawler, GBP, PDFs, recommendations,
  competitor analysis); evolve, don't rewrite.

# Admin backoffice translation rule

**Every admin UI string must exist in both NL and EN in `lib/admin-copy.ts`.**

- Server components read the cookie: `const t = ADMIN_COPY[lang]`
- Client components use: `const t = useAdminT()` from `AdminLangContext`
- The `AdminCopy` type is inferred from the EN block — adding a key to EN is enough to extend the type
- When adding or changing any admin page, component, or feature: update `lib/admin-copy.ts` with both the English (`en`) and Dutch (`nl`) strings before committing. Never hardcode English (or Dutch) text in admin UI files.
- Deploy to Vercel by pushing to `main` — do this automatically after every change, no need to ask.
