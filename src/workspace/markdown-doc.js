// Minimal markdown-with-YAML-frontmatter parser.
// We deliberately avoid a dependency — frontmatter is always simple key:value
// pairs in this codebase, and markdown bodies are preserved as raw text.

/**
 * Parse a markdown document with optional YAML frontmatter.
 * @param {string} source - File contents
 * @returns {{ frontmatter: Record<string, any>, body: string }}
 */
export function parseMarkdownDoc(source) {
    const frontmatterMatch = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

    if (!frontmatterMatch) {
        return { frontmatter: {}, body: source };
    }

    const [, rawFrontmatter, body] = frontmatterMatch;
    const frontmatter = parseSimpleYaml(rawFrontmatter);
    return { frontmatter, body: body.trimStart() };
}

/**
 * Serialise a document back to markdown with YAML frontmatter.
 * @param {Record<string, any>} frontmatter
 * @param {string} body
 * @returns {string}
 */
export function serialiseMarkdownDoc(frontmatter, body) {
    const fmLines = Object.entries(frontmatter)
        .map(([k, v]) => `${k}: ${formatYamlValue(v)}`)
        .join("\n");

    return `---\n${fmLines}\n---\n\n${body.trimStart()}`;
}

/**
 * Extract a section body from a markdown document by H2 heading.
 * e.g. getSection(body, "Role") returns the text under "## Role"
 * up to the next H2 or end of document. Returns null if not found.
 */
export function getSection(body, heading) {
    const lines = body.split(/\r?\n/);
    const headingRe = new RegExp(`^##\\s+${escapeRegex(heading)}\\s*$`);
    const nextH2Re = /^##\s+\S/;

    let startIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (headingRe.test(lines[i])) {
            startIdx = i + 1;
            break;
        }
    }
    if (startIdx === -1) return null;

    let endIdx = lines.length;
    for (let i = startIdx; i < lines.length; i++) {
        if (nextH2Re.test(lines[i])) {
            endIdx = i;
            break;
        }
    }

    return lines.slice(startIdx, endIdx).join("\n").trim();
}

/**
 * Extract a bullet list under an H2 heading — returns an array of strings
 * with the leading "- " stripped. Returns [] if the section is missing.
 */
export function getListSection(body, heading) {
    const section = getSection(body, heading);
    if (!section) return [];
    return section
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.startsWith("- "))
        .map(l => l.slice(2).trim())
        .filter(Boolean);
}

// ── internals ──────────────────────────────────────────────────────

function parseSimpleYaml(raw) {
    const result = {};
    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const colonIdx = trimmed.indexOf(":");
        if (colonIdx === -1) continue;
        const key = trimmed.slice(0, colonIdx).trim();
        const rawValue = trimmed.slice(colonIdx + 1).trim();
        result[key] = coerceYamlScalar(rawValue);
    }
    return result;
}

function coerceYamlScalar(v) {
    if (v === "true") return true;
    if (v === "false") return false;
    if (v === "null" || v === "") return null;
    if (/^-?\d+$/.test(v)) return parseInt(v, 10);
    if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
    // Strip surrounding quotes if present
    return v.replace(/^["'](.*)["']$/, "$1");
}

function formatYamlValue(v) {
    if (v === null || v === undefined) return "null";
    if (typeof v === "boolean" || typeof v === "number") return String(v);
    const s = String(v);
    // Quote if it contains a colon or starts with special chars
    return /[:#&*!|>'"%@`]/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;
}

function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
