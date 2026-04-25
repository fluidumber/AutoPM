// pdd-renderer.js — PDD JSON → Notion-compatible markdown + optional HTML.
//
// This module is a PURE RENDERER.  It accepts a fully-assembled PDD JSON object
// and converts it to human-readable documents.  It does NOT fetch data, call
// robots, or make Claude requests.
//
// Two exports:
//   renderMarkdown(pddJson)  → Notion-compatible markdown string
//   renderHtml(pddJson)      → standalone HTML string (for plans/ export)
//
// Notion compatibility rules enforced:
//   - H1  (#) is the document title only
//   - H2  (##) for major sections
//   - H3  (###) for sub-sections
//   - Tables use standard markdown pipe syntax
//   - No raw HTML in the markdown output
//   - Code fences used only for Mermaid diagrams

// ── Helper utilities ───────────────────────────────────────────────────

function safe(value, fallback = "—") {
    if (value === null || value === undefined || value === "") return fallback;
    return String(value);
}

function safeArray(arr, fallback = []) {
    return Array.isArray(arr) && arr.length > 0 ? arr : fallback;
}

/**
 * Render a flat array of strings as a markdown bulleted list.
 * @param {string[]} items
 * @returns {string}
 */
function bulletList(items) {
    if (!items || items.length === 0) return "_None specified_";
    return items.map(i => `- ${i}`).join("\n");
}

/**
 * Render a markdown table from an array of objects.
 * @param {string[]} headers
 * @param {string[][]} rows
 * @returns {string}
 */
function mdTable(headers, rows) {
    if (!rows || rows.length === 0) return "_No data_";
    const header = `| ${headers.join(" | ")} |`;
    const divider = `| ${headers.map(() => "---").join(" | ")} |`;
    const body = rows.map(row => `| ${row.map(cell => safe(cell).replace(/\|/g, "\\|")).join(" | ")} |`).join("\n");
    return `${header}\n${divider}\n${body}`;
}

// ── Section renderers ──────────────────────────────────────────────────

function renderMeta(meta) {
    if (!meta) return "";
    const lines = [
        `# Product Definition Document: ${safe(meta.productName)}`,
        "",
        mdTable(
            ["Field", "Value"],
            [
                ["Product", safe(meta.productName)],
                ["Slug", safe(meta.slug)],
                ["Version", safe(meta.version)],
                ["Status", safe(meta.status)],
                ["Owner", `${safe(meta.owner?.name)} (${safe(meta.owner?.role)}) — ${safe(meta.owner?.email)}`],
                ["Created", safe(meta.createdAt)],
                ["Last Updated", safe(meta.lastUpdated)],
            ]
        ),
    ];
    return lines.join("\n");
}

function renderSectionStatus(sectionStatus) {
    if (!Array.isArray(sectionStatus) || sectionStatus.length === 0) return "";
    const rows = sectionStatus.map(s => [
        safe(s.section),
        s.draftComplete ? "✅ Draft" : "⬜ Pending",
        s.finalComplete ? "✅ Final" : "⬜ Pending",
    ]);
    return [
        "## PDD Status Tracker",
        "",
        mdTable(["Section", "Draft", "Final"], rows),
    ].join("\n");
}

function renderDaci(daci) {
    if (!daci) return "";
    const { driver, approver, contributors, informed } = daci;
    const rows = [
        ["Driver (D)", safe(driver?.name), safe(driver?.role)],
        ["Approver (A)", safe(approver?.name), safe(approver?.role)],
        ...safeArray(contributors).map(c => ["Contributor (C)", safe(c.name), safe(c.role)]),
        ...safeArray(informed).map(i => ["Informed (I)", safe(i.name), safe(i.role)]),
    ];
    return [
        "## DACI",
        "",
        mdTable(["Role", "Name", "Title"], rows),
    ].join("\n");
}

