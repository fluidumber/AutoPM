// Phase 1 smoke tests for the workspace layer.
// Run with: node tests/workspace.test.js

import assert from "assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { WorkspaceManager, slugify } from "../src/workspace/workspace-manager.js";
import { PMProfile } from "../src/workspace/pm-profile.js";
import { ProductRegistry } from "../src/workspace/product-registry.js";
import {
    parseMarkdownDoc,
    serialiseMarkdownDoc,
    getSection,
    getListSection,
} from "../src/workspace/markdown-doc.js";

let failures = 0;
let passes = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log(`  ✅ ${name}`);
        passes++;
    } catch (err) {
        console.error(`  ❌ ${name}\n     ${err.message}`);
        failures++;
    }
}

// ── Setup: isolated workspace in a temp directory ──────────────────
const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "productflow-test-"));
const workspace = new WorkspaceManager(tmpRoot);
const profile = new PMProfile(workspace);
const registry = new ProductRegistry(workspace, profile);

console.log("\n🧪 Phase 1 workspace tests");
console.log(`   temp root: ${tmpRoot}\n`);

// ── slugify ───────────────────────────────────────────────────────
console.log("slugify:");
await test("lowercases and hyphenates", () => {
    assert.equal(slugify("XpertIN AI"), "xpertin-ai");
});
await test("strips special characters", () => {
    assert.equal(slugify("My Product v2.0!"), "my-product-v2-0");
});
await test("trims leading/trailing dashes", () => {
    assert.equal(slugify("  Hello World  "), "hello-world");
});

// ── markdown-doc ──────────────────────────────────────────────────
console.log("\nmarkdown-doc:");
await test("parses frontmatter + body", () => {
    const src = "---\nupdated: 2026-01-01\nversion: 2\n---\n\n# Hello\n\n## Role\nPM\n";
    const parsed = parseMarkdownDoc(src);
    assert.equal(parsed.frontmatter.updated, "2026-01-01");
    assert.equal(parsed.frontmatter.version, 2);
    assert.ok(parsed.body.includes("# Hello"));
});
await test("handles missing frontmatter", () => {
    const parsed = parseMarkdownDoc("# Just a heading\n");
    assert.deepEqual(parsed.frontmatter, {});
    assert.ok(parsed.body.includes("# Just a heading"));
});
await test("serialises round-trip", () => {
    const out = serialiseMarkdownDoc({ a: 1, b: "two" }, "# Title");
    assert.ok(out.startsWith("---\n"));
    assert.ok(out.includes("a: 1"));
    assert.ok(out.includes("# Title"));
});
await test("getSection extracts named H2", () => {
    const body = "# Top\n\n## Role\nPM Leader\n\n## Focus\nCXM\n";
    assert.equal(getSection(body, "Role"), "PM Leader");
    assert.equal(getSection(body, "Focus"), "CXM");
});
await test("getListSection extracts bullets", () => {
    const body = "## Owned\n- alpha\n- beta\n- gamma\n";
    assert.deepEqual(getListSection(body, "Owned"), ["alpha", "beta", "gamma"]);
});

// ── WorkspaceManager ──────────────────────────────────────────────
console.log("\nWorkspaceManager:");
await test("ensureWorkspace creates root + products dir", async () => {
    await workspace.ensureWorkspace();
    const stat = await fs.stat(workspace.getProductsDir());
    assert.ok(stat.isDirectory());
});
await test("hasPmProfile is false before write", async () => {
    assert.equal(await workspace.hasPmProfile(), false);
});
await test("ensureProductStructure scaffolds all subdirs", async () => {
    await workspace.ensureProductStructure("demo-product");
    const productDir = workspace.getProductDir("demo-product");
    assert.ok((await fs.stat(path.join(productDir, "context", "documents"))).isDirectory());
    assert.ok((await fs.stat(workspace.getAssetsDir("demo-product"))).isDirectory());
    assert.ok((await fs.stat(workspace.getFreshnessPath("demo-product"))).isFile());
});

// ── PMProfile ─────────────────────────────────────────────────────
console.log("\nPMProfile:");
await test("load returns null when profile missing", async () => {
    assert.equal(await profile.load(), null);
});
await test("save creates profile file", async () => {
    const saved = await profile.save({
        name: "Anand",
        role: "Senior Product Leader",
        industryFocus: "CCaaS, CPaaS",
        preferredFrameworks: "JTBD, RICE",
        analysisDepth: "Deep",
    });
    assert.equal(saved.name, "Anand");
    assert.ok(saved.version >= 1);
    assert.ok(await workspace.hasPmProfile());
});
await test("load reads back saved fields", async () => {
    const loaded = await profile.load();
    assert.equal(loaded.name, "Anand");
    assert.equal(loaded.role, "Senior Product Leader");
    assert.equal(loaded.industryFocus, "CCaaS, CPaaS");
});
await test("save merges — preserves unspecified fields", async () => {
    await profile.save({ analysisDepth: "Summary-first" });
    const loaded = await profile.load();
    assert.equal(loaded.name, "Anand");                  // preserved
    assert.equal(loaded.analysisDepth, "Summary-first"); // updated
});
await test("addProduct is idempotent", async () => {
    await profile.addProduct("xpertin-ai");
    await profile.addProduct("xpertin-ai");
    const loaded = await profile.load();
    assert.deepEqual(loaded.productsOwned, ["xpertin-ai"]);
});

// ── ProductRegistry ───────────────────────────────────────────────
console.log("\nProductRegistry:");
await test("create scaffolds product + updates PM profile", async () => {
    const result = await registry.create({
        name: "XpertIN AI",
        overview: "AI career counselling",
        stage: "pre-seed",
        targetMarket: "India B2C + B2B2C",
        competitors: ["iDreamCareer", "Mindler"],
        tags: ["edtech", "b2c"],
    });
    assert.equal(result.slug, "xpertin-ai");
    assert.equal(result.alreadyExisted, false);
    assert.equal(result.product.name, "XpertIN AI");
    assert.deepEqual(result.product.competitors, ["iDreamCareer", "Mindler"]);

    const pm = await profile.load();
    assert.ok(pm.productsOwned.includes("xpertin-ai"));
});
await test("create is idempotent for existing slug", async () => {
    const result = await registry.create({ name: "XpertIN AI" });
    assert.equal(result.alreadyExisted, true);
    // Existing data preserved (competitors not wiped)
    assert.deepEqual(result.product.competitors, ["iDreamCareer", "Mindler"]);
});
await test("list returns all products", async () => {
    await registry.create({ name: "Second Product" });
    const all = await registry.list();
    // demo-product was only scaffolded (no product.md) so list() excludes it.
    // xpertin-ai + second-product are the two that have product.md files.
    assert.equal(all.length, 2);
    const slugs = all.map(p => p.slug).sort();
    assert.ok(slugs.includes("xpertin-ai"));
    assert.ok(slugs.includes("second-product"));
});
await test("get returns null for missing product", async () => {
    assert.equal(await registry.get("does-not-exist"), null);
});
await test("update merges fields", async () => {
    const updated = await registry.update("xpertin-ai", { stage: "seed" });
    assert.equal(updated.stage, "seed");
    assert.equal(updated.name, "XpertIN AI"); // preserved
});

// ── Cleanup ───────────────────────────────────────────────────────
await fs.rm(tmpRoot, { recursive: true, force: true });

console.log(`\n${failures === 0 ? "✅" : "❌"} ${passes} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
