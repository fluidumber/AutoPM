// ────────────────────────────────────────────────────────────────────
// ProductFlow Cockpit — HTTP read-only API
// ────────────────────────────────────────────────────────────────────
//
// This file exposes the existing AutoPM/ProductFlow workspace over HTTP
// so the browser-based cockpit (ProductFlow Cockpit.html) can render
// live data instead of mock data.
//
// READ-ONLY by design. All robot execution still happens through the
// MCP server via Claude Desktop. This server only reads the files the
// MCP server writes:
//
//     ~/.productflow/
//         profiles/<slug>/profile.md
//         products/<slug>/
//             product.md
//             freshness.json
//             context/...
//             assets/...
//     data/brain-database.json  (project-level)
//
// Run it:
//     cd <your AutoPM repo>
//     node src/http-server.js
//
// Then open ProductFlow Cockpit.html in the browser and point it at
// http://localhost:4321 (the frontend's api.js does this by default).
//
// Override the port with PRODUCTFLOW_HTTP_PORT.
// Override the workspace with PRODUCTFLOW_HOME (same env var the MCP
// server uses — so both processes see the same files).
// ────────────────────────────────────────────────────────────────────

import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

import { WorkspaceManager } from "./workspace/workspace-manager.js";
import { PMProfile }        from "./workspace/pm-profile.js";
import { ProductRegistry }  from "./workspace/product-registry.js";
import { AssetStore }       from "./workspace/asset-store.js";
import {
    ROBOT_STALENESS_DAYS,
    INTERVIEW_STALENESS_DAYS,
} from "./workspace/freshness-tracker.js";
import BrainDatabase from "../brain/brain-database.js";
const brainDatabase = new BrainDatabase();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Bootstrap services ───────────────────────────────────────────────
const workspace       = new WorkspaceManager();
const pmProfile       = new PMProfile(workspace);
const productRegistry = new ProductRegistry(workspace, pmProfile);
const assetStore      = new AssetStore(workspace);

const PORT     = Number(process.env.PRODUCTFLOW_HTTP_PORT || 4321);
const BINDING  = `127.0.0.1:${PORT}`;
const STARTED  = new Date().toISOString();

const BUSINESS_ROBOTS = ["scout", "detective", "people", "money"];
const EPIC_ROBOTS = ["epic", "feature", "plan", "priority"];
const PHASE_2_ROBOTS = [
    "user-stories", "scope-spec", "feasibility-tech", "feasibility-design",
    "customer-journeys", "data-privacy", "gtm-readiness", "risks-registry",
    "kpis", "daci-stakeholders",
];
const ALL_ROBOTS = [...BUSINESS_ROBOTS, ...EPIC_ROBOTS, ...PHASE_2_ROBOTS];

// ────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────

async function pathExists(p) {
    try { await fs.stat(p); return true; } catch { return false; }
}

async function fileSize(absPath) {
    try {
        const st = await fs.stat(absPath);
        const kb = st.size / 1024;
        if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
        return `${(kb / 1024).toFixed(1)} MB`;
    } catch { return "—"; }
}

async function readFreshness(slug) {
    try {
        const p = workspace.getFreshnessPath(slug);
        const raw = await fs.readFile(p, "utf-8");
        const parsed = JSON.parse(raw);
        
        parsed.asks = parsed.asks || {};
        parsed.asks["core"] = parsed.asks["core"] || { robots: {}, epics: {} };
        parsed.asks["core"].robots = { ...(parsed.robots || {}), ...parsed.asks["core"].robots };
        parsed.asks["core"].epics = { ...(parsed.epics || {}), ...parsed.asks["core"].epics };
        
        return parsed;
    } catch (e) {
        return { robots: {}, epics: {}, interviewAnswers: {}, asks: { "core": { robots: {}, epics: {} } } };
    }
}

function daysBetween(iso) {
    if (!iso) return Infinity;
    return (Date.now() - new Date(iso).getTime()) / 86400000;
}

function computeRobotStatus(robotEntry, robotKey, phase, phase1Promoted) {
    // Phase 2 robots are "locked" until promote-to-phase-2 runs.
    if (phase === 2 && !phase1Promoted) {
        return { status: "locked", lastRun: null, assetPath: null };
    }

    if (!robotEntry || !robotEntry.lastRun) {
        return { status: "missing", lastRun: null, assetPath: null };
    }

    const window = robotEntry.staleAfterDays
                || ROBOT_STALENESS_DAYS[robotKey]
                || 30;
    const age = daysBetween(robotEntry.lastRun);

    return {
        status:    age > window ? "stale" : "fresh",
        lastRun:   robotEntry.lastRun,
        assetPath: robotEntry.assetPath || null,
        windowDays: window,
        ageDays:    Math.round(age),
        staleReason: age > window
            ? `Last run ${Math.round(age)} days ago — exceeds ${window}-day window.`
            : null,
    };
}

