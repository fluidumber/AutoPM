// ProductRegistry — manages per-product directories and product.md files.

import fs from "fs/promises";
import path from "path";
import {
    parseMarkdownDoc,
    serialiseMarkdownDoc,
    getSection,
    getListSection,
} from "./markdown-doc.js";
import { slugify } from "./workspace-manager.js";

export class ProductRegistry {
    /**
     * @param {import('./workspace-manager.js').WorkspaceManager} workspace
     * @param {import('./pm-profile.js').PMProfile} pmProfile
     */
    constructor(workspace, pmProfile) {
        this.workspace = workspace;
        this.pmProfile = pmProfile;
    }

    /**
     * List all products that have been scaffolded on disk.
     * Returns a lightweight summary per product.
     */
    async list() {
        await this.workspace.ensureWorkspace();
        const dir = this.workspace.getProductsDir();

        let entries = [];
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return [];
        }

        const results = [];
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const product = await this.get(entry.name);
            if (product) results.push(product);
        }
        return results;
    }

    /**
     * Load a single product's metadata. Returns null if missing.
     */
    async get(slug) {
        if (!(await this.workspace.hasProduct(slug))) return null;

        const raw = await fs.readFile(
            this.workspace.getProductMarkdownPath(slug),
            "utf-8"
        );
        const { frontmatter, body } = parseMarkdownDoc(raw);

        const h1 = body.match(/^#\s+Product:\s*(.+)$/m);
        const name = h1 ? h1[1].trim() : slug;

        return {
            slug,
            name,
            overview: getSection(body, "Overview"),
            stage: getSection(body, "Stage"),
            targetMarket: getSection(body, "Target Market"),
            competitors: getListSection(body, "Competitors"),
            tags: getListSection(body, "Tags"),
            created: frontmatter.created || null,
            updated: frontmatter.updated || null,
        };
    }

    /**
     * Create a new product. Scaffolds the directory structure, writes
     * product.md, and adds the slug to the PM profile's Products Owned.
     *
     * @param {object} data
     * @param {string} data.name - Human-readable product name (required)
     * @param {string} [data.overview]
     * @param {string} [data.stage]
     * @param {string} [data.targetMarket]
     * @param {string[]} [data.competitors]
     * @param {string[]} [data.tags]
     * @returns {Promise<{slug: string, alreadyExisted: boolean, product: object}>}
     */
    async create(data) {
        if (!data?.name) {
            throw new Error("Product name is required");
        }

        const slug = slugify(data.name);
        const alreadyExisted = await this.workspace.hasProduct(slug);

        await this.workspace.ensureProductStructure(slug);

        if (!alreadyExisted) {
            await this._writeProductMarkdown(slug, {
                name: data.name,
                overview: data.overview || "",
                stage: data.stage || "",
                targetMarket: data.targetMarket || "",
                competitors: data.competitors || [],
                tags: data.tags || [],
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
            });
        }

        // Register the product on the PM profile (idempotent)
        if (await this.workspace.hasPmProfile()) {
            await this.pmProfile.addProduct(slug);
        }

        const product = await this.get(slug);
        return { slug, alreadyExisted, product };
    }

    /**
     * Update fields on an existing product. Only provided fields are changed.
     */
    async update(slug, patch) {
        const existing = await this.get(slug);
        if (!existing) throw new Error(`Product not found: ${slug}`);

        const merged = {
            name: patch.name ?? existing.name,
            overview: patch.overview ?? existing.overview ?? "",
            stage: patch.stage ?? existing.stage ?? "",
            targetMarket: patch.targetMarket ?? existing.targetMarket ?? "",
            competitors: patch.competitors ?? existing.competitors ?? [],
            tags: patch.tags ?? existing.tags ?? [],
            created: existing.created,
            updated: new Date().toISOString(),
        };

        await this._writeProductMarkdown(slug, merged);
        return this.get(slug);
    }

    // ── internals ──────────────────────────────────────────────────

    async _writeProductMarkdown(slug, data) {
        const frontmatter = {
            slug,
            created: data.created,
            updated: data.updated,
        };
        const body = this._buildBody(data);
        await fs.writeFile(
            this.workspace.getProductMarkdownPath(slug),
            serialiseMarkdownDoc(frontmatter, body),
            "utf-8"
        );
    }

    _buildBody(data) {
        const competitorsList = data.competitors.length
            ? data.competitors.map(c => `- ${c}`).join("\n")
            : "_(none listed yet)_";
        const tagsList = data.tags.length
            ? data.tags.map(t => `- ${t}`).join("\n")
            : "_(none)_";

        return `# Product: ${data.name}

## Overview
${data.overview || "_(not set)_"}

## Stage
${data.stage || "_(not set)_"}

## Target Market
${data.targetMarket || "_(not set)_"}

## Competitors
${competitorsList}

## Tags
${tagsList}
`;
    }
}
