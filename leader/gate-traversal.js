// gate-traversal.js — Evaluate G1–G8 workflow gates for a product.
//
// This module is a PURE STATE EVALUATOR.  It reads disk state (workspace files,
// freshness records) and returns a structured gate report.  It does NOT write
// any files, call any robots, or make network requests.
//
// Gates (in order):
//   G1  PM Profile exists         workspace.hasPmProfile()
//   G2  Product created           workspace.hasProduct(slug)
//   G3  Interview answered        ≥ 5 fresh interview answers on disk
//   G4  Phase 1 complete          all 7 Phase 1 robots are fresh
//   G5  Phase 2 promoted          context/phase2-context.json present
//   G6  Phase 2 in progress       ≥ 1 Phase 2 robot output is fresh
//   G7  PDD exported              assets/pdd/pdd-<slug>-latest.md exists
//   G8  Presentation generated    any .html file exists in assets/
//
// Gates are evaluated in order; gatesPassed lists all that passed regardless
// of later failures.  highestConsecutivePassed is the last gate in an
// unbroken streak from G1.

import fs from "fs/promises";
import path from "path";

import {
    ROBOT_ORDER_BUSINESS as PHASE1A_ROBOTS,
    ROBOT_ORDER_EPIC_STRATEGY as PHASE1B_ROBOTS,
    ROBOT_ORDER_PHASE_2 as PHASE2_ROBOTS,
} from "../src/config/robot-registry.js";

const ROBOT_ORDER_PHASE_1 = [...PHASE1A_ROBOTS, ...PHASE1B_ROBOTS];

export const GATES = {
    G1: "PM Profile exists",
    G2: "Product created",
    G3: "Interview answered",
    G4: "Phase 1 complete",
    G5: "Phase 2 promoted",
    G6: "Phase 2 in progress",
    G7: "PDD exported",
    G8: "Presentation generated",
};

export const GATE_NEXT_ACTIONS = {
    G1: "Call 'pm-profile-save' to create your PM persona first.",
    G2: "Call 'product-create' to scaffold a new product.",
    G3: "Call 'interview' to complete the product intake interview.",
    G4: `Run all Phase 1 robots via 'run-robot' in order: ${ROBOT_ORDER_PHASE_1.join(", ")}. Call 'feedback' after each one.`,
    G5: "Call 'promote-to-phase-2' (Call 1 — no confirm flag) to review Phase 1 outputs with the PM, then confirm promotion.",
    G6: `Run Phase 2 robots via 'run-robot' in recommended order: ${PHASE2_ROBOTS.join(", ")}.`,
    G7: "Call 'generate-pdd' to assemble the PDD JSON, then 'save-pdd' to export it.",
    G8: "Call 'generate-presentation' and then 'save-presentation-file' to create the stakeholder presentation.",
};

/**
 * Evaluate all G1–G8 workflow gates for a product.
 *
 * @param {object} deps
 * @param {import('../src/workspace/workspace-manager.js').WorkspaceManager} deps.workspace
 * @param {import('../src/workspace/freshness-tracker.js').FreshnessTracker} deps.freshness
 * @param {string|null} productSlug
 * @param {string} [askId="core"]
 * @returns {Promise<GateReport>}
 */
