// Phase 2-4 persistence layer tests — FreshnessTracker, ContextStore, AssetStore.
// Run with: node tests/persistence.test.js

import assert from "assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";

import { WorkspaceManager } from "../src/workspace/workspace-manager.js";
import {
    FreshnessTracker,
    ROBOT_STALENESS_DAYS,
    INTERVIEW_STALENESS_DAYS,
} from "../src/workspace/freshness-tracker.js";
import { ContextStore, CONTEXT_TYPES } from "../src/workspace/context-store.js";
import { AssetStore } from "../src/workspace/asset-store.js";

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
const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "productflow-persistence-test-"));
const workspace = new WorkspaceManager(tmpRoot);
const freshness = new FreshnessTracker(workspace);
const contextStore = new ContextStore(workspace);
const assetStore = new AssetStore(workspace);

await workspace.ensureWorkspace();
await workspace.ensureProductStructure("demo");

console.log("\n🧪 Phase 2-4 persistence tests");
console.log(`   temp root: ${tmpRoot}\n`);

// ── FreshnessTracker ──────────────────────────────────────────────
console.log("FreshnessTracker:");

await test("exports sane staleness defaults", () => {
    for (const robot of ["scout", "detective", "people", "money", "feature", "plan", "priority"]) {
        assert.ok(typeof ROBOT_STALENESS_DAYS[robot] === "number", `staleness missing for ${robot}`);
        assert.ok(ROBOT_STALENESS_DAYS[robot] > 0);
    }
    assert.equal(typeof INTERVIEW_STALENESS_DAYS, "number");
});

await test("robot freshness is all-missing on a fresh product", async () => {
    const state = await freshness.getRobotFreshness("demo");
    for (const robot of Object.keys(ROBOT_STALENESS_DAYS)) {
        assert.equal(state[robot].status, "missing");
        assert.equal(state[robot].assetPath, null);
    }
});

await test("recordRobotRun marks robot as fresh", async () => {
    await freshness.recordRobotRun("demo", "scout", "assets/2026-04-24-scout.md");
    const state = await freshness.getRobotFreshness("demo");
    assert.equal(state.scout.status, "fresh");
    assert.equal(state.scout.assetPath, "assets/2026-04-24-scout.md");
    assert.ok(state.scout.lastRun);
    assert.equal(state.scout.staleAfterDays, ROBOT_STALENESS_DAYS.scout);
});

await test("detects stale robot run via back-dated lastRun", async () => {
    // Manually rewrite freshness.json to simulate an old run
    const fpath = workspace.getFreshnessPath("demo");
    const data = JSON.parse(await fs.readFile(fpath, "utf-8"));
    const tooOld = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString();
    data.robots.detective = {
        lastRun: tooOld,
        assetPath: "assets/very-old-detective.md",
        staleAfterDays: 60,
    };
    await fs.writeFile(fpath, JSON.stringify(data, null, 2), "utf-8");

    const state = await freshness.getRobotFreshness("demo");
    assert.equal(state.detective.status, "stale");
    assert.ok(state.detective.ageDays > 60);
});

await test("records interview answers and reports fresh status", async () => {
    await freshness.recordAllInterviewAnswers("demo", {
        target_geo: "India",
        pain_point: "Career confusion",
    });
    const state = await freshness.getInterviewFreshness("demo");
    assert.equal(state.target_geo.status, "fresh");
    assert.equal(state.target_geo.value, "India");
    assert.equal(state.pain_point.status, "fresh");
});

await test("getStoredAnswers aliases getInterviewFreshness", async () => {
    const stored = await freshness.getStoredAnswers("demo");
    assert.equal(stored.target_geo.value, "India");
});

// ── ContextStore ──────────────────────────────────────────────────
console.log("\nContextStore:");

await test("exports the allowed context types", () => {
    assert.deepEqual(
        [...CONTEXT_TYPES].sort(),
        ["analyst-report", "document", "note", "url"],
    );
});

await test("rejects unknown entry type", async () => {
    await assert.rejects(
        contextStore.add("demo", { type: "invalid", title: "x", content: "y" }),
        /Unknown context type/,
    );
});

await test("rejects missing title or content", async () => {
    await assert.rejects(
        contextStore.add("demo", { type: "note", title: "", content: "body" }),
        /requires both/,
    );
});

await test("add note appends to notes.md and indexes it", async () => {
    const saved = await contextStore.add("demo", {
        type: "note",
        title: "Initial hypothesis",
        content: "India parents pay for clarity",
    });
    assert.ok(saved.id.startsWith("ctx-"));
    assert.equal(saved.type, "note");

    const notesBody = await fs.readFile(
        path.join(workspace.getContextDir("demo"), "notes.md"),
        "utf-8",
    );
    assert.ok(notesBody.includes("Initial hypothesis"));
    assert.ok(notesBody.includes("India parents pay for clarity"));
    assert.ok(notesBody.includes(saved.id));
});