async function buildRobotRuns(slug, phase1Promoted) {
    const fresh = await readFreshness(slug);
    
    await brainDatabase.ready;
    const allFb = brainDatabase.data?.feedback || [];

    const coreRuns = {};
    const coreAsk = fresh.asks?.["core"] || { robots: {}, epics: {} };
    for (const robotKey of BUSINESS_ROBOTS) {
        coreRuns[robotKey] = computeRobotStatus(coreAsk.robots?.[robotKey], robotKey, 1, phase1Promoted);
        const fb = allFb.filter(f => f.robotName === robotKey && (!f.productSlug || f.productSlug === slug));
        if (fb.length > 0) {
            const sum = fb.reduce((acc, f) => acc + f.rating, 0);
            const avg = Math.round((sum / fb.length) * 10) / 10;
            coreRuns[robotKey].feedback = { rating: avg, count: fb.length };
        }
    }

    const asks = {};
    for (const [askId, askData] of Object.entries(fresh.asks || {})) {
        asks[askId] = { robots: {}, epics: {} };

        // Extract epic names for this ask
        let epicNames = {};
        const epicOutput = await assetStore.loadLatestRobotOutput(slug, "epic", { askId });
        if (epicOutput) {
            let jsonStr = epicOutput;
            const jsonMatch = epicOutput.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) jsonStr = jsonMatch[1];
            else {
                const braceStart = epicOutput.indexOf('{');
                const braceEnd = epicOutput.lastIndexOf('}');
                if (braceStart !== -1 && braceEnd !== -1) jsonStr = epicOutput.substring(braceStart, braceEnd + 1);
            }
            try {
                const parsed = JSON.parse(jsonStr);
                if (parsed && Array.isArray(parsed.epics)) {
                    for (const e of parsed.epics) epicNames[e.id] = e.name;
                } else if (parsed && Array.isArray(parsed)) {
                    for (const e of parsed) epicNames[e.id] = e.name;
                }
            } catch(e) {}
        }

        // Ensure askData.epics is initialized with any epics we found in epic-output.md
        if (!askData.epics) askData.epics = {};
        for (const epicId of Object.keys(epicNames)) {
            if (!askData.epics[epicId]) {
                askData.epics[epicId] = { robots: {}, features: {} };
            }
        }

        // Epic-strategy robots (epic, feature, plan, priority) go under asks[askId].robots so they appear in Phase 1b
        for (const robotKey of EPIC_ROBOTS) {
            asks[askId].robots[robotKey] = computeRobotStatus(askData.robots?.[robotKey], robotKey, 1, phase1Promoted);
            const fb = allFb.filter(f => f.robotName === robotKey && (!f.productSlug || f.productSlug === slug));
            if (fb.length > 0) {
                const sum = fb.reduce((acc, f) => acc + f.rating, 0);
                asks[askId].robots[robotKey].feedback = { rating: Math.round((sum / fb.length) * 10) / 10, count: fb.length };
            }
        }

        // Epics
        for (const [epicId, epicData] of Object.entries(askData.epics || {})) {
            asks[askId].epics[epicId] = { robots: {}, features: {}, name: epicNames[epicId] || null };
            // Phase 2 robots go under the specific Epic
            for (const robotKey of PHASE_2_ROBOTS) {
                asks[askId].epics[epicId].robots[robotKey] = computeRobotStatus(epicData.robots?.[robotKey], robotKey, 2, phase1Promoted);
                const fb = allFb.filter(f => f.robotName === robotKey && (!f.productSlug || f.productSlug === slug));
                if (fb.length > 0) {
                    const sum = fb.reduce((acc, f) => acc + f.rating, 0);
                    const avg = Math.round((sum / fb.length) * 10) / 10;
                    asks[askId].epics[epicId].robots[robotKey].feedback = { rating: avg, count: fb.length };
                }
            }
        }
    }

    return { coreRuns, asks };
}

async function countInterviewAnswers(slug) {
    const fresh = await readFreshness(slug);
    return Object.keys(fresh.interviewAnswers || {}).length;
}

async function isPhase1Promoted(slug) {
    return pathExists(path.join(workspace.getContextDir(slug), "phase2-context.json"));
}

async function pddLatestPath(slug) {
    return path.join(workspace.getAssetsDir(slug), "pdd", `pdd-${slug}-latest.md`);
}

