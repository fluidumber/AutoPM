// ContextStore — manages the `context/` folder inside each product directory.
// Stores PM-provided inputs that feed future analyses: URLs, notes, analyst
// reports, research documents, and normalised interview answers.
//
// Layout (products/<slug>/context/):
//   documents/           — raw file attachments (pdfs, docs)
//   interview-answers.md — normalised interview history
//   notes.md             — ad-hoc notes and URLs
//   index.json           — metadata index for quick listing

import fs from "fs/promises";
import path from "path";

const INDEX_FILE = "index.json";

/**
 * Allowed context entry types.
 */
export const CONTEXT_TYPES = ["note", "url", "document", "analyst-report"];

export class ContextStore {
    /**
     * @param {import('./workspace-manager.js').WorkspaceManager} workspace
     */
    constructor(workspace) {
        this.workspace = workspace;
    }

    _indexPath(slug) {
        return path.join(this.workspace.getContextDir(slug), INDEX_FILE);
    }

    async _loadIndex(slug) {
        try {
            const raw = await fs.readFile(this._indexPath(slug), "utf-8");
            return JSON.parse(raw);
        } catch {
            return { entries: [] };
        }
    }

    async _saveIndex(slug, index) {
        await this.workspace.ensureProductStructure(slug);
        await fs.writeFile(this._indexPath(slug), JSON.stringify(index, null, 2), "utf-8");
    }

    /**
     * Add a context entry for a product.
     * @param {string} slug
     * @param {object} entry
     * @param {"note"|"url"|"document"|"analyst-report"} entry.type
     * @param {string} entry.title - short human-readable label
     * @param {string} entry.content - the body (for notes/urls) or filename (for documents)
     * @param {string} [entry.source] - original URL or source reference
     * @returns {Promise<object>} the saved entry with id + timestamp
     */
    async add(slug, entry) {
        if (!CONTEXT_TYPES.includes(entry.type)) {
            throw new Error(`Unknown context type: ${entry.type}. Allowed: ${CONTEXT_TYPES.join(", ")}`);
        }
        if (!entry.title || !entry.content) {
            throw new Error("Context entry requires both 'title' and 'content'");
        }

        await this.workspace.ensureProductStructure(slug);

        const index = await this._loadIndex(slug);
        const id = `ctx-${Date.now()}-${index.entries.length + 1}`;
        const timestamp = new Date().toISOString();

        const saved = {
            id,
            type: entry.type,
            title: entry.title,
            source: entry.source || null,
            addedAt: timestamp,
        };

        // Route storage based on type
        if (entry.type === "note" || entry.type === "url") {
            await this._appendToNotesFile(slug, saved, entry.content);
        } else if (entry.type === "document" || entry.type === "analyst-report") {
            // Save the content as a file under documents/
            const safeName = sanitiseFilename(entry.title);
            const filename = `${timestamp.slice(0, 10)}-${safeName}.md`;
            const diskPath = path.join(this.workspace.getContextDir(slug), "documents", filename);
            await fs.writeFile(diskPath, entry.content, "utf-8");
            saved.filename = filename;
        }

        index.entries.push(saved);
        await this._saveIndex(slug, index);

        return saved;
    }

    /**
     * List context entries for a product. Optionally filter by type.
     */
    async list(slug, { type } = {}) {
        const index = await this._loadIndex(slug);
        if (type) {
            return index.entries.filter(e => e.type === type);
        }
        return index.entries;
    }

    /**
     * Retrieve the full content of a context entry (by id).
     * For notes/urls, returns the entry + its text. For documents,
     * returns the entry + the file body.
     */
    async get(slug, id) {
        const index = await this._loadIndex(slug);
        const entry = index.entries.find(e => e.id === id);
        if (!entry) return null;

        if (entry.type === "note" || entry.type === "url") {
            const content = await this._extractNoteContent(slug, id);
            return { ...entry, content };
        }

        if (entry.filename) {
            const diskPath = path.join(this.workspace.getContextDir(slug), "documents", entry.filename);
            try {
                const content = await fs.readFile(diskPath, "utf-8");
                return { ...entry, content };
            } catch {
                return { ...entry, content: null, error: "File not found on disk" };
            }
        }
        return entry;
    }

    /**
     * Persist the normalised interview answers for a product. This is called
     * by the interview flow when an interview completes or an answer is updated.
     * Writes to context/interview-answers.md in a structured, re-readable format.
     */
    async saveInterviewAnswers(slug, answers) {
        await this.workspace.ensureProductStructure(slug);
        const file = path.join(this.workspace.getContextDir(slug), "interview-answers.md");

        const lines = [
            "# Interview Answers",
            "",
            `_Last updated: ${new Date().toISOString()}_`,
            "",
        ];

        for (const [qid, value] of Object.entries(answers || {})) {
            lines.push(`## ${qid}`);
            lines.push("");
            lines.push(String(value ?? "").trim() || "_(no answer)_");
            lines.push("");
        }

        await fs.writeFile(file, lines.join("\n"), "utf-8");
    }

    /**
     * Read back the persisted interview answers (parsed from the markdown).
     * Returns an object keyed by question id.
     */
    async loadInterviewAnswers(slug) {
        const file = path.join(this.workspace.getContextDir(slug), "interview-answers.md");
        let raw;
        try {
            raw = await fs.readFile(file, "utf-8");
        } catch {
            return {};
        }
        if (!raw.trim()) return {};

        const answers = {};
        const sections = raw.split(/^##\s+/m).slice(1); // skip preamble
        for (const section of sections) {
            const firstNewline = section.indexOf("\n");
            const qid = section.slice(0, firstNewline).trim();
            const body = section.slice(firstNewline + 1).trim();
            if (qid) answers[qid] = body;
        }
        return answers;
    }

    // ── internals ──────────────────────────────────────────────────

    async _appendToNotesFile(slug, entry, content) {
        const file = path.join(this.workspace.getContextDir(slug), "notes.md");
        let existing = "";
        try {
            existing = await fs.readFile(file, "utf-8");
        } catch { /* first write */ }

        const header = `\n\n<!-- id: ${entry.id} -->\n## [${entry.type}] ${entry.title}\n_Added: ${entry.addedAt}_${entry.source ? `\n_Source: ${entry.source}_` : ""}\n\n`;
        await fs.writeFile(file, existing + header + content + "\n", "utf-8");
    }

    async _extractNoteContent(slug, id) {
        const file = path.join(this.workspace.getContextDir(slug), "notes.md");
        let raw;
        try {
            raw = await fs.readFile(file, "utf-8");
        } catch {
            return null;
        }
        // Find the block for this id
        const marker = `<!-- id: ${id} -->`;
        const startIdx = raw.indexOf(marker);
        if (startIdx === -1) return null;
        const afterMarker = raw.slice(startIdx + marker.length);
        // Next entry starts with another "<!-- id: " marker
        const nextIdx = afterMarker.indexOf("<!-- id: ");
        const block = nextIdx === -1 ? afterMarker : afterMarker.slice(0, nextIdx);
        // Strip the header (the ## line + metadata lines)
        const bodyStart = block.indexOf("\n\n");
        return bodyStart === -1 ? block.trim() : block.slice(bodyStart + 2).trim();
    }
}

function sanitiseFilename(s) {
    return String(s)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48) || "untitled";
}