await test("list returns all entries and supports type filter", async () => {
    await contextStore.add("demo", {
        type: "url",
        title: "Market report",
        content: "Useful data at https://example.com",
        source: "https://example.com",
    });
    const all = await contextStore.list("demo");
    assert.equal(all.length, 2);
    const onlyNotes = await contextStore.list("demo", { type: "note" });
    assert.equal(onlyNotes.length, 1);
    assert.equal(onlyNotes[0].type, "note");
});

await test("get retrieves full content for a note entry", async () => {
    const all = await contextStore.list("demo");
    const note = all.find(e => e.type === "note");
    const full = await contextStore.get("demo", note.id);
    assert.ok(full);
    assert.ok(full.content.includes("India parents pay"));
});

await test("document entry is saved as a separate file", async () => {
    const saved = await contextStore.add("demo", {
        type: "document",
        title: "Analyst deep dive",
        content: "# Deep dive\n\nBody.",
    });
    assert.ok(saved.filename, "filename should be set for documents");
    const docsDir = path.join(workspace.getContextDir("demo"), "documents");
    const files = await fs.readdir(docsDir);
    assert.ok(files.some(f => f === saved.filename));

    const full = await contextStore.get("demo", saved.id);
    assert.ok(full.content.includes("Deep dive"));
});

await test("saveInterviewAnswers + loadInterviewAnswers round-trip", async () => {
    await contextStore.saveInterviewAnswers("demo", {
        target_geo: "India",
        pain_point: "Career confusion",
    });
    const loaded = await contextStore.loadInterviewAnswers("demo");
    assert.equal(loaded.target_geo, "India");
    assert.equal(loaded.pain_point, "Career confusion");
});

// ── AssetStore ────────────────────────────────────────────────────
console.log("\nAssetStore:");

await test("saveRobotResult writes a dated markdown file", async () => {
    const relPath = await assetStore.saveRobotResult("demo", "scout", {
        productIdea: "XpertIN AI",
        marketSize: { tam: 100, sam: 50, som: 10 },
    });
    assert.ok(relPath.startsWith("assets/"));
    assert.ok(relPath.endsWith("-scout.md"));
    const abs = path.join(workspace.getProductDir("demo"), relPath);
    const body = await fs.readFile(abs, "utf-8");
    assert.ok(body.includes("SCOUT Robot Analysis"));
    assert.ok(body.includes("XpertIN AI"));
    assert.ok(body.includes("```json"));
});

await test("loadRobotResult parses JSON block back into object", async () => {
    const relPath = await assetStore.saveRobotResult("demo", "detective", {
        productIdea: "XpertIN AI",
        competitors: ["iDreamCareer"],
    });
    const loaded = await assetStore.loadRobotResult("demo", relPath);
    assert.ok(loaded);
    assert.equal(loaded.result.productIdea, "XpertIN AI");
    assert.deepEqual(loaded.result.competitors, ["iDreamCareer"]);
});

await test("loadRobotResult returns null for missing file", async () => {
    const loaded = await assetStore.loadRobotResult("demo", "assets/nope.md");
    assert.equal(loaded, null);
});

await test("list returns all asset entries", async () => {
    const files = await assetStore.list("demo");
    assert.ok(files.length >= 2);
    assert.ok(files.every(f => f.relPath.startsWith("assets/")));
});

await test("appendFeedback adds a feedback block and is idempotent", async () => {
    const relPath = await assetStore.saveRobotResult("demo", "feature", {
        productIdea: "XpertIN AI",
        features: ["chat", "recommendations"],
    });
    await assetStore.appendFeedback("demo", relPath, { rating: 5, notes: "Great!" });
    await assetStore.appendFeedback("demo", relPath, { rating: 4, notes: "Even better" });

    const abs = path.join(workspace.getProductDir("demo"), relPath);
    const body = await fs.readFile(abs, "utf-8");
    // Should have exactly one feedback block (second call strips the first)
    const matches = body.match(/<!-- feedback-start -->/g) || [];
    assert.equal(matches.length, 1, "only one feedback block should remain");
    assert.ok(body.includes("Even better"));
    assert.ok(!body.includes("Great!"));
});

// ── Cleanup ───────────────────────────────────────────────────────
await fs.rm(tmpRoot, { recursive: true, force: true });

console.log(`\n${failures === 0 ? "✅" : "❌"} ${passes} passed, ${failures} failed`);
if (failures > 0) process.exit(1);