async function presentationPath(slug) {
    // Convention: utils/presentation-generator.js writes to <repo>/plans/<slug>-*.html
    const plansDir = path.join(__dirname, "..", "plans");
    try {
        const files = await fs.readdir(plansDir);
        const match = files.find(f => f.startsWith(slug) && f.endsWith(".html"));
        return match ? path.join(plansDir, match) : null;
    } catch { return null; }
}

// ────────────────────────────────────────────────────────────────────
// Compute gates G1-G8
// ────────────────────────────────────────────────────────────────────
async function computeGates(slug, ctx) {
    const { product, robotRuns, interviewCount, phase1Promoted, hasPdd, presentation } = ctx;

    const allP1Fresh = BUSINESS_ROBOTS.every(k => robotRuns[k]?.status === "fresh");
    const staleP1    = BUSINESS_ROBOTS.filter(k => robotRuns[k]?.status === "stale");
    const missingP1  = BUSINESS_ROBOTS.filter(k => robotRuns[k]?.status === "missing");
    let freshP2Count = 0;
    let missingP2 = new Set(PHASE_2_ROBOTS);
    for (const ask of Object.values(ctx.asks || {})) {
        for (const epic of Object.values(ask.epics || {})) {
            for (const k of PHASE_2_ROBOTS) {
                const stat = epic.robots?.[k]?.status;
                if (stat === "fresh") {
                    missingP2.delete(k);
                }
            }
        }
    }
    // Calculate fresh count based on robots that are NOT missing across all epics
    freshP2Count = PHASE_2_ROBOTS.length - missingP2.size;
    missingP2 = Array.from(missingP2);

    const personaActive = ctx.activePersona;

    const G1 = {
        id: "G1", name: "PM Profile exists",
        status: personaActive ? "passed" : "current",
        reason: personaActive
            ? `Active persona: ${personaActive.slug}`
            : "No active persona. Run pm-profile-save via Claude Desktop.",
        nextAction: personaActive ? null : "pm-profile-save",
    };

    const G2 = {
        id: "G2", name: "Product created",
        status: "passed",
        reason: `products/${slug}/ scaffolded${product?.created ? ` ${new Date(product.created).toLocaleDateString()}` : ""}`,
        nextAction: null,
    };

    const G3 = {
        id: "G3", name: "Interview answered",
        status: interviewCount >= 5 ? "passed" : (interviewCount > 0 ? "current" : "locked"),
        reason: interviewCount >= 5
            ? `${interviewCount} fresh interview answers on disk (≥ 5 required)`
            : `${interviewCount} of 5 minimum answers captured.`,
        nextAction: interviewCount >= 5 ? null : "Complete intake interview via 'interview' MCP tool.",
    };

    let G4;
    if (G3.status !== "passed") {
        G4 = { id: "G4", name: "Phase 1 complete", status: "locked", reason: "" };
    } else if (allP1Fresh) {
        G4 = { id: "G4", name: "Phase 1 complete", status: "passed",
               reason: `All 7 Phase 1 robots fresh.`, nextAction: null };
    } else {
        const parts = [];
        if (missingP1.length) parts.push(`${missingP1.length} missing (${missingP1.join(", ")})`);
        if (staleP1.length)   parts.push(`${staleP1.length} stale (${staleP1.join(", ")})`);
        G4 = { id: "G4", name: "Phase 1 complete", status: "current",
               reason: `Phase 1 progress: ${parts.join("; ") || "in progress"}.`,
               nextAction: missingP1[0] ? `Run ${missingP1[0]} robot.` : `Re-run stale: ${staleP1.join(", ")}.` };
    }

    let G5;
    if (G4.status !== "passed") {
        G5 = { id: "G5", name: "Phase 2 promoted", status: "locked", reason: "Awaiting G4." };
    } else {
        G5 = {
            id: "G5", name: "Phase 2 promoted",
            status: phase1Promoted ? "passed" : "current",
            reason: phase1Promoted
                ? "context/phase2-context.json present"
                : "Phase 1 complete but not promoted to Phase 2.",
            nextAction: phase1Promoted ? null : "Run promote-to-phase-2 via Claude Desktop.",
        };
    }

    let G6;
    if (G5.status !== "passed") {
        G6 = { id: "G6", name: "Phase 2 in progress", status: "locked", reason: "Phase 2 not promoted." };
    } else if (freshP2Count === PHASE_2_ROBOTS.length) {
        G6 = { id: "G6", name: "Phase 2 in progress", status: "passed",
               reason: "All 10 Phase 2 robots fresh.", nextAction: null };
    } else {
        G6 = { id: "G6", name: "Phase 2 in progress", status: "current",
               reason: `${freshP2Count} of ${PHASE_2_ROBOTS.length} Phase 2 robots fresh. Awaiting ${missingP2.join(", ")}.`,
               nextAction: missingP2[0] ? `Run ${missingP2[0]} robot.` : null };
    }

    let G7;
    if (G6.status !== "passed") {
        G7 = { id: "G7", name: "PDD exported", status: "blocked",
               reason: "PDD assembly requires all Phase 2 robots fresh.", nextAction: "Run remaining Phase 2 robots first." };
    } else {
        G7 = { id: "G7", name: "PDD exported",
               status: hasPdd ? "passed" : "current",
               reason: hasPdd ? `assets/pdd/pdd-${slug}-latest.md present` : "No PDD found.",
               nextAction: hasPdd ? null : "Run pdd-compose via Claude Desktop." };
    }

    let G8;
    if (presentation && G7.status === "passed") {
        G8 = { id: "G8", name: "Presentation generated", status: "passed",
               reason: `Presentation at ${path.relative(path.join(__dirname, ".."), presentation)}` };
    } else if (presentation) {
        G8 = { id: "G8", name: "Presentation generated", status: "mismatch",
               reason: "Presentation HTML exists but a required upstream gate is incomplete.",
               nextAction: "Resolve upstream gate or re-run generate-presentation." };
    } else {
        G8 = { id: "G8", name: "Presentation generated", status: "locked", reason: "" };
    }

    return [G1, G2, G3, G4, G5, G6, G7, G8];
}