function renderKeyContacts(contacts) {
    if (!Array.isArray(contacts) || contacts.length === 0) return "";
    const rows = contacts.map(c => [
        safe(c.name),
        safe(c.role),
        safe(c.company),
        safe(c.email),
    ]);
    return [
        "## Key Contacts",
        "",
        mdTable(["Name", "Role", "Company / Team", "Email"], rows),
    ].join("\n");
}

function renderScope(scope) {
    if (!scope) return "";
    const sections = [
        "## Scope and Specifications",
        "",
    ];

    if (scope.criticalChange !== undefined) {
        sections.push(`> **Critical Change Flag**: ${scope.criticalChange ? "🔴 Yes — this feature changes existing user behaviour" : "🟢 No — net-new addition"}`);
        sections.push("");
    }

    if (scope.coreFunctionalities) {
        sections.push("### Core Functionalities");
        sections.push("");
        sections.push(typeof scope.coreFunctionalities === "string"
            ? scope.coreFunctionalities
            : bulletList(scope.coreFunctionalities));
        sections.push("");
    }

    if (scope.nonCoreFunctionalities) {
        sections.push("### Non-Core Functionalities");
        sections.push("");
        sections.push(typeof scope.nonCoreFunctionalities === "string"
            ? scope.nonCoreFunctionalities
            : bulletList(scope.nonCoreFunctionalities));
        sections.push("");
    }

    if (scope.rolesAndPermissions) {
        sections.push("### Roles and Permissions");
        sections.push("");
        sections.push(typeof scope.rolesAndPermissions === "string"
            ? scope.rolesAndPermissions
            : bulletList(scope.rolesAndPermissions));
        sections.push("");
    }

    if (Array.isArray(scope.outOfScope) && scope.outOfScope.length > 0) {
        sections.push("### Out of Scope");
        sections.push("");
        sections.push(bulletList(scope.outOfScope));
        sections.push("");
    }

    if (Array.isArray(scope.assumptions) && scope.assumptions.length > 0) {
        sections.push("### Assumptions");
        sections.push("");
        sections.push(bulletList(scope.assumptions));
        sections.push("");
    }

    if (Array.isArray(scope.constraints) && scope.constraints.length > 0) {
        sections.push("### Constraints");
        sections.push("");
        sections.push(bulletList(scope.constraints));
        sections.push("");
    }

    if (Array.isArray(scope.limitations) && scope.limitations.length > 0) {
        sections.push("### Limitations");
        sections.push("");
        sections.push(bulletList(scope.limitations));
        sections.push("");
    }

    return sections.join("\n");
}

function renderUserStories(userStories) {
    if (!userStories) return "";
    const stories = Array.isArray(userStories)
        ? userStories
        : safeArray(userStories.stories);

    if (stories.length === 0) return "";

    const rows = stories.map(s => [
        safe(s.priority),
        safe(s.persona),
        safe(s.story),
        Array.isArray(s.acceptanceCriteria) ? s.acceptanceCriteria.join("<br>") : safe(s.acceptanceCriteria),
    ]);

    return [
        "## User Stories",
        "",
        mdTable(["Priority", "Persona", "Story", "Acceptance Criteria"], rows),
    ].join("\n");
}

function renderCustomerJourneys(journeys) {
    if (!Array.isArray(journeys) || journeys.length === 0) return "";

    const sections = ["## Customer Journeys", ""];

    for (const journey of journeys) {
        sections.push(`### ${safe(journey.persona)}: ${safe(journey.title)}`);
        sections.push("");

        const steps = safeArray(journey.steps);
        if (steps.length > 0) {
            const rows = steps.map(s => [
                safe(s.stepNumber),
                safe(s.action),
                safe(s.detail),
            ]);
            sections.push(mdTable(["Step", "Action", "Detail"], rows));
        }
        sections.push("");
    }

    return sections.join("\n");
}

