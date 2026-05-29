// WorkspaceManager — owns the on-disk layout for ~/.productflow/
//
// Layout:
//   ~/.productflow/
//     profiles/
//       active.json              { "activePersona": "<slug>" }
//       <slug>/
//         profile.md
//         staleness-overrides.json   (optional)
//     products/
//       <slug>/
//         product.md
//         freshness.json
//         staleness-overrides.json   (optional)
//         context/
//           documents/
//           interview-answers.md
//           notes.md
//         assets/

import fs from "fs/promises";
import path from "path";
import os from "os";

const DEFAULT_WORKSPACE = path.join(os.homedir(), ".productflow");

export class WorkspaceManager {
    /**
     * @param {string} [root] - Override the workspace root (useful for tests).
     *                          Defaults to $PRODUCTFLOW_HOME or ~/.productflow
     */
    constructor(root) {
        this.root = root || process.env.PRODUCTFLOW_HOME || DEFAULT_WORKSPACE;
    }

    /** Absolute path to the workspace root. */
    getRoot() {
        return this.root;
    }

    // ── Persona path helpers ───────────────────────────────────────────

    /** Path to the profiles container directory. */
    getProfilesDir() {
        return path.join(this.root, "profiles");
    }

    /** Path to the active-persona pointer file. */
    getActivePersonaFile() {
        return path.join(this.getProfilesDir(), "active.json");
    }

    /** Path to a specific persona's directory. */
    getPersonaDir(personaSlug) {
        return path.join(this.getProfilesDir(), personaSlug);
    }

    /** Path to a specific persona's profile.md. */
    getPersonaProfilePath(personaSlug) {
        return path.join(this.getPersonaDir(personaSlug), "profile.md");
    }

    /**
     * Legacy path — only used during migration from single-profile layout.
     * Kept so any remaining caller can be updated in one pass.
     * @deprecated use getPersonaProfilePath(activeSlug) instead
     */
    getLegacyPmProfilePath() {
        return path.join(this.root, "pm-profile.md");
    }

    /** @deprecated alias for getLegacyPmProfilePath() — remove after pm-profile.js is updated */
    getPmProfilePath() {
        return this.getLegacyPmProfilePath();
    }

    /** Path to the products container directory. */
    getProductsDir() {
        return path.join(this.root, "products");
    }

    /** Path to a specific product's root directory (by slug). */
    getProductDir(slug) {
        return path.join(this.getProductsDir(), slug);
    }

    /** Path to a product's product.md. */
    getProductMarkdownPath(slug) {
        return path.join(this.getProductDir(slug), "product.md");
    }

    /** Path to a product's freshness.json. */
    getFreshnessPath(slug) {
        return path.join(this.getProductDir(slug), "freshness.json");
    }

    /** Path to a product's context directory. */
    getContextDir(slug) {
        return path.join(this.getProductDir(slug), "context");
    }

    /** Path to a product's assets directory. */
    getAssetsDir(slug) {
        return path.join(this.getProductDir(slug), "assets");
    }

    /** Path to an epic/feature specific assets directory. */
    getEpicFeatureDir(slug, epicId, featureId) {
        let base = path.join(this.getAssetsDir(slug), "epics", epicId);
        if (featureId) {
            base = path.join(base, "features", featureId);
        }
        return base;
    }

    /**
     * Ensure the workspace root and top-level structure exist. Idempotent.
     */
    async ensureWorkspace() {
        await fs.mkdir(this.root, { recursive: true });
        await fs.mkdir(this.getProductsDir(), { recursive: true });
        await fs.mkdir(this.getProfilesDir(), { recursive: true });
    }