function rollups(robotRuns) {
    const r = { fresh: 0, stale: 0, missing: 0, blocked: 0, locked: 0 };
    for (const v of Object.values(robotRuns)) r[v.status] = (r[v.status] || 0) + 1;
    return r;
}

function pickCurrentGate(gates) {
    const current = gates.find(g => g.status === "current");
    if (current) return current.id;
    // Highest passed gate, else G1
    const passed = gates.filter(g => g.status === "passed");
    return passed.length ? passed[passed.length - 1].id : "G1";
}

function nextActionFor(gates, robotRuns) {
    const current = gates.find(g => g.status === "current") || gates.find(g => g.status === "mismatch") || gates.find(g => g.status === "blocked");
    if (!current) return null;

    const staleRobots = Object.entries(robotRuns).filter(([_, v]) => v.status === "stale").map(([k]) => k);
    return {
        label:   current.nextAction || `Resolve ${current.name}`,
        reason:  current.reason,
        gate:    current.id,
        affects: staleRobots.length ? staleRobots.map(k => `robot:${k}`) : [],
    };
}

// ────────────────────────────────────────────────────────────────────
// Activity feed — derived from freshness lastRun + brain feedback
// ────────────────────────────────────────────────────────────────────
async function buildActivity(slug) {
    const fresh = await readFreshness(slug);
    const events = [];

    const addEvents = (robotsMap, scopeStr) => {
        for (const [robot, entry] of Object.entries(robotsMap || {})) {
            if (entry.lastRun) {
                const window = ROBOT_STALENESS_DAYS[robot] || 30;
                const age = daysBetween(entry.lastRun);
                if (age > window) {
                    events.push({
                        kind: "stale", when: entry.lastRun,
                        text: `${robot} output marked stale (${scopeStr})`,
                    });
                }
                events.push({
                    kind: "fresh", when: entry.lastRun,
                    text: `${robot} ran (${scopeStr})`,
                });
            }
        }
    };

    // Scan asks for runs
    for (const [askId, askData] of Object.entries(fresh.asks || {})) {
        addEvents(askData.robots, askId === "core" ? "Core" : `Ask: ${askId}`);
        for (const [epicId, epicData] of Object.entries(askData.epics || {})) {
            addEvents(epicData.robots, `Epic: ${epicId}`);
        }
    }

    // Feedback events from brain database, scoped to this product
    await brainDatabase.ready;
    const feedback = (brainDatabase.data?.feedback || [])
        .filter(f => !f.productSlug || f.productSlug === slug);
    for (const f of feedback) {
        events.push({
            kind: "feedback", when: f.timestamp,
            text: `Feedback ${f.rating}/5 on ${f.robotName}${f.notes ? ` — '${f.notes.slice(0, 90)}${f.notes.length > 90 ? "…" : ""}'` : ""}`,
        });
    }

    events.sort((a, b) => new Date(b.when) - new Date(a.when));
    return events.slice(0, 24);
}

