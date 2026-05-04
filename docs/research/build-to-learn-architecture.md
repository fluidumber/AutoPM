# ProductFlow: "Build to Learn" Architectural Discovery

**Date:** 2026-05-02
**Context:** Synthesis of SVPG "Build to Learn" philosophy with the current ProductFlow robot architecture.

## 1. Core Goal
Transition ProductFlow from a static "Product Definition Document (PDD) Generator" to a dynamic **Product Discovery Engine**. The system must explicitly handle uncertainty, multiple parallel solutions, and external feedback, mapping to the four key product risks: Value, Usability, Feasibility, and Viability.

## 2. Architectural Pillar 1: The Tributary & Distributary Validation Loop
Instead of assuming the Product Manager arrives with all validation completed, the system will act as a partner in executing research.

*   **The Tributary (Ingestion):** 
    *   Expand `ContextStore` and `WorkspaceManager` to accept raw external research (e.g., user interview transcripts, survey CSVs, PDF reports).
    *   Introduce a new ingestion module or robot (e.g., `ResearchRobot`) to process unstructured research data and feed it into the `BrainDatabase` as foundational context.
*   **The Distributary (Actionable Output):** 
    *   `PlanRobot` or a new `ValidationRobot` outputs a "Validation Plan" before Phase 1 is finalized. 
    *   This plan highlights the biggest "leaps of faith" and generates user interview scripts or surveys for the PM to execute.
*   **The Feedback Loop:** 
    *   The PM runs the external tests and feeds the notes back into the system. The `FreshnessTracker` triggers a re-evaluation of assumptions to make the PDD robust.

## 3. Architectural Pillar 2: Multi-Solution Prototyping & Experiment Clusters
Shift from generating a single definitive path of user stories to modeling multiple realities and testing them.

*   **Experiment Clusters (Divergence):** 
    *   Refactor `FeatureRobot` and `UserStoriesRobot` to output an **Experiment Matrix**.
    *   Example: Instead of one checkout flow, it generates Solution A (High automation) and Solution B (High control), complete with distinct user story clusters.
*   **The Prototyping Call:** 
    *   Introduce a `PrototypeRobot` that leverages MCP to call out to design/wireframing tools (e.g., Figma APIs, v0, Claude Artifacts) to generate low-fidelity prototypes for the different solution clusters.
*   **Convergence & Synthesis:** 
    *   An `ExperimentAnalysisRobot` ingests the A/B testing or user feedback data from the prototypes.
    *   It prunes the losing branches and synthesizes the winning elements into a final validated spec.
    *   Only *after* convergence does the `PDDComposer` generate the final engineering handoff document.

## 4. Next Steps for Implementation
- [ ] Define the data schema in `ContextStore` for raw external research ingestion.
- [ ] Modify `UserStoriesRobot` output structure to support an array of "Solution Clusters" instead of a flat list.
- [ ] Investigate MCP design tool integrations for the future `PrototypeRobot`.