    /**
     * Scaffold the folder structure for a new product. Idempotent —
     * will not overwrite existing files.
     */
    async ensureProductStructure(slug) {
        const productDir = this.getProductDir(slug);
        await fs.mkdir(productDir, { recursive: true });
        await fs.mkdir(path.join(productDir, "context", "documents"), { recursive: true });
        await fs.mkdir(this.getAssetsDir(slug), { recursive: true });

        // Create empty context files if they don't exist
        const interviewAnswersPath = path.join(productDir, "context", "interview-answers.md");
        const notesPath = path.join(productDir, "context", "notes.md");

        for (const p of [interviewAnswersPath, notesPath]) {
            try {
                await fs.access(p);
            } catch {
                await fs.writeFile(p, "", "utf-8");
            }
        }

        // Scaffold freshness.json if missing
        const freshnessPath = this.getFreshnessPath(slug);
        try {
            await fs.access(freshnessPath);
        } catch {
            await fs.writeFile(
                freshnessPath,
                JSON.stringify({ robots: {}, interviewAnswers: {} }, null, 2),
                "utf-8"
            );
        }
    }

    // ── Phase 2 path helpers ───────────────────────────────────────────

    /**
     * Path to the Phase 2 context manifest for a product.
     * Scaffolded by promote-to-phase-2; consumed by all Phase 2 robots.
     */
    getPhase2ContextPath(slug) {
        return path.join(this.getContextDir(slug), "phase2-context.json");
    }

    /**
     * Path to the DACI manifest for a product.
     * Written by the daci-stakeholders robot; referenced by the PDD composer.
     */
    getDACIPath(slug) {
        return path.join(this.getContextDir(slug), "daci.json");
    }

    /**
     * Path to the PDD output directory for a product.
     * All PDD exports (markdown + HTML) are stored here.
     */
    getPDDDir(slug) {
        return path.join(this.getAssetsDir(slug), "pdd");
    }

    /**
     * Path to the pending-promotion.json file for a product.
     * Written by promote-to-phase-2 Call 1 (review); deleted by Call 2 (confirm).
     * Contains the confirmation token, expiry, and Phase 1 summary candidates.
     */
    getPendingPromotionPath(slug) {
        return path.join(this.getProductDir(slug), "pending-promotion.json");
    }

    /**
     * Path to the active-session pointer file.
     * Written by start-session; records which product the PM is working on and
     * what gate they reached last.  Read by run-robot for soft session hints.
     */
    getActiveSessionPath() {
        return path.join(this.root, "active-session.json");
    }

    // ── Staleness override path helpers ───────────────────────────────

    /**
     * Path to staleness overrides for a specific persona.
     * Persona overrides take precedence over project defaults.
     * Populated during Track 2 (multi-persona model).
     */
    getPersonaStalenessOverridePath(personaSlug) {
        return path.join(this.root, "profiles", personaSlug, "staleness-overrides.json");
    }

    /**
     * Path to staleness overrides for a specific product.
     * Product overrides take precedence over persona overrides.
     */
    getProductStalenessOverridePath(productSlug) {
        return path.join(this.getProductDir(productSlug), "staleness-overrides.json");
    }

    /**
     * Does any PM profile exist?
     * Checks the multi-persona layout first; falls back to the legacy single-file
     * layout so existing workspaces work before migration runs.
     */
    async hasPmProfile() {
        // New layout: active.json + persona profile
        try {
            const raw          = await fs.readFile(this.getActivePersonaFile(), "utf-8");
            const { activePersona } = JSON.parse(raw);
            if (activePersona) {
                await fs.access(this.getPersonaProfilePath(activePersona));
                return true;
            }
        } catch { /* fall through */ }

        // Legacy fallback: single pm-profile.md
        try {
            await fs.access(this.getLegacyPmProfilePath());
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Does a given product exist on disk?
     */
    async hasProduct(slug) {
        try {
            await fs.access(this.getProductMarkdownPath(slug));
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Convert a human-readable product name into a filesystem-safe slug.
 *   "XpertIN AI" -> "xpertin-ai"
 *   "My Product v2.0" -> "my-product-v2-0"
 */
export function slugify(name) {
    return String(name)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 64);
}
