import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLANS_DIR = path.join(__dirname, "..", "plans");

/**
 * Generate a self-contained HTML presentation from analysis results.
 */
export async function generatePresentation(analysisData) {
    await fs.mkdir(PLANS_DIR, { recursive: true });

    const {
        productIdea,
        enrichedContext,
        results,
        feedback,
    } = analysisData;

    const safeName = productIdea
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 40);

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${safeName}-${timestamp}.html`;
    const filepath = path.join(PLANS_DIR, filename);

    const html = buildHTML(productIdea, enrichedContext, results, feedback);
    await fs.writeFile(filepath, html, "utf-8");

    console.log(`📊 Presentation saved: ${filepath}`);
    return { filepath, filename };
}

function buildHTML(productIdea, context, results, feedback) {
    const sections = [];

    // Map robot keys to readable names
    const robotLabels = {
        scout: { title: "Market Analysis", icon: "🔍", subtitle: "Scout Robot" },
        detective: { title: "Competitive Landscape", icon: "🔎", subtitle: "Detective Robot" },
        people: { title: "User Personas", icon: "👥", subtitle: "People Robot" },
        money: { title: "Financial Projections", icon: "💰", subtitle: "Money Robot" },
        feature: { title: "Feature Breakdown", icon: "📝", subtitle: "Feature Robot" },
        plan: { title: "Product Roadmap", icon: "🗺️", subtitle: "Plan Robot" },
        priority: { title: "Feature Prioritization", icon: "⭐", subtitle: "Priority Robot" },
    };

    for (const [key, label] of Object.entries(robotLabels)) {
        if (!results[key]) continue;
        const data = { ...results[key] };
        delete data._improvementHints; // internal field
        delete data.productIdea;
        delete data.notes;

        const fb = feedback[key];
        const ratingHTML = fb
            ? `<div class="feedback-badge">User rating: ${"★".repeat(fb.rating)}${"☆".repeat(5 - fb.rating)}${fb.notes ? ` — "${fb.notes}"` : ""}</div>`
            : "";

        sections.push(`
        <section class="slide">
            <div class="slide-header">
                <span class="slide-icon">${label.icon}</span>
                <div>
                    <h2>${label.title}</h2>
                    <p class="subtitle">${label.subtitle}</p>
                </div>
            </div>
            ${ratingHTML}
            <pre class="analysis-data">${escapeHTML(JSON.stringify(data, null, 2))}</pre>
        </section>`);
    }

    const contextSummary = context?.summary || context?.productIdea || productIdea;
    const answersHTML = context?.answers
        ? Object.entries(context.answers)
              .map(([k, v]) => `<li><strong>${k.replace(/_/g, " ")}:</strong> ${escapeHTML(String(v))}</li>`)
              .join("\n")
        : "<li>No interview data</li>";

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Product Strategy: ${escapeHTML(productIdea)}</title>
    <style>
        :root {
            --bg: #0f1117;
            --surface: #1a1d27;
            --border: #2a2d3a;
            --text: #e4e6ed;
            --text-dim: #8b8fa3;
            --accent: #6c63ff;
            --accent-glow: rgba(108, 99, 255, 0.15);
            --success: #22c55e;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
        }
        .container { max-width: 900px; margin: 0 auto; padding: 2rem; }
        
        /* Title slide */
        .title-slide {
            text-align: center;
            padding: 4rem 2rem;
            border-bottom: 1px solid var(--border);
            margin-bottom: 2rem;
        }
        .title-slide h1 {
            font-size: 2.4rem;
            font-weight: 700;
            background: linear-gradient(135deg, #6c63ff, #a78bfa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 0.5rem;
        }
        .title-slide .tagline {
            font-size: 1.1rem;
            color: var(--text-dim);
        }
        .title-slide .date {
            margin-top: 1rem;
            font-size: 0.85rem;
            color: var(--text-dim);
        }

        /* Context section */
        .context-section {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1.5rem 2rem;
            margin-bottom: 2rem;
        }
        .context-section h3 {
            color: var(--accent);
            margin-bottom: 0.8rem;
            font-size: 1rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .context-section ul { list-style: none; }
        .context-section li {
            padding: 0.3rem 0;
            color: var(--text-dim);
            font-size: 0.9rem;
        }
        .context-section li strong { color: var(--text); }

        /* Slides */
        .slide {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 1.5rem;
            transition: border-color 0.2s;
        }
        .slide:hover { border-color: var(--accent); }
        .slide-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.2rem;
        }
        .slide-icon { font-size: 2rem; }
        .slide-header h2 {
            font-size: 1.3rem;
            font-weight: 600;
        }
        .subtitle {
            font-size: 0.8rem;
            color: var(--text-dim);
        }
        .feedback-badge {
            display: inline-block;
            background: var(--accent-glow);
            border: 1px solid var(--accent);
            border-radius: 6px;
            padding: 0.3rem 0.8rem;
            font-size: 0.8rem;
            color: var(--accent);
            margin-bottom: 1rem;
        }
        .analysis-data {
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.2rem;
            font-size: 0.82rem;
            font-family: 'JetBrains Mono', 'Fira Code', monospace;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-word;
            color: var(--text-dim);
            line-height: 1.5;
        }

        /* Next steps */
        .next-steps {
            background: var(--accent-glow);
            border: 1px solid var(--accent);
            border-radius: 12px;
            padding: 2rem;
            margin-top: 2rem;
        }
        .next-steps h2 {
            color: var(--accent);
            margin-bottom: 1rem;
        }
        .next-steps ol {
            padding-left: 1.2rem;
            color: var(--text);
        }
        .next-steps li { margin-bottom: 0.5rem; }

        .footer {
            text-align: center;
            padding: 2rem;
            color: var(--text-dim);
            font-size: 0.75rem;
        }

        @media print {
            .slide { break-inside: avoid; }
            body { background: #fff; color: #1a1a1a; }
            .analysis-data { background: #f5f5f5; color: #333; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="title-slide">
            <h1>🚀 ${escapeHTML(productIdea)}</h1>
            <p class="tagline">Product Strategy Analysis by ProductFlow</p>
            <p class="date">Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        <div class="context-section">
            <h3>📋 Analysis Context</h3>
            <p style="color:var(--text); margin-bottom:0.5rem;">${escapeHTML(contextSummary)}</p>
            <ul>${answersHTML}</ul>
        </div>

        ${sections.join("\n")}

        <div class="next-steps">
            <h2>📌 Recommended Next Steps</h2>
            <ol>
                <li>Validate market assumptions with 5-10 customer interviews</li>
                <li>Build MVP with Phase 1 features</li>
                <li>Establish success metrics and KPIs before launch</li>
                <li>Plan competitive differentiation strategy</li>
                <li>Set up analytics to track user behavior from day one</li>
            </ol>
        </div>

        <div class="footer">
            Generated by ProductFlow — Product Management Agent Orchestration Platform
        </div>
    </div>
</body>
</html>`;
}

function escapeHTML(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