function renderFeasibilityTech(tech) {
    if (!tech) return "";
    const sections = [
        "## Technical Feasibility",
        "",
    ];

    if (tech.architectureOverview) {
        sections.push("### Architecture Overview");
        sections.push("");
        sections.push(safe(tech.architectureOverview));
        sections.push("");
    }

    if (tech.architectureDiagramMermaid) {
        sections.push("### Architecture Diagram");
        sections.push("");
        sections.push("```mermaid");
        sections.push(tech.architectureDiagramMermaid.trim());
        sections.push("```");
        sections.push("");
    }

    if (Array.isArray(tech.technicalConcerns) && tech.technicalConcerns.length > 0) {
        sections.push("### Technical Concerns");
        sections.push("");
        const rows = tech.technicalConcerns.map(c => [
            safe(c.area || c.concern || c),
            safe(c.severity || "—"),
            safe(c.description || c.detail || "—"),
            safe(c.mitigation || "—"),
        ]);
        // Try table first; fall back to bullets if data is flat strings
        if (typeof tech.technicalConcerns[0] === "object") {
            sections.push(mdTable(["Area", "Severity", "Description", "Mitigation"], rows));
        } else {
            sections.push(bulletList(tech.technicalConcerns));
        }
        sections.push("");
    }

    if (Array.isArray(tech.thirdPartyVendors) && tech.thirdPartyVendors.length > 0) {
        sections.push("### Third-Party Vendors");
        sections.push("");
        const rows = tech.thirdPartyVendors.map(v => [
            safe(v.vendor || v.name || v),
            safe(v.purpose || "—"),
            safe(v.risk || "—"),
        ]);
        if (typeof tech.thirdPartyVendors[0] === "object") {
            sections.push(mdTable(["Vendor", "Purpose", "Risk"], rows));
        } else {
            sections.push(bulletList(tech.thirdPartyVendors));
        }
        sections.push("");
    }

    if (tech.securityAndCompliance) {
        sections.push("### Security and Compliance");
        sections.push("");
        sections.push(safe(tech.securityAndCompliance));
        sections.push("");
    }

    if (Array.isArray(tech.infrastructureDependencies) && tech.infrastructureDependencies.length > 0) {
        sections.push("### Infrastructure Dependencies");
        sections.push("");
        sections.push(bulletList(tech.infrastructureDependencies.map(d => typeof d === "object" ? JSON.stringify(d) : d)));
        sections.push("");
    }

    return sections.join("\n");
}

function renderFeasibilityDesign(design) {
    if (!design) return "";
    const sections = ["## Design Feasibility", ""];

    if (Array.isArray(design.designPrinciples) && design.designPrinciples.length > 0) {
        sections.push("### Design Principles");
        sections.push("");
        sections.push(bulletList(design.designPrinciples.map(p => typeof p === "object" ? `**${safe(p.principle || p.name)}**: ${safe(p.rationale || p.detail || "")}` : p)));
        sections.push("");
    }

    if (Array.isArray(design.wireflow) && design.wireflow.length > 0) {
        sections.push("### Wireflow (Screen-by-Screen)");
        sections.push("");
        if (typeof design.wireflow[0] === "object") {
            const rows = design.wireflow.map((s, i) => [
                safe(s.screenNumber || i + 1),
                safe(s.screenName || s.name || "—"),
                safe(s.description || s.detail || "—"),
            ]);
            sections.push(mdTable(["#", "Screen", "Description"], rows));
        } else {
            sections.push(bulletList(design.wireflow));
        }
        sections.push("");
    }

    if (Array.isArray(design.accessibilityCommitments) && design.accessibilityCommitments.length > 0) {
        sections.push("### Accessibility Commitments");
        sections.push("");
        sections.push(bulletList(design.accessibilityCommitments));
        sections.push("");
    }

    return sections.join("\n");
}

function renderDataPrivacy(dataPrivacy) {
    if (!Array.isArray(dataPrivacy) || dataPrivacy.length === 0) return "";
    const rows = dataPrivacy.map(d => [
        safe(d.area),
        safe(d.impact),
        safe(d.description),
        safe(d.mitigation),
    ]);
    return [
        "## Data Privacy, InfoSec, and Compliance",
        "",
        mdTable(["Area", "Impact", "Description", "Mitigation"], rows),
    ].join("\n");
}

