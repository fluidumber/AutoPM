// PMProfile — manages PM persona profiles under ~/.productflow/profiles/
//
// Layout:
//   profiles/
//     active.json          { "activePersona": "<slug>" }
//     <slug>/
//       profile.md         YAML frontmatter + structured markdown body
//       staleness-overrides.json   (optional, Track 2 staleness layer)
//
// Migration: if a legacy pm-profile.md exists at the workspace root and no
// profiles/ directory exists yet, it is automatically migrated to
// profiles/default/profile.md on the first load() or save() call.

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

    // ── Active persona resolution ────────────────────────────────────

    /** Read active.json and return the active persona slug, or null. */
    async _getActivePersonaSlug() {
        try {
            const raw           = await fs.readFile(this.workspace.getActivePersonaFile(), "utf-8");
            const { activePersona } = JSON.parse(raw);
            return activePersona || null;
        } catch {
            return null;
        }
    }

    /** Write active.json with a new slug. Creates profiles/ dir if needed. */
    async _setActivePersona(slug) {
        await fs.mkdir(this.workspace.getProfilesDir(), { recursive: true });
        await fs.writeFile(
            this.workspace.getActivePersonaFile(),
            JSON.stringify({ activePersona: slug }, null, 2),
            "utf-8"
        );
    }

    // ── Migration from legacy single-file layout ─────────────────────

    /**
     * If a legacy pm-profile.md exists and no active.json exists yet, copy
     * the legacy file into profiles/default/profile.md and set it as active.
     * Idempotent — silently skips if migration already happened.
     */
    async _migrateLegacyIfNeeded() {
        // Skip if already on new layout
        if (await this._getActivePersonaSlug()) return;

        const legacyPath = this.workspace.getLegacyPmProfilePath();
        try {
            const raw = await fs.readFile(legacyPath, "utf-8");
            // Legacy file exists — migrate to profiles/default/
            const personaDir = this.workspace.getPersonaDir("default");
            await fs.mkdir(personaDir, { recursive: true });
            await fs.writeFile(this.workspace.getPersonaProfilePath("default"), raw, "utf-8");
            await this._setActivePersona("default");
        } catch {
            // No legacy file — fresh workspace, nothing to migrate
        }
    }

    // ── Internal read helper ─────────────────────────────────────────

    async _readPersonaProfile(slug) {
        try {
            const raw            = await fs.readFile(this.workspace.getPersonaProfilePath(slug), "utf-8");
            const { frontmatter, body } = parseMarkdownDoc(raw);
            const h1             = body.match(/^#\s+PM\s*Profile:\s*(.+)$/m);
            return {
                name:               h1 ? h1[1].trim() : null,
                role:               getSection(body, "Role"),
                industryFocus:      getSection(body, "Industry Focus"),
                preferredFrameworks: getSection(body, "Preferred Frameworks"),
                analysisDepth:      getSection(body, "Analysis Depth"),
                productsOwned:      getListSection(body, "Products Owned"),
                updated:            frontmatter.updated || null,
                version:            frontmatter.version || 1,
            };
        } catch {
            return null;
        }
    }

    // ── Public API ───────────────────────────────────────────────────

    /**
     * Load the active persona's profile. Returns null if no profile exists.
     * Triggers legacy migration on first call.
     * @returns {Promise<object|null>}
     */
    async load() {
        await this._migrateLegacyIfNeeded();
        const slug = await this._getActivePersonaSlug();
        if (!slug) return null;

        const data = await this._readPersonaProfile(slug);
        if (!data) return null;

        return { ...data, personaSlug: slug };
    }

    /**
     * Save the active persona's profile. Creates the persona + sets it active
     * if none exists yet (auto-creates "default" on first run).
     * Merges with existing profile — unspecified fields are preserved.
     *
     * @param {object} data - Fields to set (all optional)
     * @param {{ personaSlug?: string }} [opts] - Override which persona to save
     */
    async save(data, { personaSlug = null } = {}) {
        await this.workspace.ensureWorkspace();
        await this._migrateLegacyIfNeeded();

        // Determine target persona
        let slug = personaSlug || await this._getActivePersonaSlug();
        if (!slug) {
            slug = "default";
        }

        // Ensure the persona directory exists and is marked active
        await fs.mkdir(this.workspace.getPersonaDir(slug), { recursive: true });
        await this._setActivePersona(slug);

        // Merge with existing (if any)
        const existing = (await this._readPersonaProfile(slug)) || {};
        const merged = {
            name:               data.name               ?? existing.name               ?? "Unknown",
            role:               data.role               ?? existing.role               ?? "",
            industryFocus:      data.industryFocus      ?? existing.industryFocus      ?? "",
            preferredFrameworks: data.preferredFrameworks ?? existing.preferredFrameworks ?? "",
            analysisDepth:      data.analysisDepth      ?? existing.analysisDepth      ?? "",
            productsOwned:      data.productsOwned      ?? existing.productsOwned      ?? [],
        };

        const frontmatter = {
            updated: new Date().toISOString(),
            version: (existing.version || 0) + 1,
        };

        await fs.writeFile(
            this.workspace.getPersonaProfilePath(slug),
            serialiseMarkdownDoc(frontmatter, this._buildBody(merged)),
            "utf-8"
        );

        return { ...merged, personaSlug: slug, updated: frontmatter.updated, version: frontmatter.version };
    }

    /**
     * List all personas in the profiles/ directory.
     * @returns {Promise<Array<{slug, name, role, industryFocus, updated, isActive}>>}
     */
    async listPersonas() {
        await this._migrateLegacyIfNeeded();
        const profilesDir = this.workspace.getProfilesDir();
        let entries = [];
        try {
            entries = await fs.readdir(profilesDir, { withFileTypes: true });
        } catch {
            return [];
        }

        const activeSlug = await this._getActivePersonaSlug();
        const personas   = [];

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const slug = entry.name;
            const data = await this._readPersonaProfile(slug);
            personas.push({
                slug,
                name:          data?.name          || slug,
                role:          data?.role          || null,
                industryFocus: data?.industryFocus || null,
                updated:       data?.updated       || null,
                isActive:      slug === activeSlug,
            });
        }
        return personas;
    }

    /**
     * Create a new persona with optional initial profile data.
     * Does NOT switch the active persona — call switchPersona() separately.
     *
     * @param {string} slug
     * @param {object} [data]
     */
    async createPersona(slug, data = {}) {
        const personaDir = this.workspace.getPersonaDir(slug);
        const profilePath = this.workspace.getPersonaProfilePath(slug);

        // Check if already exists
        let alreadyExisted = false;
        try {
            await fs.access(profilePath);
            alreadyExisted = true;
        } catch { /* new persona */ }

        await fs.mkdir(personaDir, { recursive: true });

        if (!alreadyExisted) {
            const merged = {
                name:               data.name               || slug,
                role:               data.role               || "",
                industryFocus:      data.industryFocus      || "",
                preferredFrameworks: data.preferredFrameworks || "",
                analysisDepth:      data.analysisDepth      || "",
                productsOwned:      data.productsOwned      || [],
            };
            await fs.writeFile(
                profilePath,
                serialiseMarkdownDoc({ updated: new Date().toISOString(), version: 1 }, this._buildBody(merged)),
                "utf-8"
            );
        }

        return { slug, alreadyExisted };
    }

    /**
     * Switch the active persona. The persona must already exist.
     * Returns the new persona's profile.
     *
     * @param {string} slug
     */
    async switchPersona(slug) {
        const profilePath = this.workspace.getPersonaProfilePath(slug);
        try {
            await fs.access(profilePath);
        } catch {
            throw new Error(`Persona not found: ${slug}. Call pm-persona-create first.`);
        }
        await this._setActivePersona(slug);
        return this.load();
    }

    /**
     * Add a product slug to the active persona's "Products Owned" list. Idempotent.
     */
    async addProduct(slug) {
        const existing = (await this.load()) || { productsOwned: [] };
        if (existing.productsOwned.includes(slug)) return existing;
        existing.productsOwned.push(slug);
        return this.save({ productsOwned: existing.productsOwned });
    }

    /**
     * Remove a product slug from the active persona's list. Idempotent.
     */
    async removeProduct(slug) {
        const existing = await this.load();
        if (!existing) return null;
        const next = existing.productsOwned.filter(p => p !== slug);
        return this.save({ productsOwned: next });
    }

    // ── Internal ─────────────────────────────────────────────────────

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
