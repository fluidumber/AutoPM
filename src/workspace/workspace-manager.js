// WorkspaceManager — owns the on-disk layout for ~/.productflow/
//
// Layout:
//   ~/.productflow/
//     pm-profile.md
//     products/
//       <slug>/
//         product.md
//         freshness.json
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

    /** Path to the PM profile markdown file. */
    getPmProfilePath() {
        return path.join(this.root, "pm-profile.md");
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

    /**
     * Ensure the workspace root and top-level structure exist. Idempotent.
     */
    async ensureWorkspace() {
        await fs.mkdir(this.root, { recursive: true });
        await fs.mkdir(this.getProductsDir(), { recursive: true });
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

    /**
     * Does the PM profile file exist?
     */
    async hasPmProfile() {
        try {
            await fs.access(this.getPmProfilePath());
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