function renderRisks(risks) {
    if (!Array.isArray(risks) || risks.length === 0) return "";
    const rows = risks.map(r => [
        safe(r.category),
        safe(r.risk),
        safe(r.probability),
        safe(r.impact),
        safe(r.mitigation),
        safe(r.owner),
    ]);
    return [
        "## Risks Registry",
        "",
        mdTable(["Category", "Risk", "Probability", "Impact", "Mitigation", "Owner"], rows),
    ].join("\n");
}

function renderGtmReadiness(gtm) {
    if (!gtm) return "";
    const sections = ["## GTM Readiness", ""];

    // CX Stage Matrix
    if (Array.isArray(gtm.cxStageMatrix) && gtm.cxStageMatrix.length > 0) {
        sections.push("### CX Stage Matrix");
        sections.push("");
        const headers = Object.keys(gtm.cxStageMatrix[0]);
        const rows = gtm.cxStageMatrix.map(row => headers.map(h => safe(row[h])));
        sections.push(mdTable(headers, rows));
        sections.push("");
    }

    // Rollout
    if (gtm.rollout) {
        sections.push("### Rollout Plan");
        sections.push("");
        if (gtm.rollout.plan) {
            sections.push(safe(gtm.rollout.plan));
            sections.push("");
        }
        if (Array.isArray(gtm.rollout.waves) && gtm.rollout.waves.length > 0) {
            sections.push("#### Waves");
            sections.push("");
            sections.push(bulletList(gtm.rollout.waves.map(w =>
                typeof w === "object" ? `**${safe(w.wave || w.name)}**: ${safe(w.description || w.detail || "")}` : w
            )));
            sections.push("");
        }
    }

    // Preview → GA
    if (gtm.previewToGA) {
        sections.push("### Preview → GA Criteria");
        sections.push("");
        sections.push(safe(gtm.previewToGA));
        sections.push("");
    }

    // Pricing
    if (gtm.pricingAndMonetization) {
        sections.push("### Pricing and Monetization");
        sections.push("");
        sections.push(safe(gtm.pricingAndMonetization));
        sections.push("");
    }

    // Support
    if (gtm.supportAndTroubleshooting) {
        sections.push("### Support and Troubleshooting");
        sections.push("");
        sections.push(safe(gtm.supportAndTroubleshooting));
        sections.push("");
    }

    return sections.join("\n");
}

function renderKPIs(kpis) {
    if (!kpis) return "";
    const sections = ["## Success Metrics and KPIs", ""];

    // North Star
    if (kpis.northStar) {
        const ns = kpis.northStar;
        sections.push("### North Star Metric");
        sections.push("");
        if (typeof ns === "object") {
            sections.push(`**Metric**: ${safe(ns.metric || ns.name)}`);
            if (ns.definition) sections.push(`\n**Definition**: ${safe(ns.definition)}`);
            if (ns.rationale) sections.push(`\n**Rationale**: ${safe(ns.rationale)}`);
        } else {
            sections.push(safe(ns));
        }
        sections.push("");
    }

    const kpiCategories = [
        { key: "adoption",  label: "Adoption KPIs" },
        { key: "retention", label: "Retention KPIs" },
        { key: "usage",     label: "Usage KPIs" },
        { key: "revenue",   label: "Revenue KPIs" },
    ];

    for (const { key, label } of kpiCategories) {
        const items = safeArray(kpis[key]);
        if (items.length === 0) continue;

        sections.push(`### ${label}`);
        sections.push("");

        if (typeof items[0] === "object") {
            const rows = items.map(k => [
                safe(k.kpi || k.name || k.metric),
                safe(k.target || k.goal || "—"),
                safe(k.timeframe || k.period || "—"),
                safe(k.sourceSystem || k.source || "—"),
            ]);
            sections.push(mdTable(["KPI", "Target", "Timeframe", "Source System"], rows));
        } else {
            sections.push(bulletList(items));
        }
        sections.push("");
    }

    if (Array.isArray(kpis.feedbackMechanisms) && kpis.feedbackMechanisms.length > 0) {
        sections.push("### Feedback Mechanisms");
        sections.push("");
        sections.push(bulletList(kpis.feedbackMechanisms));
        sections.push("");
    }

    return sections.join("\n");
}

