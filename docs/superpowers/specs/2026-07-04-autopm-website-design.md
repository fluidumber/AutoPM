# AutoPM Marketing Website — Design Spec

Date: 2026-07-04
Author: Claude (autonomous session, pipeline pre-approved by user: strategy → design → build → launch)

## 1. Business strategy — what kind of website

**Website type: a conversion-focused, single-page launch site** for the open-source AutoPM MCP server, deployed to GitHub Pages (`https://fluidumber.github.io/AutoPM/`).

Rationale (grounded in AutoPM's own self-analysis in `~/.productflow/products/autopm-productflow/assets/`):

- The Money robot's sequencing puts AutoPM at **Sequence 0: local OSS, free** — the metric that matters is *activated workspaces*, not revenue. So the site optimizes for **adoption**, not sales.
- The Detective robot's positioning: *"AutoPM is the AI-native PM operating workspace that turns product thinking into auditable artifacts."* Category narrative: **from product artifacts to product judgment systems**. Position against generic-AI-chat + Notion/Confluence sprawl — NOT against Aha!/Productboard.
- The Scout robot's verdict (72/100 hypothesis support, validation-gated) says the top priority is **design-partner discovery** — so the site's third conversion goal is design-partner recruitment.

**Conversion goals, in order:**
1. **Install** — copy-paste MCP config for Claude Desktop / Cursor / ChatGPT (one click to clipboard).
2. **Star the repo** — GitHub star CTA (community proof compounds).
3. **Become a design partner** — mailto CTA to the maintainer (no backend needed on a static site; honest at this stage).

## 2. Audience — personas (from the People robot output, 2026-05-23)

| Persona | Role on site | What the site must give them |
|---|---|---|
| **Anand Rao** — AI-native PM power user / solo builder (primary wedge) | The installer | 10-second understanding, copy-paste setup, proof it's real (open source, local-first, no API keys) |
| **Maya Chen** — VP Product coaching an uneven team | The buyer/coach | "Repeatable product judgment across the team" framing; auditable-artifacts trust story |
| **Priya Nair** — associate PM who can get AI to write a PRD but not to tell her if it's the *right* PRD | The learner | Guided-workflow story; her literal quote is the strongest hook copy in the research |

Executive reviewers (Sarah) and product ops (Lucas) are served indirectly via the "auditable, evidence-linked, freshness-tracked" messaging — no dedicated section (YAGNI).

## 3. Growth hooks

1. **Hero pipeline simulator** — visitor types (or picks) a product idea; the 3D robot pipeline animates it through Phase 1 → gate → Phase 2 → PDD. Demonstrates the core loop in 15 seconds with zero setup.
2. **"AutoPM analyzed itself" meta-proof** — show the real self-analysis scores (Hypothesis Support 72/100, Evidence Maturity 61/100, verdict: *validation-gated*). No product would publish an honest, non-vanity score about itself — that IS the pitch for a product-judgment system. Turns absence of social proof into credibility.
3. **One-line install with copy button** — per-client tabs (Claude Desktop / Cursor / ChatGPT).
4. **Persona-quote hooks** — "I can get AI to write a PRD. I need help knowing whether it is the right PRD."
5. **Design-partner CTA** — mailto link; scarcity framing ("early cohort").
6. **GitHub star CTA** in nav and footer.

## 4. Page structure (single page, in order)

1. **Nav** — wordmark, section links, GitHub button.
2. **Hero** — headline + 3D robot-pipeline scene + install & star CTAs. Headline direction: "Your AI product team" / subline from repo description: "Turn abstract ideas into shipping roadmaps."
3. **Problem** — the displacement target: AI chat writes documents; nobody verifies the thinking. (Priya's quote.)
4. **How it works** — two-phase gated workflow: Phase 1 Strategic Discovery (why/who) → phase gate → Phase 2 Execution Definition (what/how) → PDD export.
5. **Robot grid** — all 18 robots as 3D-tilt cards (emoji, name, one-liner), grouped by phase.
6. **Meta-proof** — "We ran AutoPM on AutoPM" with real scores + verdict block styling (JSON aesthetic, mirrors the product's verdict-block convention).
7. **Built for** — three persona cards (solo builder / product leader / new PM) with quotes.
8. **Positioning strip** — vs. generic AI chat, vs. docs sprawl, vs. PM suites (from Detective).
9. **Get started** — tabbed MCP config snippets with copy buttons; requirements (Node 20+, no API keys).
10. **Footer** — design-partner mailto CTA, GitHub, MIT license.

## 5. Design direction (refined during build by frontend-design skill)

- **Feel**: dark, dimensional, precise — a "mission control" aesthetic matching the Cockpit metaphor and the AI-native PM audience. Not corporate-SaaS pastel.
- **3D treatment**: pure CSS 3D (perspective, `transform-style: preserve-3d`) — layered depth in the hero pipeline, pointer-tracked tilt on robot cards, parallax depth planes in the background. No WebGL dependency; must degrade gracefully and respect `prefers-reduced-motion`.
- **Type & color**: display grotesque + monospace accents (terminal/JSON callbacks to the product's file-first nature). One saturated accent family on near-black.
- **Performance**: single HTML file + system-hosted Google Fonts; no build step; no framework; Lighthouse-green on mobile.

## 6. Approaches considered

- **A (chosen): single-file static page, vanilla HTML/CSS/JS, CSS 3D, GitHub Pages.** Zero build, zero dependencies, deployable today from a public repo, trivially maintainable. Matches product ethos (local-first, files, no keys).
- **B: Astro/Next + Three.js WebGL hero.** Visually richer ceiling, but adds a toolchain, node_modules, and build/deploy complexity to a repo that has none of it — and WebGL is a heavy price for one scene.
- **C: Docs-site framework (VitePress) with landing page.** Right move later when docs grow; more scope than the current goal (a launch/marketing surface).

## 7. Launch plan

- Site source lives at `website/index.html` in the repo working tree (left uncommitted on the user's active fix branch — committing is the user's call per their global rule).
- Deploy: create an orphan `gh-pages` branch in an **isolated git worktree** (does not touch the user's current checkout or dirty working tree), copy the site in, commit, push. GitHub auto-publishes `gh-pages` for public repos → `https://fluidumber.github.io/AutoPM/`.
- Verify live URL by polling; if Pages doesn't auto-enable, the fallback is one click in repo Settings → Pages → deploy from `gh-pages` branch (documented in final report).

## 8. Out of scope (YAGNI)

- Email-capture backend / analytics / newsletter service (needs accounts the session doesn't have; mailto is honest at Sequence 0).
- Custom domain (autopm.ai is currently only a local hosts-file alias; DNS purchase is a user decision).
- Multi-page docs, blog, pricing page (product is free OSS today).
- Testimonials/logos (none exist; the meta-proof section deliberately replaces fake social proof).

## 9. Process deviations (autonomous session)

- Brainstorming skill approval gates were satisfied by the user's original end-to-end instruction; decisions are recorded here instead of asked interactively.
- Spec is written but **not committed** — the user's global rule ("commit or push only when asked") overrides the skill's commit step; the only push is the explicitly requested launch (`gh-pages`).
- writing-plans/subagent execution skipped: single-artifact build, executed directly with the frontend-design skill.
