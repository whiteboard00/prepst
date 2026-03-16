# After SAT: Expanding Prep St Into a Universal AI Tutor

## The Core Insight

Prep St's real product isn't SAT prep — it's the **BKT + AI feedback engine**. The cognitive tracking system is completely domain-agnostic. A student struggling with organic chemistry gets the same adaptive mastery tracking as one doing SAT math. The engine doesn't care what the skill is.

The "free AI tutor" vision scales way beyond test prep into **any structured learning** — that's where it gets truly disruptive.

---

## What's Already Generic

These systems work for ANY learning domain today, zero changes needed:

- **BKT mastery tracking** — operates on `user_id + skill_id` pairs, no SAT knowledge baked in
- **Analytics & prediction engines** — growth curves, velocity calculations, performance snapshots
- **Question model** — supports any format (stimulus, stem, options, rationale)
- **Topic → Category → Section hierarchy** — flexible structure, just currently seeded with SAT data
- **AI feedback system** — OpenAI-powered feedback, chat, and answer validation
- **Practice session system** — generic session/question flow with difficulty adaptation
- **Streak & achievement tracking** — domain-agnostic engagement systems

## What's Currently Hardcoded to SAT

- Score ranges (200-800 per section, 400-1600 total) in validators, DB constraints, frontend
- Two sections only: `math`, `reading_writing` as a database enum
- Module structure: 4 modules, 32 minutes each
- Diagnostic test: 40 questions (20 Math + 20 R&W split)
- UI strings ("SAT" referenced throughout), score calculator formula
- Onboarding flow assumes SAT score targets

---

## The Architecture: Course Abstraction Layer

The key move is introducing a **course/exam config layer** between the generic engine and the UI:

```
┌─────────────────────────────────────┐
│  Courses                            │
│  SAT, ACT, GRE, AP Calc, MCAT,     │
│  Organic Chemistry, Algebra 2,      │
│  Custom School Curricula...         │
├─────────────────────────────────────┤
│  Course Config (per course):        │
│  - Sections & their weights         │
│  - Score ranges & formulas          │
│  - Topic trees                      │
│  - Question pools                   │
│  - Exam structure (modules, timing) │
│  - Diagnostic config                │
│  - UI theming / branding            │
├─────────────────────────────────────┤
│  Generic Engine (already built):    │
│  BKT mastery tracking               │
│  Analytics & predictions            │
│  AI feedback & chat                 │
│  Practice sessions                  │
│  Streaks & achievements             │
└─────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1 — Extract SAT Into Config (No Breaking Changes)

**Goal:** SAT keeps working exactly as-is, but its specifics move from hardcoded values into a course configuration system.

- Create a `courses` table — each course defines sections, score ranges, topic tree, exam format
- Create a "SAT" course entry with all current hardcoded values
- Replace hardcoded validators with config-driven validation
- No user-facing changes — purely internal refactor

### Phase 2 — Multi-Course Support

**Goal:** Users can pick courses. Dashboard and study plans become course-scoped.

- Onboarding lets users pick one or more courses
- Dashboard becomes course-scoped (switch between courses)
- Questions tagged by course, topics scoped to courses
- Study plans tied to a specific course
- Diagnostic test pulls config from course definition

### Phase 3 — Expand Content

**Goal:** Launch new courses beyond SAT.

- **Standardized tests:** ACT, GRE, GMAT, MCAT, LSAT
- **AP exams:** AP Calculus, AP Physics, AP US History, etc.
- **Subject learning:** Algebra 2, Organic Chemistry, Statistics
- **Custom courses:** Teachers create their own topic trees and question pools

Each new course is just a config + question pool. The engine, AI feedback, and mastery tracking all work immediately.

---

## Guiding Principles

1. **Additive, not destructive** — never break existing SAT functionality while expanding
2. **Incremental** — small, safe steps. Extract config first, then add multi-course, then expand content
3. **The engine is the product** — invest in BKT, AI feedback, and cognitive tracking quality above all else
4. **Free forever** — every feature decision reinforces "free + best-in-class"
5. **SAT is course #1, not the whole product** — build the platform, not just a test prep app

---

## The Moat

Most edtech products are content libraries with a progress bar. Prep St is different:

- **Bayesian Knowledge Tracing** — probabilistic mastery model, not just "you got 7/10 correct"
- **AI-powered feedback** — not just right/wrong, but WHY and HOW to improve
- **Cognitive velocity tracking** — how fast you're learning, not just what you know
- **Predictive analytics** — where you'll be on test day based on learning trajectory
- **100% free** — removes the biggest barrier in education

This combination doesn't exist anywhere else at this price point (free). That's the disruption.