function renderNarrativeSection(heading, text) {
    if (!text) return "";
    return [`## ${heading}`, "", safe(text), ""].join("\n");
}

function renderAppendix(appendix) {
    if (!appendix) return "";
    const sections = [
        "## Appendix",
        "",
        `**Assembled**: ${safe(appendix.assembledAt)}`,
        "",
    ];

    if (Array.isArray(appendix.robotsPresent) && appendix.robotsPresent.length > 0) {
        sections.push(`**Robots with output**: ${appendix.robotsPresent.join(", ")}`);
    }
    if (Array.isArray(appendix.robotsMissing) && appendix.robotsMissing.length > 0) {
        sections.push(`**Robots not yet run**: ${appendix.robotsMissing.join(", ")}`);
    }

    return sections.join("\n");
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Render a PDD JSON object as Notion-compatible markdown.
 *
 * @param {Object} pddJson - The assembled PDD JSON (produced by Claude via generate-pdd)
 * @returns {string} Full markdown document
 */
export function renderMarkdown(pddJson) {
    if (!pddJson || typeof pddJson !== "object") {
        return "# Error\n\nInvalid PDD JSON passed to renderer.\n";
    }

    const sections = [];

    // ── Title and meta ──────────────────────────────────────────────
    sections.push(renderMeta(pddJson.meta));
    sections.push("");

    // ── Status tracker ──────────────────────────────────────────────
    if (pddJson.sectionStatus) {
        sections.push(renderSectionStatus(pddJson.sectionStatus));
        sections.push("");
    }

    // ── Executive Summary ───────────────────────────────────────────
    if (pddJson.executiveSummary) {
        sections.push(renderNarrativeSection("Executive Summary", pddJson.executiveSummary));
    }

    // ── Feature Overview ────────────────────────────────────────────
    if (pddJson.featureOverview) {
        sections.push(renderNarrativeSection("Feature Overview", pddJson.featureOverview));
    }

    // ── DACI ────────────────────────────────────────────────────────
    if (pddJson.daci) {
        sections.push(renderDaci(pddJson.daci));
        sections.push("");
    }

    // ── Key Contacts ────────────────────────────────────────────────
    if (pddJson.keyContacts) {
        sections.push(renderKeyContacts(pddJson.keyContacts));
        sections.push("");
    }

    // ── Scope ────────────────────────────────────────────────────────
    if (pddJson.scope) {
        sections.push(renderScope(pddJson.scope));
    }

    // ── User Stories ─────────────────────────────────────────────────
    if (pddJson.userStories) {
        sections.push(renderUserStories(pddJson.userStories));
        sections.push("");
    }

    // ── Customer Journeys ────────────────────────────────────────────
    if (pddJson.customerJourneys) {
        sections.push(renderCustomerJourneys(pddJson.customerJourneys));
    }

    // ── Technical Feasibility ────────────────────────────────────────
    if (pddJson.feasibilityTech) {
        sections.push(renderFeasibilityTech(pddJson.feasibilityTech));
    }

    // ── Design Feasibility ───────────────────────────────────────────
    if (pddJson.feasibilityDesign) {
        sections.push(renderFeasibilityDesign(pddJson.feasibilityDesign));
    }

    // ── Competitor Analysis ──────────────────────────────────────────
    if (pddJson.competitorAnalysis) {
        sections.push(renderNarrativeSection("Competitor Analysis", pddJson.competitorAnalysis));
    }

    // ── Roadmap ──────────────────────────────────────────────────────
    if (pddJson.roadmap) {
        sections.push(renderNarrativeSection("Roadmap and Timeline", pddJson.roadmap));
    }

    // ── Data Privacy ─────────────────────────────────────────────────
    if (pddJson.dataPrivacy) {
        sections.push(renderDataPrivacy(pddJson.dataPrivacy));
        sections.push("");
    }

    // ── Risks ────────────────────────────────────────────────────────
    if (pddJson.risks) {
        sections.push(renderRisks(pddJson.risks));
        sections.push("");
    }

    // ── GTM Readiness ────────────────────────────────────────────────
    if (pddJson.gtmReadiness) {
        sections.push(renderGtmReadiness(pddJson.gtmReadiness));
    }

    // ── KPIs ─────────────────────────────────────────────────────────
    if (pddJson.kpis) {
        sections.push(renderKPIs(pddJson.kpis));
    }

    // ── Appendix ─────────────────────────────────────────────────────
    if (pddJson.appendix) {
        sections.push(renderAppendix(pddJson.appendix));
    }

    return sections.filter(s => s !== "").join("\n") + "\n";
}

/**
 * Render a PDD JSON object as a standalone HTML document.
 * Suitable for saving to plans/ directory and opening in a browser.
 *
 * @param {Object} pddJson
 * @returns {string} Full HTML document string
 */
export function renderHtml(pddJson) {
    const markdown = renderMarkdown(pddJson);
    const productName = pddJson?.meta?.productName || "PDD";
    const version = pddJson?.meta?.version || "1.0.0";

    // Convert markdown to basic HTML — no external deps, no marked library.
    // Handles: headings, tables, code fences, bold, bullet lists, blockquotes.
    const html = markdownToHtml(markdown);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(productName)} — PDD v${escapeHtml(version)}</title>
  <style>
    :root {
      --bg: #ffffff;
      --text: #1a1a1a;
      --muted: #6b7280;
      --border: #e5e7eb;
      --accent: #2563eb;
      --header-bg: #f9fafb;
      --code-bg: #f3f4f6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 15px; line-height: 1.7; color: var(--text);
      background: var(--bg); max-width: 1000px; margin: 0 auto;
      padding: 40px 32px 80px;
    }
    h1 { font-size: 2rem; font-weight: 700; margin: 0 0 24px; color: #111; }
    h2 { font-size: 1.35rem; font-weight: 700; margin: 40px 0 12px;
         padding-bottom: 6px; border-bottom: 2px solid var(--border); }
    h3 { font-size: 1.1rem; font-weight: 600; margin: 24px 0 8px; }
    h4 { font-size: 1rem; font-weight: 600; margin: 16px 0 6px; color: var(--muted); }
    p  { margin: 0 0 12px; }
    ul { list-style: disc; padding-left: 24px; margin: 0 0 12px; }
    li { margin: 4px 0; }
    blockquote {
      border-left: 4px solid var(--accent); padding: 8px 16px;
      background: #eff6ff; color: #1e40af; margin: 12px 0; border-radius: 4px;
    }
    table {
      width: 100%; border-collapse: collapse; margin: 12px 0 20px;
      font-size: 14px;
    }
    th {
      background: var(--header-bg); text-align: left; padding: 8px 12px;
      font-weight: 600; border: 1px solid var(--border);
    }
    td { padding: 7px 12px; border: 1px solid var(--border); vertical-align: top; }
    tr:nth-child(even) td { background: var(--header-bg); }
    code, pre {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      background: var(--code-bg); border-radius: 4px;
    }
    code { padding: 2px 6px; font-size: 13px; }
    pre  { padding: 16px; overflow-x: auto; margin: 12px 0; }
    pre code { background: none; padding: 0; }
    strong { font-weight: 600; }
    em { font-style: italic; }
    hr { border: none; border-top: 1px solid var(--border); margin: 24px 0; }
    .pdd-header {
      background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
      color: white; padding: 32px; border-radius: 12px; margin-bottom: 40px;
    }
    .pdd-header h1 { color: white; margin-bottom: 8px; }
    .pdd-header .meta { opacity: 0.85; font-size: 14px; }
  </style>
</head>
<body>
  <div class="pdd-header">
    <h1>${escapeHtml(productName)}</h1>
    <div class="meta">Product Definition Document &bull; Version ${escapeHtml(version)} &bull; ${escapeHtml(pddJson?.meta?.status || "DRAFT")}</div>
  </div>
  ${html}
</body>
</html>`;
}

// ── Internal markdown → HTML converter ────────────────────────────────

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/**
 * Minimal markdown → HTML.
 * Handles the subset used by renderMarkdown():
 *   headings, tables, code fences, blockquotes, bullets, bold, em, hr, p.
 * Not a full CommonMark parser — purpose-built for this renderer's output.
 *
 * @param {string} md
 * @returns {string}
 */
function markdownToHtml(md) {
    const lines = md.split("\n");
    const out = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // Code fence
        if (line.startsWith("```")) {
            const lang = line.slice(3).trim();
            const codeLines = [];
            i++;
            while (i < lines.length && !lines[i].startsWith("```")) {
                codeLines.push(escapeHtml(lines[i]));
                i++;
            }
            out.push(`<pre><code class="language-${escapeHtml(lang)}">${codeLines.join("\n")}</code></pre>`);
            i++;
            continue;
        }

        // Table (detect by | at start)
        if (line.startsWith("|") && i + 1 < lines.length && lines[i + 1].startsWith("|---")) {
            const headers = line.split("|").slice(1, -1).map(h => `<th>${inlineHtml(h.trim())}</th>`).join("");
            i += 2; // skip header + divider
            const rowHtml = [];
            while (i < lines.length && lines[i].startsWith("|")) {
                const cells = lines[i].split("|").slice(1, -1).map(c => `<td>${inlineHtml(c.trim())}</td>`).join("");
                rowHtml.push(`<tr>${cells}</tr>`);
                i++;
            }
            out.push(`<table><thead><tr>${headers}</tr></thead><tbody>${rowHtml.join("")}</tbody></table>`);
            continue;
        }

        // Heading
        const hMatch = line.match(/^(#{1,4})\s+(.+)$/);
        if (hMatch) {
            const level = hMatch[1].length;
            out.push(`<h${level}>${inlineHtml(hMatch[2])}</h${level}>`);
            i++;
            continue;
        }

        // Blockquote
        if (line.startsWith("> ")) {
            out.push(`<blockquote><p>${inlineHtml(line.slice(2))}</p></blockquote>`);
            i++;
            continue;
        }

        // Horizontal rule
        if (line.match(/^---+$/)) {
            out.push("<hr />");
            i++;
            continue;
        }

        // Bullet list — collect consecutive bullet lines
        if (line.startsWith("- ")) {
            const items = [];
            while (i < lines.length && lines[i].startsWith("- ")) {
                items.push(`<li>${inlineHtml(lines[i].slice(2))}</li>`);
                i++;
            }
            out.push(`<ul>${items.join("")}</ul>`);
            continue;
        }

        // Empty line → paragraph break (skip)
        if (line.trim() === "") {
            i++;
            continue;
        }

        // Paragraph
        out.push(`<p>${inlineHtml(line)}</p>`);
        i++;
    }

    return out.join("\n");
}

/**
 * Convert inline markdown (bold, em, code, escaped pipes) to HTML.
 * @param {string} text
 * @returns {string}
 */
function inlineHtml(text) {
    return escapeHtml(text)
        // After escaping, re-apply inline formatting using already-escaped chars
        // We need to work on the escaped version — replace safe patterns
        .replace(/\\\|/g, "|") // unescape pipe-within-cell
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`(.+?)`/g, "<code>$1</code>");
}
