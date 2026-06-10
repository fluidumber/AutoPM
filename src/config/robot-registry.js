/**
 * Central Registry for ProductFlow Robots
 * 
 * This file is the single source of truth for the list and order of all robots
 * in the system. To add a new robot, register it here.
 */

/** Phase 1a run order — product core strategy (Business Justification) */
export const ROBOT_ORDER_BUSINESS = [
    "scout",
    "detective",
    "people",
    "money",
];

/** Phase 1a' - Synthesizer Agent */
export const ROBOT_ORDER_SYNTHESIS = [
    "synthesizer",
];

/** Phase 1b (Execution Strategy) - now scoped to Epic */
export const ROBOT_ORDER_EPIC_STRATEGY = [
    "epic",      // Generates the epics (product level) but belongs in epic flow conceptually
    "feature",   // Epic-scoped
    "plan",      // Epic-scoped
    "priority",  // Epic-scoped
];

/** Phase 2 run order — execution definition (Epic-scoped) */
export const ROBOT_ORDER_PHASE_2 = [
    "user-stories",
    "scope-spec",
    "feasibility-tech",
    "feasibility-design",
    "customer-journeys",
    "data-privacy",
    "gtm-readiness",
    "risks-registry",
    "kpis",
    "daci-stakeholders",
];

/** All known robots in the system */
export const ALL_ROBOTS = [...ROBOT_ORDER_BUSINESS, ...ROBOT_ORDER_SYNTHESIS, ...ROBOT_ORDER_EPIC_STRATEGY, ...ROBOT_ORDER_PHASE_2];

/** Gate rule: Business robots that must be fresh before generating Epics */
export const BUSINESS_GATE_ROBOTS = ["scout", "detective", "people", "money"];

/** Gate rule: Strategy robots that must be fresh before Phase 2 for a specific Epic */
export const EPIC_GATE_ROBOTS = ["feature", "plan", "priority"];
