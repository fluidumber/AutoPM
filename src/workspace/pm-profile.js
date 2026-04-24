// PMProfile — read/write the PM's identity file (pm-profile.md).
//
// The profile is markdown with YAML frontmatter. Sections are:
//   ## Role              (single line)
//   ## Industry Focus    (comma-separated or single line)
//   ## Preferred Frameworks  (comma-separated)
//   ## Analysis Depth    (single line)
//   ## Products Owned    (bullet list of slugs)

import fs from "fs/promises";
import {
    parseMarkdownDoc,
    serialiseMarkdownDoc,
    getSection,
    getListSection,
} from "./markdown-doc.js";

export class PMProfile {
    /**
     * @param {import('./workspace-manager.js').WorkspaceManager} workspace
     */
    constructor(workspace) {
        this.workspace = workspace;
    }

    /**
     * Load the PM profile. Returns null if no profile exists yet.
     * @returns {Promise<object|null>}
     */
    async load() {
        if (!(await this.workspace.hasPmProfile())) return null;

        const raw = await fs.readFile(this.workspace.getPmProfilePath(), "utf-8");
        const { frontmatter, body } = parseMarkdownDoc(raw);

        // Extract the PM name from the H1 heading, if present
        const h1 = body.match(/^#\s+PM\s*Profile:\s*(.+)$/m);
        const name = h1 ? h1[1].trim() : null;

        return {
            name,
            role: getSection(body, "Role"),
            industryFocus: getSection(body, "Industry Focus"),
            preferredFrameworks: getSection(body, "Preferred Frameworks"),
            analysisDepth: getSection(body, "Analysis Depth"),
            productsOwned: getListSection(body, "Products Owned"),
            updated: frontmatter.updated || null,
            version: frontmatter.version || 1,
            rawBody: body,
        };
    }

    /**
     * Save the PM profile to disk. Creates the file if missing.
     * Merges with existing profile — unspecified fields are preserved.
     * @param {object} data
     */
    async save(data) {
        await this.workspace.ensureWorkspace();

        const existing = (await this.load()) || {};
        const merged = {
            name: data.name ?? existing.name ?? "Unknown",
            role: data.role ?? existing.role ?? "",
            industryFocus: data.industryFocus ?? existing.industryFocus ?? "",
            preferredFrameworks:
                data.preferredFrameworks ?? existing.preferredFrameworks ?? "",
            analysisDepth: data.analysisDepth ?? existing.analysisDepth ?? "",
            productsOwned: data.productsOwned ?? existing.productsOwned ?? [],
        };

        const frontmatter = {
            updated: new Date().toISOString(),
            version: (existing.version || 0) + 1,
        };

        const body = this._buildBody(merged);
        const serialised = serialiseMarkdownDoc(frontmatter, body);

        await fs.writeFile(
            this.workspace.getPmProfilePath(),
            serialised,
            "utf-8"
        );

        return { ...merged, updated: frontmatter.updated, version: frontmatter.version };
    }

    /**
     * Add a product slug to the PM's "Products Owned" list. Idempotent.
     */
    async addProduct(slug) {
        const existing = (await this.load()) || { productsOwned: [] };
        if (existing.productsOwned.includes(slug)) return existing;
        existing.productsOwned.push(slug);
        return this.save({ productsOwned: existing.productsOwned });
    }

    /**
     * Remove a product slug from the PM's list. Idempotent.
     */
    async removeProduct(slug) {
        const existing = await this.load();
        if (!existing) return null;
        const next = existing.productsOwned.filter(p => p !== slug);
        return this.save({ productsOwned: next });
    }

    // ── internal ────────────────────────────────────────────────────

    _buildBody(data) {
        const productsList = data.productsOwned.length
            ? data.productsOwned.map(p => `- ${p}`).join("\n")
            : "_(none yet)_";

        return `# PM Profile: ${data.name}

## Role
${data.role || "_(not set)_"}

## Industry Focus
${data.industryFocus || "_(not set)_"}

## Preferred Frameworks
${data.preferredFrameworks || "_(not set)_"}

## Analysis Depth
${data.analysisDepth || "_(not set)_"}

## Products Owned
${productsList}
`;
    }
}