// ────────────────────────────────────────────────────────────────────
// Artifacts library — scan assets/ for .md + .xlsx + pdd + plans
// ────────────────────────────────────────────────────────────────────
async function extractAuthor(absPath) {
    try {
        const fh = await fs.open(absPath, "r");
        const buf = Buffer.alloc(1024);
        const { bytesRead } = await fh.read(buf, 0, 1024, 0);
        await fh.close();
        const content = buf.toString("utf-8", 0, bytesRead);
        const match = content.match(/^author:\s*["']?([^"'\r\n]+)["']?/m);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

async function buildArtifacts(slug) {
    const out = [];
    const assetsDir = workspace.getAssetsDir(slug);

    let files = [];
    try {
        const rawFiles = await fs.readdir(assetsDir, { recursive: true });
        files = rawFiles.map(f => f.replaceAll("\\", "/"));
    } catch {
        files = [];
    }

    let id = 1;
    for (const f of files.sort()) {
        const abs = path.join(assetsDir, f);
        const st  = await fs.stat(abs).catch(() => null);
        if (!st || st.isDirectory()) continue;

        // Skip files under pdd/ since PDD files are handled separately
        if (f.startsWith("pdd/")) continue;

        const basename = path.basename(f);
        const dateMatch  = basename.match(/^(\d{4}-\d{2}-\d{2})-(.+?)(?:-output)?\.(md|xlsx|html|json)$/);
        const robot      = dateMatch?.[2] || "unknown";
        const isXlsx     = f.endsWith(".xlsx");
        const isHtml     = f.endsWith(".html");
        const isJson     = f.endsWith(".json");
        const isOutput   = f.includes("-output.");

        // Skip raw prompt payload files only if the corresponding -output.md file exists
        if (f.endsWith(".md") && !isOutput && dateMatch) {
            const outputPath = f.replace(".md", "-output.md");
            if (files.includes(outputPath)) {
                continue;
            }
        }

        const author = f.endsWith(".md") ? await extractAuthor(abs) : null;

        let displayF = f;
        const isOtherAsset = isXlsx || basename.endsWith(".pptx");
        if (isOtherAsset) {
            displayF = `other-assets/${basename}`;
        } else if (BUSINESS_ROBOTS.includes(robot)) {
            displayF = `Business Space/${basename}`;
        } else if (EPIC_ROBOTS.includes(robot) || PHASE_2_ROBOTS.includes(robot)) {
            let epicId = "global";
            const epicMatch = f.match(/epics\/([^\/]+)/);
            if (epicMatch) {
                epicId = epicMatch[1];
            }
            displayF = `Epics/${epicId}/${basename}`;
        } else {
            displayF = `Misc/${basename}`;
        }

        out.push({
            id:    `art-${id++}`,
            type:  isXlsx ? "xlsx" : isHtml ? "html" : isJson ? "json" : "markdown",
            robot: robot,
            title: `${robot}${isOutput ? " — output" : ""}${isXlsx ? " workbook" : ""}${isHtml ? " viewer" : ""}${isJson ? " data" : ""}`,
            filename:  basename,
            path:      `products/${slug}/assets/${f}`,
            logicalPath: `products/${slug}/assets/${displayF}`,
            generated: dateMatch ? new Date(`${dateMatch[1]}T12:00:00Z`).toISOString() : st.mtime.toISOString(),
            size:      await fileSize(abs),
            author,
        });
    }

    // PDD files under assets/pdd/ or assets/asks/core/epics/*/pdd/
    // We already traversed all files with recursive readdir, so we just need to find the PDDs in `files`
    for (const f of files.sort()) {
        const basename = path.basename(f);
        if (basename.startsWith("pdd-") && (basename.endsWith(".md") || basename.endsWith(".json"))) {
            const abs = path.join(assetsDir, f);
            const st  = await fs.stat(abs).catch(() => null);
            if (!st) continue;
            
            const author = basename.endsWith(".md") ? await extractAuthor(abs) : null;
            let displayF = `Epics/global/pdd/${basename}`;
            const epicMatch = f.match(/epics\/([^\/]+)/);
            if (epicMatch) {
                displayF = `Epics/${epicMatch[1]}/pdd/${basename}`;
            }

            out.push({
                id:    `art-${id++}`,
                type:  "pdd",
                robot: "pdd-composer",
                title: basename.replace(/\.(md|json)$/, ""),
                filename:  basename,
                path:      `products/${slug}/assets/${f}`,
                logicalPath: `products/${slug}/assets/${displayF}`,
                generated: st.mtime.toISOString(),
                size:      await fileSize(abs),
                author,
            });
        }
    }

    // Presentation under plans/
    const pres = await presentationPath(slug);
    if (pres) {
        const st = await fs.stat(pres);
        out.push({
            id:    `art-${id++}`,
            type:  "presentation",
            robot: "presentation",
            title: `Strategy presentation`,
            filename:  path.basename(pres),
            path:      `plans/${path.basename(pres)}`,
            generated: st.mtime.toISOString(),
            size:      await fileSize(pres),
        });
    }

    return out;
}

// ────────────────────────────────────────────────────────────────────
// Context entries — scan context/ for notes, urls, documents, research
// ────────────────────────────────────────────────────────────────────
async function buildContext(slug) {
    const contextDir = workspace.getContextDir(slug);
    const out = [];
    let id = 1;

    async function pushFile(abs, type, title, sourceLabel) {
        try {
            const st = await fs.stat(abs);
            const buf = type === "url"
                ? await fs.readFile(abs, "utf-8").catch(() => "")
                : "";
            let excerpt = "";
            if (type !== "url" && st.size < 65536) {
                const text = await fs.readFile(abs, "utf-8").catch(() => "");
                excerpt = text.replace(/^---[\s\S]*?---/, "").trim().slice(0, 240);
            }
            out.push({
                id:    `ctx-${id++}`,
                type,
                title,
                source: sourceLabel,
                path:   `products/${slug}/${path.relative(workspace.getProductDir(slug), abs).replaceAll("\\", "/")}`,
                date:   st.mtime.toISOString(),
                size:   await fileSize(abs),
                excerpt,
            });
        } catch { /* ignore */ }
    }

    await pushFile(path.join(contextDir, "interview-answers.md"), "interview-answers",
                   "Phase 1 intake interview answers", "context/interview-answers.md");
    await pushFile(path.join(contextDir, "notes.md"), "note",
                   "PM notes", "context/notes.md");

    // documents/
    try {
        const docs = await fs.readdir(path.join(contextDir, "documents"));
        for (const d of docs) {
            await pushFile(path.join(contextDir, "documents", d), "document",
                           d, "Local file");
        }
    } catch { /* no documents */ }

    // research/
    try {
        const research = await fs.readdir(path.join(contextDir, "research"));
        for (const d of research) {
            const type = d.endsWith(".pdf") ? "analyst-report"
                       : d.endsWith(".csv") ? "survey-result"
                       : "research";
            await pushFile(path.join(contextDir, "research", d), type, d, "Internal research");
        }
    } catch { /* no research */ }

    // urls/
    try {
        const urls = await fs.readdir(path.join(contextDir, "urls"));
        for (const u of urls) {
            const abs = path.join(contextDir, "urls", u);
            const target = await fs.readFile(abs, "utf-8").catch(() => "");
            out.push({
                id:    `ctx-${id++}`,
                type:  "url",
                title: u.replace(/\.url$/, ""),
                source: target.trim() || "URL",
                path:  `products/${slug}/context/urls/${u}`,
                date:  (await fs.stat(abs)).mtime.toISOString(),
                size:  "1 KB",
                excerpt: target.trim().slice(0, 240),
            });
        }
    } catch { /* no urls */ }

    return out;
}

// ────────────────────────────────────────────────────────────────────
// Workspace check
// ────────────────────────────────────────────────────────────────────
async function buildWorkspaceCheck() {
    const root          = workspace.getRoot();
    const profilesDir   = workspace.getProfilesDir();
    const productsDir   = workspace.getProductsDir();
    const activeFile    = workspace.getActivePersonaFile();
    const policyFile    = path.join(__dirname, "..", "config", "staleness-policy.json");

    const check = async (id, label, target, extra = {}) => {
        const ok = await pathExists(target);
        return { id, label, target, status: ok ? "ok" : "missing", ...extra };
    };

    const checks = [
        { id: "home", label: "PRODUCTFLOW_HOME resolved", target: root,
          status: (await pathExists(root)) ? "ok" : "missing" },
        await check("profiles", "profiles/ directory readable", profilesDir),
        await check("active",   "Active persona pointer found",  activeFile),
        await (async () => {
            const productDirs = (await fs.readdir(productsDir).catch(() => []))
                .filter(d => !d.startsWith("."));
            return {
                id: "products", label: "products/ directory readable", target: productsDir,
                status: "ok", note: `${productDirs.length} product${productDirs.length === 1 ? "" : "s"} detected`,
            };
        })(),
        await check("policy", "Staleness policy loaded", policyFile,
                    { note: "Falls back to compiled-in defaults if absent" }),
    ];

    let activePersona = null;
    try {
        const profile = await pmProfile.load();
        if (profile) activePersona = { slug: profile.slug, name: profile.name, role: profile.role || "" };
    } catch { /* no profile */ }

    return {
        root,
        resolvedFrom: process.env.PRODUCTFLOW_HOME ? "$PRODUCTFLOW_HOME" : "default (~/.productflow)",
        checks,
        activePersona,
        startedAt: STARTED,
        binding:   BINDING,
    };
}

// ────────────────────────────────────────────────────────────────────
// Staleness policy bundle
// ────────────────────────────────────────────────────────────────────
async function buildPolicy() {
    const policyFile = path.join(__dirname, "..", "config", "staleness-policy.json");
    let version = "1.0.0";
    let source  = "config/staleness-policy.json";
    let robots  = {};
    try {
        const raw    = await fs.readFile(policyFile, "utf-8");
        const policy = JSON.parse(raw);
        version = policy.version || version;
        robots  = policy.robots || {};
    } catch {
        source  = "compiled-in defaults";
        robots  = Object.fromEntries(Object.entries(ROBOT_STALENESS_DAYS).map(([k, v]) => [k, { windowDays: v }]));
    }

    // Per-product overrides
    const products = await productRegistry.list().catch(() => []);
    const overrides = {};
    for (const p of products) {
        try {
            const raw = await fs.readFile(workspace.getProductStalenessOverridePath(p.slug), "utf-8");
            const json = JSON.parse(raw);
            overrides[p.slug] = json.robots || {};
        } catch { /* none */ }
    }

    return {
        version, source,
        resolutionOrder: [
            { tier: 1, name: "Per-product override", path: "products/<slug>/staleness-overrides.json", precedence: "highest" },
            { tier: 2, name: "Per-persona override", path: "profiles/<slug>/staleness-overrides.json", precedence: "high" },
            { tier: 3, name: "Project policy",       path: "config/staleness-policy.json",            precedence: "medium" },
            { tier: 4, name: "Compiled-in defaults", path: "freshness-tracker.js",                    precedence: "fallback" },
        ],
        interviewAnswers: { windowDays: INTERVIEW_STALENESS_DAYS, rationale: "PM context is stable for 6 months" },
        robotWindows: robots,
        overrides,
    };
}

// ────────────────────────────────────────────────────────────────────
// Feedback events
// ────────────────────────────────────────────────────────────────────
async function buildFeedback() {
    await brainDatabase.ready;
    const feedback = brainDatabase.data?.feedback || [];
    return feedback.map((f, i) => ({
        id:          `fb-${i + 1}`,
        productSlug: f.productSlug || "(global)",
        robot:       f.robotName,
        artifactId:  null,
        rating:      f.rating,
        notes:       f.notes || "",
        at:          f.timestamp,
        status:      "saved",
        persona:     f.persona || null,
    }));
}

// ────────────────────────────────────────────────────────────────────
// Product enrichment (everything the frontend needs for one product)
// ────────────────────────────────────────────────────────────────────
async function enrichProduct(p, activePersona) {
    const slug = p.slug;
    const [phase1Promoted, interviewCount, robotRunsRaw] = await Promise.all([
        isPhase1Promoted(slug),
        countInterviewAnswers(slug),
        readFreshness(slug).then(() => null), // warm
    ]);

    const { coreRuns, asks } = await buildRobotRuns(slug, phase1Promoted);
    const hasPdd    = await pathExists(await pddLatestPath(slug));
    const pres      = await presentationPath(slug);

    const gates = await computeGates(slug, {
        product: p, robotRuns: coreRuns, asks, interviewCount, phase1Promoted,
        hasPdd, presentation: pres, activePersona,
    });

    // Dummy rollups for now (was used for top level previously)
    const rolls = rollups(coreRuns);
    const stage = p.stage || (phase1Promoted ? "Phase 2 — Execution Definition" : "Phase 1 — Strategic Discovery");
    const currentGate = pickCurrentGate(gates);
    const nextAction  = nextActionFor(gates, coreRuns);

    return {
        slug:         p.slug,
        name:         p.name,
        stage,
        overview:     p.overview || "",
        targetMarket: p.targetMarket || "",
        competitors:  p.competitors || [],
        tags:         p.tags || [],
        ownerPersona: p.ownerPersona,
        created:      p.created,
        updated:      p.updated,
        currentGate,
        rollups:      rolls,
        nextAction,
        // detail bundle
        gates,
        robotRuns: coreRuns, // Rename to coreRuns logically but keeping key to avoid breaking old clients
        coreRuns,
        asks,
    };
}

// ────────────────────────────────────────────────────────────────────
// Routes
// ────────────────────────────────────────────────────────────────────
const app = express();

// CORS — local dev only
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin",  req.headers.origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS, POST");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

// Serve Cockpit UI static assets
app.use(express.static(path.join(__dirname, "ui/cockpit")));
app.use(express.json());

app.get("/api/health", (_, res) => {
    res.json({ ok: true, version: "1.0.0", binding: BINDING, startedAt: STARTED });
});

app.get("/api/bundle", async (_req, res) => {
    try {
        const workspaceInfo = await buildWorkspaceCheck();
        const productsRaw   = await productRegistry.list();
        const products      = [];
        const artifacts     = {};
        const context       = {};
        const activity      = {};

        for (const p of productsRaw) {
            const enriched = await enrichProduct(p, workspaceInfo.activePersona);
            products.push(enriched);
            artifacts[p.slug] = await buildArtifacts(p.slug);
            context[p.slug]   = await buildContext(p.slug);
            activity[p.slug]  = await buildActivity(p.slug);
        }

        const policy   = await buildPolicy();
        const feedback = await buildFeedback();

        res.json({
            source: "live",
            generatedAt: new Date().toISOString(),
            workspace: workspaceInfo,
            products,
            artifacts,
            context,
            activity,
            policy,
            feedback,
        });
    } catch (err) {
        console.error("[/api/bundle] error:", err);
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

// Raw markdown body of one artifact, by relative path under the workspace.
// e.g. /api/artifact?path=products/autopm-productflow/assets/2026-05-23-feasibility-design.md
app.get("/api/artifact", async (req, res) => {
    const rel = String(req.query.path || "");
    if (!rel || rel.includes("..")) return res.status(400).json({ error: "bad path" });

    const abs = path.join(workspace.getRoot(), rel.replace(/^products\//, "products/"));
    try {
        const body = await fs.readFile(abs, "utf-8");
        const ext = path.extname(abs).toLowerCase();
        if (ext === '.html') {
            res.type("text/html");
        } else if (ext === '.json') {
            res.type("application/json");
        } else {
            res.type("text/markdown");
        }
        res.send(body);
    } catch (err) {
        res.status(404).json({ error: "not found", path: rel });
    }
});

// ────────────────────────────────────────────────────────────────────
// Write Endpoints
// ────────────────────────────────────────────────────────────────────

app.post("/api/select-experiment", async (req, res) => {
    try {
        const { productSlug, mode, clusterId, storyIds, rationale } = req.body;
        if (!productSlug || !mode) {
            return res.status(400).json({ error: "Missing required fields: productSlug, mode" });
        }

        const selPath = path.join(workspace.getContextDir(productSlug), "experiment-selection.json");
        const payload = {
            productSlug,
            mode,
            clusterId: clusterId || null,
            storyIds: storyIds || [],
            rationale: rationale || "Selected via Cockpit UI",
            timestamp: new Date().toISOString(),
        };

        await fs.mkdir(path.dirname(selPath), { recursive: true });
        await fs.writeFile(selPath, JSON.stringify(payload, null, 2), "utf-8");

        res.json({ success: true, path: selPath, payload });
    } catch (err) {
        console.error("[/api/select-experiment] error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/feedback", async (req, res) => {
    try {
        const { productSlug, robot, rating, notes } = req.body;
        if (!robot || typeof rating !== "number") {
            return res.status(400).json({ error: "Missing required fields: robot, rating (number)" });
        }

        await brainDatabase.ready;
        // analysisId can be null, we'll pass a generated uuid or null
        await brainDatabase.saveFeedback(
            null, 
            robot, 
            rating, 
            notes || "", 
            productSlug || null
        );

        res.json({ success: true });
    } catch (err) {
        console.error("[/api/feedback] error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ────────────────────────────────────────────────────────────────────
// Start
// ────────────────────────────────────────────────────────────────────
app.listen(PORT, "127.0.0.1", () => {
    console.log("");
    console.log("┌──────────────────────────────────────────────────────────┐");
    console.log("│  ProductFlow Cockpit Server                              │");
    console.log("├──────────────────────────────────────────────────────────┤");
    console.log(`│  Workspace : ${workspace.getRoot().padEnd(43)} │`);
    console.log(`│  Cockpit UI: http://${BINDING}${" ".repeat(40 - BINDING.length)} │`);
    console.log(`│  Health    : http://${BINDING}/api/health${" ".repeat(28 - BINDING.length)} │`);
    console.log(`│  Bundle    : http://${BINDING}/api/bundle${" ".repeat(28 - BINDING.length)} │`);
    console.log("├──────────────────────────────────────────────────────────┤");
    console.log("│  READ-ONLY. Robot execution stays in Claude Desktop.     │");
    console.log("└──────────────────────────────────────────────────────────┘");
    console.log("");
});