export async function traverseGates({ workspace, freshness }, productSlug, askId = "core") {
    const gates = {};

    // ── G1: PM Profile exists ─────────────────────────────────────────
    const hasPm = await workspace.hasPmProfile();
    gates.G1 = {
        name: GATES.G1,
        passed: hasPm,
        detail: hasPm ? "PM profile found." : "No PM profile — create one first.",
    };

    // ── G2: Product exists ────────────────────────────────────────────
    const hasProduct = productSlug ? await workspace.hasProduct(productSlug) : false;
    gates.G2 = {
        name: GATES.G2,
        passed: hasProduct,
        detail: hasProduct
            ? `Product '${productSlug}' found on disk.`
            : productSlug
                ? `Product '${productSlug}' not found.`
                : "No productSlug provided.",
    };

    // ── G3: Interview answered (≥5 fresh answers) ─────────────────────
    let interviewPassed = false;
    let interviewDetail = "No interview answers recorded.";
    if (hasProduct) {
        try {
            const ifresh = await freshness.getInterviewFreshness(productSlug);
            const freshCount = Object.values(ifresh).filter(v => v.status === "fresh").length;
            const total = Object.keys(ifresh).length;
            interviewPassed = freshCount >= 5;
            interviewDetail = total > 0
                ? `${freshCount}/${total} interview answers are fresh.`
                : "No answers recorded yet.";
        } catch { /* fresh workspace — nothing written */ }
    }
    gates.G3 = { name: GATES.G3, passed: interviewPassed, detail: interviewDetail };

    // ── G4: Phase 1 complete (1A core fresh + 1B ask fresh) ───────────────
    let phase1Passed = false;
    let phase1Detail = "Phase 1 robots not yet run.";
    let stalePhase1 = [...PHASE1A_ROBOTS, ...PHASE1B_ROBOTS];
    if (hasProduct) {
        try {
            // Check Phase 1a (always core)
            const rf1A = await freshness.getRobotFreshness(productSlug, { askId: "core" });
            const stale1A = PHASE1A_ROBOTS.filter(r => rf1A[r]?.status !== "fresh");

            // Check Phase 1b (active askId)
            const rf1B = await freshness.getRobotFreshness(productSlug, { askId });
            const stale1B = PHASE1B_ROBOTS.filter(r => rf1B[r]?.status !== "fresh");

            stalePhase1 = [...stale1A, ...stale1B];
            phase1Passed = stalePhase1.length === 0;

            if (phase1Passed) {
                phase1Detail = `All Phase 1a (core) and Phase 1b (${askId}) robots are fresh.`;
            } else {
                phase1Detail = `Not fresh: ${stalePhase1.join(", ")}.`;
            }
        } catch { /* fresh workspace */ }
    }
    gates.G4 = {
        name: GATES.G4,
        passed: phase1Passed,
        detail: phase1Detail,
        staleRobots: stalePhase1,
    };

    // ── G5: Phase 2 promoted (phase2-context.json present) ───────────
    let phase2Promoted = false;
    if (hasProduct) {
        try {
            await fs.access(workspace.getPhase2ContextPath(productSlug));
            phase2Promoted = true;
        } catch { /* not yet promoted */ }
    }
    gates.G5 = {
        name: GATES.G5,
        passed: phase2Promoted,
        detail: phase2Promoted
            ? "context/phase2-context.json exists."
            : "Phase 2 not yet promoted.",
    };

    // ── G6: Phase 2 in progress (≥1 Phase 2 robot fresh) ─────────────
    let completedPhase2 = [];
    if (phase2Promoted) {
        try {
            const rf = await freshness.getRobotFreshness(productSlug);
            completedPhase2 = PHASE2_ROBOTS.filter(r => rf[r]?.status === "fresh");
        } catch { /* fresh workspace */ }
    }
    const phase2InProgress = completedPhase2.length > 0;
    gates.G6 = {
        name: GATES.G6,
        passed: phase2InProgress,
        detail: phase2InProgress
            ? `${completedPhase2.length}/10 Phase 2 robots complete: ${completedPhase2.join(", ")}.`
            : "Phase 2 promoted but no robots run yet.",
        completedRobots: completedPhase2,
        remainingRobots: PHASE2_ROBOTS.filter(r => !completedPhase2.includes(r)),
    };

    // ── G7: PDD exported (pdd-<slug>-latest.md exists) ───────────────
    let pddExported = false;
    if (hasProduct) {
        try {
            const latestPath = path.join(
                workspace.getPDDDir(productSlug),
                `pdd-${productSlug}-latest.md`
            );
            await fs.access(latestPath);
            pddExported = true;
        } catch { /* not yet generated */ }
    }
    gates.G7 = {
        name: GATES.G7,
        passed: pddExported,
        detail: pddExported
            ? `pdd-${productSlug}-latest.md found.`
            : "PDD not yet generated.",
    };

    // ── G8: Presentation generated (any .html in assets/) ────────────
    let presentationExists = false;
    if (hasProduct) {
        try {
            const files = await fs.readdir(workspace.getAssetsDir(productSlug));
            presentationExists = files.some(f => f.endsWith(".html"));
        } catch { /* no assets dir */ }
    }
    gates.G8 = {
        name: GATES.G8,
        passed: presentationExists,
        detail: presentationExists
            ? "Presentation HTML file found in assets/."
            : "Presentation not yet generated.",
    };

    // ── Summary ───────────────────────────────────────────────────────
    const gateOrder = ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"];
    const gatesPassed = gateOrder.filter(g => gates[g].passed);
    const gatesFailed = gateOrder.filter(g => !gates[g].passed);

    // Walk forward until the first failure — that's the highest consecutive gate
    let highestConsecutive = "none";
    for (const g of gateOrder) {
        if (!gates[g].passed) break;
        highestConsecutive = g;
    }

    const nextBlocker = gatesFailed[0] ?? null;
    const nextAction  = nextBlocker
        ? GATE_NEXT_ACTIONS[nextBlocker]
        : "All gates passed. The product workflow is complete.";

    const existingAsks = hasProduct ? await workspace.listAsks(productSlug) : [];
    const availableProducts = !hasProduct ? await workspace.listProducts() : [];

    return {
        productSlug,
        gates,
        gatesPassed,
        gatesFailed,
        highestConsecutivePassed: highestConsecutive,
        nextBlocker,
        nextAction,
        existingAsks,
        availableProducts,
        phase2: {
            completedRobots: completedPhase2,
            remainingRobots: PHASE2_ROBOTS.filter(r => !completedPhase2.includes(r)),
            allComplete: completedPhase2.length === PHASE2_ROBOTS.length,
        },
    };
}

/**
 * @typedef {Object} GateReport
 * @property {string|null}  productSlug
 * @property {Object}       gates                     - "G1"–"G8" → { name, passed, detail, ...extra }
 * @property {string[]}     gatesPassed               - e.g. ["G1","G2","G3"]
 * @property {string[]}     gatesFailed               - e.g. ["G4","G5","G6","G7","G8"]
 * @property {string}       highestConsecutivePassed  - last gate in an unbroken streak, or "none"
 * @property {string|null}  nextBlocker               - first failed gate, or null if all passed
 * @property {string}       nextAction                - human-readable instruction for the PM
 * @property {object}       phase2                    - Phase 2 robot progress detail
 */
