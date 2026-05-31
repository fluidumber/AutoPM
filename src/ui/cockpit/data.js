/* Mock data shaped like the real ProductFlow workspace.
   Pulled from the actual PDD JSON + workspace module schemas. */

const WORKSPACE_ROOT = "/Users/anand/.productflow";
const TODAY = new Date("2026-05-24T09:14:22");

function daysAgo(d) {
  return new Date(TODAY.getTime() - d * 86400000).toISOString();
}

function relativeTime(iso) {
  if (!iso) return "—";
  const ms = TODAY.getTime() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const dt = new Date(iso);
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/* ────────────────────────── Workspace ────────────────────────── */

const WORKSPACE = {
  root: WORKSPACE_ROOT,
  resolvedFrom: "$PRODUCTFLOW_HOME",
  checks: [
    { id: "home", label: "PRODUCTFLOW_HOME resolved", target: WORKSPACE_ROOT, status: "ok" },
    { id: "profiles", label: "profiles/ directory readable", target: `${WORKSPACE_ROOT}/profiles`, status: "ok" },
    { id: "active", label: "Active persona pointer found", target: `${WORKSPACE_ROOT}/profiles/active.json → anand-rao`, status: "ok" },
    { id: "products", label: "products/ directory readable", target: `${WORKSPACE_ROOT}/products`, status: "ok", note: "3 products detected" },
    { id: "policy", label: "Staleness policy loaded", target: `config/staleness-policy.json (v1.0.0)`, status: "ok" },
  ],
  activePersona: { slug: "anand-rao", name: "Anand Rao", role: "AI-native PM builder" },
  startedAt: "2026-05-24T09:14:18.302Z",
  binding: "127.0.0.1:4321"
};

/* ────────────────────────── Products ────────────────────────── */

const PRODUCTS = [
  {
    slug: "autopm-productflow",
    name: "AutoPM / ProductFlow",
    stage: "Phase 2 — Execution Definition",
    overview: "Local-first web cockpit over the existing .productflow workspace. Turns hidden generated files into a repeatable product-review habit while preserving local-file transparency and human judgment in the loop.",
    targetMarket: "AI-native PM builders, Product Ops reviewers, junior PMs, and senior PM reviewers using ProductFlow's gated workflow.",
    competitors: ["Aha!", "Productboard", "Jira Product Discovery", "Linear + Notion sprawl", "ChatGPT / Claude (generic AI)"],
    tags: ["local-first", "PM-tooling", "workflow", "MVP-preview"],
    ownerPersona: "anand-rao",
    created: daysAgo(46),
    updated: daysAgo(1),
    currentGate: "G6",
    rollups: { fresh: 9, stale: 2, missing: 5, blocked: 1, locked: 0 },
    nextAction: {
      label: "Run feasibility-tech robot",
      reason: "G6 Phase 2 in progress — feasibility-tech is the only Phase 2 robot missing for PDD assembly. People robot is stale (older than 180d policy window).",
      gate: "G6",
      affects: ["robot:feasibility-tech", "pdd-readiness"]
    }
  },
  {
    slug: "lucidya-cdp-strategy",
    name: "Lucidya CDP Strategy",
    stage: "Phase 1 — Strategic Discovery",
    overview: "Customer data platform repositioning analysis for Lucidya: scope, competitors, financial model, and roll-out priorities.",
    targetMarket: "Arabic-speaking enterprise marketing teams in MENA.",
    competitors: ["Segment", "Twilio", "Tealium"],
    tags: ["analysis", "client-engagement"],
    ownerPersona: "anand-rao",
    created: daysAgo(88),
    updated: daysAgo(11),
    currentGate: "G4",
    rollups: { fresh: 4, stale: 3, missing: 0, blocked: 0, locked: 10 },
    nextAction: {
      label: "Promote to Phase 2",
      reason: "All Phase 1 robots present. 3 are stale and worth re-running before promotion.",
      gate: "G4",
      affects: ["promote-to-phase-2"]
    }
  },
  {
    slug: "ai-fitness-coaching-app",
    name: "AI Fitness Coaching App",
    stage: "Phase 1 — Strategic Discovery",
    overview: "Personalised coaching prototype combining LLM dialogue with wearable signals.",
    targetMarket: "Self-directed amateur athletes, 28-45.",
    competitors: ["Whoop", "Strava", "Future"],
    tags: ["prototype", "consumer"],
    ownerPersona: "anand-rao",
    created: daysAgo(40),
    updated: daysAgo(4),
    currentGate: "G3",
    rollups: { fresh: 0, stale: 0, missing: 7, blocked: 0, locked: 10 },
    nextAction: {
      label: "Run scout robot",
      reason: "Interview answered; no Phase 1 robots have been run yet.",
      gate: "G4",
      affects: ["robot:scout"]
    }
  }
];

/* ────────────────────── Gates (G1-G8) ────────────────────────── */

function gatesFor(productSlug) {
  if (productSlug === "autopm-productflow") {
    return [
      { id: "G1", name: "PM Profile exists",       status: "passed",  reason: "Active persona: anand-rao",                                                       nextAction: null },
      { id: "G2", name: "Product created",         status: "passed",  reason: "products/autopm-productflow/ scaffolded 46 days ago",                              nextAction: null },
      { id: "G3", name: "Interview answered",      status: "passed",  reason: "7 fresh interview answers on disk (≥ 5 required)",                                 nextAction: null },
      { id: "G4", name: "Phase 1 complete",        status: "passed",  reason: "All 7 Phase 1 robots fresh as of 2026-05-23",                                      nextAction: null },
      { id: "G5", name: "Phase 2 promoted",        status: "passed",  reason: "context/phase2-context.json present (2026-05-21)",                                 nextAction: null },
      { id: "G6", name: "Phase 2 in progress",     status: "current", reason: "5 of 10 Phase 2 robots fresh. Awaiting feasibility-tech, customer-journeys, data-privacy, kpis, daci-stakeholders.", nextAction: "Run remaining Phase 2 robots; ProductFlow recommends feasibility-tech next." },
      { id: "G7", name: "PDD exported",            status: "blocked", reason: "assets/pdd/pdd-autopm-productflow-latest.md not found — Phase 2 incomplete",        nextAction: "Run remaining Phase 2 robots first." },
      { id: "G8", name: "Presentation generated",  status: "mismatch",reason: "Presentation HTML exists at plans/autopm-productflow-strategy-presentation.html, but gate bookkeeping expects assets/. See artifact/gate mismatch.", nextAction: "Move or symlink to assets/, or re-run generate-presentation." }
    ];
  }
  if (productSlug === "lucidya-cdp-strategy") {
    return [
      { id: "G1", status: "passed", name: "PM Profile exists",   reason: "Active persona: anand-rao" },
      { id: "G2", status: "passed", name: "Product created",     reason: "Scaffolded 88d ago" },
      { id: "G3", status: "passed", name: "Interview answered",  reason: "6 fresh interview answers" },
      { id: "G4", status: "current",name: "Phase 1 complete",    reason: "All 7 robots present; 3 are stale.", nextAction: "Re-run scout, detective, plan." },
      { id: "G5", status: "blocked",name: "Phase 2 promoted",    reason: "Awaiting G4." },
      { id: "G6", status: "locked", name: "Phase 2 in progress", reason: "Phase 2 not promoted." },
      { id: "G7", status: "locked", name: "PDD exported",        reason: "" },
      { id: "G8", status: "locked", name: "Presentation generated", reason: "" }
    ];
  }
  // ai-fitness
  return [
    { id: "G1", status: "passed",  name: "PM Profile exists",      reason: "Active persona: anand-rao" },
    { id: "G2", status: "passed",  name: "Product created",        reason: "Scaffolded 40d ago" },
    { id: "G3", status: "current", name: "Interview answered",     reason: "2 of 5 minimum answers captured.", nextAction: "Complete intake interview." },
    { id: "G4", status: "locked",  name: "Phase 1 complete",       reason: "" },
    { id: "G5", status: "locked",  name: "Phase 2 promoted",       reason: "" },
    { id: "G6", status: "locked",  name: "Phase 2 in progress",    reason: "" },
    { id: "G7", status: "locked",  name: "PDD exported",           reason: "" },
    { id: "G8", status: "locked",  name: "Presentation generated", reason: "" }
  ];
}

/* ───────────────────────── Robots ────────────────────────────── */

const ROBOT_META = {
  // Phase 1
  scout:                { label: "Scout",                 desc: "Market scan & sizing",              phase: 1, windowDays: 90,  rationale: "Market conditions shift quarterly" },
  detective:            { label: "Detective",             desc: "Competitive landscape",             phase: 1, windowDays: 60,  rationale: "Competitive landscape moves faster than market sizing" },
  people:               { label: "People",                desc: "Personas & jobs to be done",        phase: 1, windowDays: 180, rationale: "Personas are stable; refresh semi-annually" },
  money:                { label: "Money",                 desc: "Financial model & .xlsx workbook",  phase: 1, windowDays: 90,  rationale: "Financial models need quarterly refresh" },
  // Phase 1.5
  epic:                 { label: "Epic",                  desc: "Deconstruct asks into epics",       phase: 1.5, windowDays: 30, rationale: "Hypothesis shifting happens dynamically" },
  feature:              { label: "Feature",               desc: "Feature inventory & scope",         phase: 1.5, windowDays: 30,  rationale: "Feature scope changes with each planning cycle" },
  plan:                 { label: "Plan",                  desc: "Roadmap & waves",                   phase: 1.5, windowDays: 30,  rationale: "Roadmap adjusts monthly" },
  priority:             { label: "Priority",              desc: "RICE prioritisation",               phase: 1.5, windowDays: 30,  rationale: "Prioritisation re-runs with each sprint" },
  // Phase 2
  "user-stories":       { label: "User Stories",          desc: "Persona-mapped acceptance criteria",phase: 2, windowDays: 30,  rationale: "Stories tied to sprint scope" },
  "scope-spec":         { label: "Scope & Spec",          desc: "Core / non-core / out-of-scope",    phase: 2, windowDays: 30,  rationale: "Scope changes with each planning cycle" },
  "feasibility-tech":   { label: "Feasibility — Tech",    desc: "Architecture & risks",              phase: 2, windowDays: 60,  rationale: "Tech decisions evolve with architecture reviews" },
  "feasibility-design": { label: "Feasibility — Design",  desc: "Design principles & wireflow",      phase: 2, windowDays: 60,  rationale: "Design principles re-evaluated each cycle" },
  "customer-journeys":  { label: "Customer Journeys",     desc: "Persona × step matrix",             phase: 2, windowDays: 90,  rationale: "Journey maps are semi-stable" },
  "data-privacy":       { label: "Data Privacy",          desc: "InfoSec / Legal / Certification",   phase: 2, windowDays: 90,  rationale: "Compliance requirements shift infrequently" },
  "gtm-readiness":      { label: "GTM Readiness",         desc: "CX matrix & waves",                 phase: 2, windowDays: 30,  rationale: "GTM plans adjust with launch timing" },
  "risks-registry":     { label: "Risks Registry",        desc: "Top risks & owners",                phase: 2, windowDays: 30,  rationale: "Risk landscape changes with each sprint" },
  kpis:                 { label: "KPIs",                  desc: "North star & breakdowns",           phase: 2, windowDays: 90,  rationale: "KPI targets refresh with OKR cycles" },
  "daci-stakeholders":  { label: "DACI & Stakeholders",   desc: "Driver / Approver / Contributor",   phase: 2, windowDays: 180, rationale: "Stakeholder structure is semi-stable" }
};

const ROBOT_RUNS = {
  // Each key matches a robot. fresh|stale|missing|blocked|locked
  // assetPath is relative to product dir (so prepend products/<slug>/)
  "autopm-productflow": {
    scout:                { status: "fresh", lastRun: daysAgo(12), assetPath: "assets/2026-05-12-scout.md",                feedback: { rating: 4, count: 1 } },
    detective:            { status: "fresh", lastRun: daysAgo(8),  assetPath: "assets/2026-05-16-detective.md",            feedback: { rating: 5, count: 2 } },
    people:               { status: "stale", lastRun: daysAgo(192),assetPath: "assets/2025-11-13-people.md",               feedback: null, staleReason: "Last run 192 days ago — exceeds 180-day window. Personas may not reflect latest interviews." },
    money:                { status: "fresh", lastRun: daysAgo(35), assetPath: "assets/2026-04-19-money.md",                feedback: { rating: 4, count: 1 }, hasWorkbook: true, workbookPath: "assets/2026-04-19-money-model.xlsx" },
    feature:              { status: "fresh", lastRun: daysAgo(6),  assetPath: "assets/2026-05-18-feature.md",              feedback: { rating: 5, count: 1 } },
    plan:                 { status: "fresh", lastRun: daysAgo(4),  assetPath: "assets/2026-05-20-plan.md",                 feedback: null },
    priority:             { status: "fresh", lastRun: daysAgo(2),  assetPath: "assets/2026-05-22-priority.md",             feedback: { rating: 4, count: 1 } },
    "user-stories":       { status: "fresh", lastRun: daysAgo(3),  assetPath: "assets/2026-05-21-user-stories.md",         feedback: { rating: 4, count: 1 } },
    "scope-spec":         { status: "fresh", lastRun: daysAgo(1),  assetPath: "assets/2026-05-23-scope-spec.md",           feedback: null },
    "feasibility-tech":   { status: "missing", lastRun: null, assetPath: null, reason: "No feasibility-tech output has been generated for this product." },
    "feasibility-design": { status: "fresh", lastRun: daysAgo(1),  assetPath: "assets/2026-05-23-feasibility-design.md",   feedback: { rating: 5, count: 1 } },
    "customer-journeys":  { status: "missing", lastRun: null, reason: "Phase 2 robot not yet run." },
    "data-privacy":       { status: "missing", lastRun: null, reason: "Phase 2 robot not yet run." },
    "gtm-readiness":      { status: "fresh", lastRun: daysAgo(7),  assetPath: "assets/2026-05-17-gtm-readiness.md",        feedback: null },
    "risks-registry":     { status: "stale", lastRun: daysAgo(38), assetPath: "assets/2026-04-16-risks-registry.md",       feedback: null, staleReason: "Last run 38 days ago — exceeds 30-day window. Sprint risks may have shifted." },
    kpis:                 { status: "missing", lastRun: null, reason: "Phase 2 robot not yet run." },
    "daci-stakeholders":  { status: "missing", lastRun: null, reason: "Phase 2 robot not yet run." }
  }
};

/* ────────────────────────── Artifacts ────────────────────────── */

// Artifact library entries for autopm-productflow.
// Type: markdown | xlsx | pdd | presentation | context
const ARTIFACTS = {
  "autopm-productflow": [
    // markdown outputs
    { id: "art-1",  type: "markdown",     robot: "scout",                 title: "Scout — Market scan",                   filename: "2026-05-12-scout.md",                       path: "products/autopm-productflow/assets/2026-05-12-scout.md",                       generated: daysAgo(12), size: "11 KB" },
    { id: "art-2",  type: "markdown",     robot: "detective",             title: "Detective — Competitive landscape",     filename: "2026-05-16-detective.md",                   path: "products/autopm-productflow/assets/2026-05-16-detective.md",                   generated: daysAgo(8),  size: "14 KB" },
    { id: "art-3",  type: "markdown",     robot: "people",                title: "People — Personas (STALE)",             filename: "2025-11-13-people.md",                      path: "products/autopm-productflow/assets/2025-11-13-people.md",                      generated: daysAgo(192),size: "9 KB" },
    { id: "art-4",  type: "markdown",     robot: "money",                 title: "Money — Financial model summary",       filename: "2026-04-19-money.md",                       path: "products/autopm-productflow/assets/2026-04-19-money.md",                       generated: daysAgo(35), size: "7 KB" },
    { id: "art-5",  type: "xlsx",         robot: "money",                 title: "Money — Editable workbook",             filename: "2026-04-19-money-model.xlsx",               path: "products/autopm-productflow/assets/2026-04-19-money-model.xlsx",               generated: daysAgo(35), size: "38 KB" },
    { id: "art-6",  type: "markdown",     robot: "feature",               title: "Feature — Inventory & scope",           filename: "2026-05-18-feature.md",                     path: "products/autopm-productflow/assets/2026-05-18-feature.md",                     generated: daysAgo(6),  size: "8 KB" },
    { id: "art-7",  type: "markdown",     robot: "plan",                  title: "Plan — 18-month roadmap",               filename: "2026-05-20-plan.md",                        path: "products/autopm-productflow/assets/2026-05-20-plan.md",                        generated: daysAgo(4),  size: "6 KB" },
    { id: "art-8",  type: "markdown",     robot: "priority",              title: "Priority — RICE scoring",               filename: "2026-05-22-priority.md",                    path: "products/autopm-productflow/assets/2026-05-22-priority.md",                    generated: daysAgo(2),  size: "5 KB" },
    { id: "art-9",  type: "markdown",     robot: "user-stories",          title: "User Stories — Phase 2 stories",        filename: "2026-05-21-user-stories.md",                path: "products/autopm-productflow/assets/2026-05-21-user-stories.md",                generated: daysAgo(3),  size: "12 KB" },
    { id: "art-10", type: "markdown",     robot: "scope-spec",            title: "Scope & Spec — Core, non-core, OOS",    filename: "2026-05-23-scope-spec.md",                  path: "products/autopm-productflow/assets/2026-05-23-scope-spec.md",                  generated: daysAgo(1),  size: "9 KB" },
    { id: "art-11", type: "markdown",     robot: "feasibility-design",    title: "Feasibility — Design (this artifact)",  filename: "2026-05-23-feasibility-design.md",          path: "products/autopm-productflow/assets/2026-05-23-feasibility-design.md",          generated: daysAgo(1),  size: "17 KB" },
    { id: "art-12", type: "markdown",     robot: "gtm-readiness",         title: "GTM Readiness — Waves & matrix",        filename: "2026-05-17-gtm-readiness.md",               path: "products/autopm-productflow/assets/2026-05-17-gtm-readiness.md",               generated: daysAgo(7),  size: "10 KB" },
    { id: "art-13", type: "markdown",     robot: "risks-registry",        title: "Risks Registry (STALE)",                filename: "2026-04-16-risks-registry.md",              path: "products/autopm-productflow/assets/2026-04-16-risks-registry.md",              generated: daysAgo(38), size: "8 KB" },
    // PDD + presentation
    { id: "art-14", type: "pdd",          robot: "pdd-composer",          title: "PDD draft v1.0.1 (Phase 2 — incomplete)",filename: "pdd-autopm-productflow-v1.0.1.json",       path: "products/autopm-productflow/assets/pdd/pdd-autopm-productflow-v1.0.1.json",    generated: daysAgo(1),  size: "52 KB", note: "Draft. Some sections still cite missing Phase 2 robots." },
    { id: "art-15", type: "presentation", robot: "presentation",          title: "Strategy presentation (mismatched path)",filename: "autopm-productflow-strategy-presentation.html",path: "plans/autopm-productflow-strategy-presentation.html",                          generated: daysAgo(9),  size: "42 KB", mismatch: true }
  ]
};

/* ────────────────────────── Context ──────────────────────────── */

const CONTEXT = {
  "autopm-productflow": [
    { id: "ctx-1", type: "note",                title: "Anand's local-first PM frustration notes",     source: "context/notes.md",                                 path: "products/autopm-productflow/context/notes.md",                                  date: daysAgo(46), size: "4 KB",  excerpt: "Folder-diving is the central friction. PMs trust artifacts they can see in context, not as raw files. The cockpit must keep the product visible before the files." },
    { id: "ctx-2", type: "interview-answers",   title: "Phase 1 intake interview answers",             source: "context/interview-answers.md",                     path: "products/autopm-productflow/context/interview-answers.md",                      date: daysAgo(45), size: "6 KB",  excerpt: "Target geo: global / India home base. Pain point: ProductFlow outputs are generated but never reviewed by stakeholders. Most-trusted source: own product reviews + 3 design partner conversations." },
    { id: "ctx-3", type: "url",                 title: "Productboard pricing page (competitor)",       source: "https://www.productboard.com/pricing",             path: "products/autopm-productflow/context/urls/productboard-pricing.url",            date: daysAgo(40), size: "1 KB",  excerpt: "Captured pricing tiers, plan limits, and 'AI features' positioning for Detective robot comparison." },
    { id: "ctx-4", type: "document",            title: "Building a Product Management Orchestration Platform (white paper)", source: "Local DOCX",                          path: "products/autopm-productflow/context/documents/orchestration-platform.docx",     date: daysAgo(43), size: "180 KB", excerpt: "Internal white paper outlining the gated PM method and how robot outputs become a durable decision history. Source material for People + Plan robots." },
    { id: "ctx-5", type: "analyst-report",      title: "Gartner Magic Quadrant — Product Management 2025", source: "Analyst — Gartner",                            path: "products/autopm-productflow/context/research/gartner-mq-2025.pdf",              date: daysAgo(74), size: "2.4 MB", excerpt: "Used by Detective. Productboard, Aha!, and Jira Product Discovery sit in leaders; gaps in AI-native artifact lifecycle." },
    { id: "ctx-6", type: "research",            title: "12 PM interview transcripts — pain themes",    source: "Internal research repo",                            path: "products/autopm-productflow/context/research/interviews-q1-2026.md",            date: daysAgo(60), size: "21 KB", excerpt: "PM Ops reviewers and junior PMs reported repeated 'where is the latest artifact?' confusion. Strong evidence for next-action panel + freshness explanations." },
    { id: "ctx-7", type: "survey-result",       title: "Design partner cohort — preview willingness",  source: "Typeform export",                                  path: "products/autopm-productflow/context/research/preview-willingness-survey.csv",   date: daysAgo(28), size: "12 KB", excerpt: "5 of 7 respondents willing to run a local server before demanding hosted. 2 of 7 conditional on README quality." },
    { id: "ctx-8", type: "experiment-feedback", title: "Wave 0 dogfood — first ProductFlow review",    source: "Self-experiment notes",                            path: "products/autopm-productflow/context/research/wave-0-dogfood.md",                date: daysAgo(18), size: "5 KB",  excerpt: "Opening 3 products and 24 artifacts took 90 seconds in the prototype vs 12 minutes with Finder. Feedback persistence was the single most-requested feature in interview round 2." }
  ]
};

const CONTEXT_TYPE_LABEL = {
  "note": "Note",
  "interview-answers": "Interview",
  "url": "URL",
  "document": "Document",
  "analyst-report": "Analyst",
  "research": "Research",
  "survey-result": "Survey",
  "experiment-feedback": "Experiment"
};

/* ───────────────────────── Activity ─────────────────────────── */

const ACTIVITY = {
  "autopm-productflow": [
    { kind: "fresh",    when: daysAgo(1),  text: "feasibility-design ran — output saved to assets/2026-05-23-feasibility-design.md" },
    { kind: "fresh",    when: daysAgo(1),  text: "scope-spec ran — output saved to assets/2026-05-23-scope-spec.md" },
    { kind: "feedback", when: daysAgo(1),  text: "Feedback 5/5 on feasibility-design — 'Direction is right; let's not overbuild stakeholder views.'" },
    { kind: "fresh",    when: daysAgo(2),  text: "priority ran — output saved to assets/2026-05-22-priority.md" },
    { kind: "fresh",    when: daysAgo(3),  text: "user-stories ran — output saved to assets/2026-05-21-user-stories.md" },
    { kind: "feedback", when: daysAgo(4),  text: "Feedback 4/5 on plan — 'Months 12-18 are speculative; flag explicitly.'" },
    { kind: "stale",    when: daysAgo(8),  text: "people output marked stale — exceeds 180-day window" }
  ]
};

/* ─────────── Rendered markdown of feasibility-design ──────────
   (Reuses the file the user uploaded — this is what the cockpit
   would render when opening the artifact in the browser.) */

const ARTIFACT_BODY_FEASIBILITY_DESIGN = `# Design Feasibility — AutoPM / ProductFlow Web Frontend

**Date:** 2026-05-23  ·  **Phase:** Phase 2 Execution Definition  ·  **Robot:** feasibility-design  ·  **Status:** Draft for PM review

## Design Feasibility Verdict

Design feasible, with one important warning: the MVP must feel like a **workflow cockpit**, not a prettier file browser.

The core design challenge is not layout complexity. It is **trust orchestration** — helping a PM see what exists, what is fresh, what is missing, what evidence is attached, what financial workbook exists, what feedback has been captured, and what next step ProductFlow recommends.

## Design Principles

| Principle | Description |
|---|---|
| Show The Product Before The Files | Every screen should keep product context visible. |
| Make Freshness Explain Itself | Fresh, stale, missing, and blocked states must expose the reason. |
| Treat Local Paths As Trust Signals | Paths are visible and copyable, never the main navigation. |
| Guide Without Taking Over | Recommend next action; let senior PMs inspect freely. |
| Feedback Is A Product Action | Ratings persist into ProductFlow, not just the UI. |
| Separate Gate State From Artifact Existence | When a file exists but a gate disagrees, show both. |
| Dense, Calm, Repeatable | Compact tables, status bands, drawers — not marketing cards. |

## Screen-by-Screen Wireflow

| # | Screen | Key Design Decision |
|---:|---|---|
| 1 | Local Workspace Check | Compact diagnostic; not a scary terminal failure. |
| 2 | Product Index | Dense rows, sortable, with explicit empty state. |
| 3 | Product Home | Full-width status bands; avoid decorative cards. |
| 4 | G1-G8 Status | Plain-language labels; status uses color + icon + text. |
| 5 | Next Action | Advisory, not modal; senior users can ignore. |
| 6 | Robot Grid | Compact rows over big cards; this is repeated work. |
| 7 | Freshness Drawer | Explanation written for PMs, not engineers. |
| 8 | Artifact Library | Group by robot/type/date — not by filename. |
| 9 | Markdown Viewer | Sticky artifact header; source path visible but secondary. |
| 10 | Feedback Panel | Inline; explain that this changes ProductFlow learning. |

## Accessibility Commitments

1. Keyboard navigation across product index, robot grid, drawers, feedback, copy buttons.
2. Visible focus indicators with sufficient contrast.
3. **Status is not color-only** — text label + icon + color on every state.
4. Operational text meets WCAG AA contrast.
5. Markdown viewer preserves semantic heading and table structure.
6. Drawer and modal-like panels manage focus predictably.
7. Errors describe recovery, not just failure.
8. Icon buttons meet a practical 44px touch guidance even in compact layouts.

## Visual Design Direction

- Operational product management cockpit, not a marketing dashboard.
- Calm, precise, local-first, trustworthy.
- Left product / navigation rail, main content, right contextual drawer.
- Compact tables and status bands over oversized cards.
- Restrained status palette — color is secondary to text labels.

> Treat visuals, share bundles, and stakeholder polish as **deferred**. The MVP earns the right to expand once activation is proven.
`;

const FEEDBACK_SEED = {
  "art-11": { rating: 5, notes: "Direction is right; let's not overbuild stakeholder views. Want to see the freshness drawer in action before approving the spec.", at: daysAgo(1) },
  "art-7":  { rating: 4, notes: "Months 12-18 are speculative; flag explicitly.", at: daysAgo(4) }
};

/* ───────────────────────── Feedback inbox events (cross-product) ────────── */

const FEEDBACK_EVENTS = [
  { id: "fb-1",  productSlug: "autopm-productflow",   robot: "feasibility-design", artifactId: "art-11", rating: 5, notes: "Direction is right; let's not overbuild stakeholder views.",                                 at: daysAgo(1),  status: "saved", persona: "anand-rao" },
  { id: "fb-2",  productSlug: "autopm-productflow",   robot: "scope-spec",         artifactId: "art-10", rating: 4, notes: "Coverage map is solid. Add a note about how mismatch resolution is intentional.",            at: daysAgo(1),  status: "saved", persona: "anand-rao" },
  { id: "fb-3",  productSlug: "autopm-productflow",   robot: "priority",           artifactId: "art-8",  rating: 4, notes: "Re-rank: feedback persistence should sit above stakeholder share bundle.",                   at: daysAgo(2),  status: "saved", persona: "anand-rao" },
  { id: "fb-4",  productSlug: "autopm-productflow",   robot: "user-stories",       artifactId: "art-9",  rating: 4, notes: "Acceptance criteria for A8 (local paths) should explicitly mention path-allowlist behaviour.", at: daysAgo(3),  status: "saved", persona: "anand-rao" },
  { id: "fb-5",  productSlug: "autopm-productflow",   robot: "plan",               artifactId: "art-7",  rating: 4, notes: "Months 12-18 are speculative; flag explicitly.",                                              at: daysAgo(4),  status: "saved", persona: "anand-rao" },
  { id: "fb-6",  productSlug: "autopm-productflow",   robot: "detective",          artifactId: "art-2",  rating: 5, notes: "Productboard and Aha! positioning is sharp. Add Jira Product Discovery's recent AI features.",at: daysAgo(8),  status: "saved", persona: "anand-rao" },
  { id: "fb-7",  productSlug: "autopm-productflow",   robot: "detective",          artifactId: "art-2",  rating: 5, notes: "Second pass — competitive landscape conclusion holds.",                                       at: daysAgo(6),  status: "saved", persona: "anand-rao" },
  { id: "fb-8",  productSlug: "autopm-productflow",   robot: "money",              artifactId: "art-4",  rating: 4, notes: "Sensitivities tab needs CAC scenario at 2.5x for safety.",                                    at: daysAgo(11), status: "saved", persona: "anand-rao" },
  { id: "fb-9",  productSlug: "autopm-productflow",   robot: "feature",            artifactId: "art-6",  rating: 5, notes: "Feature inventory matches the selected execution backlog.",                                   at: daysAgo(5),  status: "saved", persona: "anand-rao" },
  { id: "fb-10", productSlug: "autopm-productflow",   robot: "scout",              artifactId: "art-1",  rating: 4, notes: "Market sizing OK; cite source surveys inline next run.",                                      at: daysAgo(10), status: "saved", persona: "anand-rao" },
  { id: "fb-11", productSlug: "lucidya-cdp-strategy", robot: "detective",          artifactId: null,     rating: 3, notes: "MENA-specific competitor coverage is thin — re-run with regional sources.",                  at: daysAgo(11), status: "saved", persona: "anand-rao" },
  { id: "fb-12", productSlug: "lucidya-cdp-strategy", robot: "plan",               artifactId: null,     rating: 3, notes: "Roadmap reads US-default; localise the wave naming.",                                         at: daysAgo(14), status: "saved", persona: "anand-rao" },
  { id: "fb-13", productSlug: "autopm-productflow",   robot: "gtm-readiness",      artifactId: "art-12", rating: 4, notes: "Wave 2 activation target is aggressive — sanity-check against 5-partner cohort.",            at: daysAgo(7),  status: "saved", persona: "anand-rao" }
];

/* ───────────────────────── Staleness policy table (mirrors config/) ────────── */

const STALENESS_POLICY = {
  version: "1.0.0",
  source: "config/staleness-policy.json",
  resolutionOrder: [
    { tier: 1, name: "Per-product override", path: "products/<slug>/staleness-overrides.json", precedence: "highest" },
    { tier: 2, name: "Per-persona override", path: "profiles/<slug>/staleness-overrides.json", precedence: "high" },
    { tier: 3, name: "Project policy",        path: "config/staleness-policy.json",            precedence: "medium" },
    { tier: 4, name: "Compiled-in defaults",  path: "freshness-tracker.js",                    precedence: "fallback" }
  ],
  interviewAnswers: { windowDays: 180, rationale: "PM context is stable for 6 months" },
  overrides: {
    // What overrides are currently active for the active persona / product
    "autopm-productflow": {
      "people": { windowDays: 120, source: "per-persona", note: "Anand refreshes personas more frequently than the default 180-day window." }
    }
  }
};

window.PFData = {
  WORKSPACE, PRODUCTS, gatesFor, ROBOT_META, ROBOT_RUNS, ARTIFACTS,
  CONTEXT, CONTEXT_TYPE_LABEL, ACTIVITY, ARTIFACT_BODY_FEASIBILITY_DESIGN,
  FEEDBACK_SEED, FEEDBACK_EVENTS, STALENESS_POLICY,
  TODAY, daysAgo, relativeTime, formatDate
};
