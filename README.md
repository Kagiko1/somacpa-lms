# SomaCPA — Kenya CPA Learning Management System

Mobile-first LMS for KASNEB CPA candidates (Foundation / Intermediate / Advanced).
Built for Kenyan realities: low-data mode, offline PWA, per-course M-Pesa checkout.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + shadcn-style UI primitives |
| PWA | Web manifest + hand-rolled service worker (`public/sw.js`) caching lesson text & audio |
| Backend | Supabase (Postgres + Auth). RLS on, ingestion via service-role key |
| Payments | Flutterwave hosted checkout (M-Pesa) — stubbed until keys are added |
| Content pipeline | External LLM generates structured JSON → `scripts/ingest.py` upserts into Supabase |

## Repo map

```
supabase/migrations/001_initial_schema.sql   # full schema + RLS
supabase/seed.sql                            # 3 starter courses, CA11 lessons + quiz
web/                                         # Next.js app
  app/
    page.tsx                 # landing
    (auth)/login|signup      # Supabase auth
    dashboard/               # resume-learning + courses by tier
    courses/[courseId]/      # modules accordion, unlock button
    learn/[lessonId]/        # lesson viewer + audio bar + quiz
    api/checkout/            # Flutterwave init (stub until keys set)
  components/                # ui/* primitives, audio-bar, quiz-runner, ...
  lib/supabase/              # browser + server clients
  public/manifest.json sw.js # PWA
scripts/
  ingest.py                  # JSON -> Supabase upsert
  sample_lesson.json          # example CA11 lesson
  content_prompt.md           # the exact prompt to feed an LLM for content
```

## Quickstart

1. **Supabase project** — create one at supabase.com (free tier is fine).
2. **Run the schema** — open SQL Editor, paste `supabase/migrations/001_initial_schema.sql`, run.
3. **Seed demo content** — run `supabase/seed.sql`.
4. **Env** — `cd web && cp .env.example .env.local`, fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-side only, used by ingest script too)
   - `FLUTTERWAVE_SECRET_KEY` (when ready to take payments)
5. **Run** — `npm install && npm run dev` → http://localhost:3000
6. **Ingest AI content** — `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python3 scripts/ingest.py scripts/sample_lesson.json`

## Content pipeline (the fast path)

You don't need an LLM API key to start: Muse (this assistant) generates lessons
directly as JSON following `scripts/content_prompt.md`, you save the file, and
`ingest.py` loads it. When you want full automation later, point the Anthropic
API at the same prompt file — the JSON contract is identical.

## Payments

`app/api/checkout/route.ts` creates a `transactions` row (status `pending`) and,
once `FLUTTERWAVE_SECRET_KEY` is set, initiates a Flutterwave hosted payment
with M-Pesa enabled, then records the receipt number on webhook/callback.
Until then it returns a stub response so the UI flow is testable end-to-end.

## KASNEB structure (verified)

- **Foundation:** CA11 Financial Accounting · CA12 Communication Skills ·
  CA13 Introduction to Law and Governance · CA14 Economics ·
  CA15 Quantitative Analysis · CA16 ICT
- **Intermediate:** CA21 Company Law · CA22 Financial Management ·
  CA23 Financial Reporting and Analysis · CA24 Auditing and Assurance ·
  CA25 Management Accounting · CA26 Public Finance and Taxation
- **Advanced:** CA31 Leadership and Management · CA32 Advanced Financial
  Reporting and Analysis · CA33 Advanced Financial Management ·
  CA34 Advanced Management Accounting · specialisations CA35S1 Advanced
  Taxation / S2 Advanced Auditing and Assurance / S3 Advanced Management
  Accounting / S4 Advanced Public Financial Management · Business Data
  Analytics (practical)

## Deploy

Vercel: import `web/`, set the env vars, done. Supabase stays as the backend.
For the PWA install prompt to work in production, serve over HTTPS (Vercel default).
