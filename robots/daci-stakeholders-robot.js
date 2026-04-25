// DaciStakeholdersRobot — Phase 2 execution robot.
//
// Produces the DACI table, key contacts list, and PDD section status tracker.
//
// This robot is unique: it has a "load and confirm" flow rather than
// "generate from scratch". If context/daci.json already exists (loaded by
// _buildPhase2Context into phase2Context.daciData), the robot presents the
// existing DACI to the PM for confirmation and asks "has anything changed?"
// If no daci.json exists, it generates a first-pass DACI from interview
// context and asks the PM to confirm before persisting.
//
// The section status tracker is derived automatically from which Phase 2 robot
// output files exist in phase1Outputs (populated by _buildPhase2Context).
//
// Input:  enrichedContext with phase2Context.daciData + phase2Context (owner info)
//         + interview answers (for product name, team, buyer/user)
// Output: _claudeInstructions payload — Claude generates the DACI JSON

/**
 * @typedef {Object} DaciPerson
 * @property {string} name - Person's name or role placeholder
 * @property {string} role - Their role/title
 */

/**
 * @typedef {Object} KeyContact
 * @property {string} name    - Contact name
 * @property {string} role    - Contact role
 * @property {string} company - Company or team
 * @property {string} email   - Email address or placeholder
 */

/**
 * @typedef {Object} SectionStatus
 * @property {string}  section       - PDD section name
 * @property {boolean} draftComplete - Has the draft been generated?
 * @property {boolean} finalComplete - Has the PM marked this final?
 */

/**
 * @typedef {Object} EnrichedContext
 * @property {string} productIdea   - Product name or one-line description
 * @property {Object} answers       - Interview answer map
 * @property {string} [summary]     - Product summary
 * @property {Object} [phase1Outputs] - Loaded robot output text (all phases)
 * @property {Object} [phase2Context] - Phase 2 manifest (includes daciData, owner)
 */

/**
 * @typedef {Object} DaciStakeholdersOutput
 * @property {string}   productIdea         - Echoed from input
 * @property {Object}   _claudeInstructions - Prompt payload for Claude
 */

class DaciStakeholdersRobot {
    constructor() {
        this.name = "DACI Stakeholders Robot";
        this.successCount = 0;
    }

    /**
     * Build the Claude prompt payload for DACI + stakeholder generation.
     *
     * @param {EnrichedContext|string} enrichedContext
     * @returns {Promise<DaciStakeholdersOutput>}
     */
    async analyze(enrichedContext) {
        process.stderr.write(`\n${this.name}: Preparing DACI + stakeholders prompt...\n`);

        // Double-parse guard
        const context = typeof enrichedContext === "string"
            ? JSON.parse(enrichedContext)
            : enrichedContext;

        const phase2Notes    = context.phase2Context || {};
        const existingDaci   = phase2Notes.daciData || null;
        const ownerInfo      = phase2Notes.owner || {};
        const isFirstRun     = !existingDaci;
        const sectionStatus  = this._deriveSectionStatus(context);

        const analysis = {
            productIdea: context.productIdea || context.summary || "Unknown product",

            _claudeInstructions: {
                role: "You are a senior product manager responsible for stakeholder alignment and PDD governance. Your job is to produce an accurate DACI table, key contacts list, and PDD section status tracker — either confirming existing data or generating a first-pass DACI for PM review.",

                mandate: [
                    isFirstRun
                        ? "FIRST RUN — GENERATE AND ASK: No existing DACI data found. Generate a first-pass DACI from the product context and interview answers. Then output a clear 'PM Confirmation Required' section listing every DACI slot and key contact where you used a placeholder — the PM must confirm names and emails before this data is persisted."
                        : "RETURNING RUN — CONFIRM AND UPDATE: Existing DACI data is loaded below. Present a diff summary: what is confirmed unchanged, what may need updating (e.g. roles that look stale), and what is missing. Ask the PM to confirm or correct each slot. Do not silently overwrite existing data.",
                    "DACI LOGIC: Driver = the PM or DRI who is running this product day-to-day (one person). Approver = the executive who must sign off before launch (one person). Contributors = engineers, designers, data, legal, compliance, security who are actively building or reviewing. Informed = stakeholders who need to be kept in the loop but don't block decisions.",
                    "DERIVE FROM CONTEXT: Driver and Approver should be inferred from the pm-profile owner field and interview answers. Contributors should reference the team size and roles mentioned in interview answers. Informed should include stakeholders implied by the market segment (e.g. enterprise B2B typically involves Sales, Customer Success, Legal).",
                    "KEY CONTACTS COMPLETENESS: List every person who needs to be contactable for this PDD — PM owner, approver, key engineers, design lead, legal/compliance contact, sales/CSM contact. Use placeholders for unknown contacts but flag them clearly.",
                    "SECTION STATUS TRACKER: The status of each PDD section is derived from which robot outputs exist. Use the section status data provided — do not guess. Sections with existing robot outputs are 'draft complete'. Sections not yet generated are incomplete.",
                    "NO FABRICATION: Do not invent names, emails, or roles. Use placeholders like '[PM Name — confirm]' or '[Legal Contact — TBD]' for unknown slots. The PM will fill these in.",
                    "PERSIST INSTRUCTIONS: After generating the output, include a 'Persist Instructions' field telling the PM: 'Review the DACI and key contacts. If correct, your tooling will save this to context/daci.json for future runs. If anything needs correction, provide the corrections and re-run this robot.'",
                ],

                requiredSections: {
                    daciSummary: {
                        instructions: isFirstRun
                            ? "Generate a first-pass DACI from the product context. Use owner info from the Phase 2 manifest where available. Mark unknown slots as '[Name — confirm]'."
                            : "Summarise the existing DACI: what is confirmed, what may be stale, what is missing. Present as a brief diff (3-5 bullets).",
                    },
                    daci: {
                        instructions: "The full DACI table. One Driver, one Approver, multiple Contributors, multiple Informed.",
                        outputShape: {
                            driver:       { name: "string", role: "string" },
                            approver:     { name: "string", role: "string" },
                            contributors: [{ name: "string", role: "string" }],
                            informed:     [{ name: "string", role: "string" }],
                        },
                    },
                    keyContacts: {
                        instructions: "All contacts needed for this PDD. Include PM, approver, key engineers, design lead, legal/compliance, sales/CSM. Use placeholders for unknowns.",
                        outputShape: [{
                            name:    "string — real name or '[Role — confirm]' placeholder",
                            role:    "string",
                            company: "string — team name or company",
                            email:   "string — real email or '[email — TBD]'",
                        }],
                    },
                    sectionStatus: {
                        instructions: "Status of every PDD section. Derived from which robot outputs exist. Draft complete = robot has been run. Final complete = PM has approved (always false until PM marks it).",
                        outputShape: [{
                            section:       "string — PDD section name",
                            draftComplete: "boolean",
                            finalComplete: "boolean",
                        }],
                    },
                    pmConfirmationRequired: {
                        instructions: "List every DACI slot and key contact where a placeholder was used. The PM must confirm these before the data is saved as authoritative.",
                        outputShape: ["string — '[Slot name]: currently [placeholder] — please confirm'"],
                    },
                    persistInstructions: {
                        instructions: "A short note to the PM: what to do next — review the DACI, confirm placeholders, and how to save it to daci.json.",
                    },
                },

                productContext: {
                    productIdea:    context.productIdea || context.summary || null,
                    teamSize:       context.answers?.team_size || null,
                    buyerVsUser:    context.answers?.buyer_vs_user || null,
                    marketSegment:  context.answers?.market_segment || null,
                    ownerInfo,
                    existingDaci:   existingDaci || "None — first run",
                    isFirstRun,
                    sectionStatus,
                    phase2Notes:    Object.keys(phase2Notes).length > 0
                        ? { ...phase2Notes, daciData: undefined } // strip daciData — already in existingDaci
                        : null,
                },

                outputFormat: {
                    description: "Return a single JSON object. No markdown fences. No commentary outside the JSON.",
                    schema: {
                        daciSummary:             "string — first-run generation summary or returning-run diff",
                        daci: {
                            driver:       { name: "string", role: "string" },
                            approver:     { name: "string", role: "string" },
                            contributors: [{ name: "string", role: "string" }],
                            informed:     [{ name: "string", role: "string" }],
                        },
                        keyContacts:             [{ name: "string", role: "string", company: "string", email: "string" }],
                        sectionStatus:           [{ section: "string", draftComplete: "boolean", finalComplete: "boolean" }],
                        pmConfirmationRequired:  ["string"],
                        persistInstructions:     "string — what the PM should do next",
                    },
                    critical: "The JSON object is the complete deliverable. Output ONLY the JSON.",
                },
            },
        };

        this.successCount++;
        return analysis;
    }

    // ── Private helpers ────────────────────────────────────────────────

    /**
     * Derive PDD section status from which robot outputs are present
     * in phase1Outputs (populated by _buildPhase2Context for all phases).
     *
     * @param {EnrichedContext} context
     * @returns {SectionStatus[]}
     */
    _deriveSectionStatus(context) {
        const outputs = context.phase1Outputs || {};

        // Map PDD sections to the robot outputs that produce them
        const sectionMap = [
            { section: "Feature Overview & Executive Summary", robots: ["scout", "people"] },
            { section: "Scope and Specifications",             robots: ["scope-spec"] },
            { section: "User Stories",                         robots: ["user-stories"] },
            { section: "Customer Journeys",                    robots: ["customer-journeys"] },
            { section: "Technical Feasibility",                robots: ["feasibility-tech"] },
            { section: "Design Feasibility",                   robots: ["feasibility-design"] },
            { section: "Competitor Analysis",                  robots: ["detective"] },
            { section: "Roadmap & Timeline",                   robots: ["plan"] },
            { section: "Data Privacy",                         robots: ["data-privacy"] },
            { section: "GTM Readiness",                        robots: ["gtm-readiness"] },
            { section: "Risks Registry",                       robots: ["risks-registry"] },
            { section: "Success Metrics & KPIs",               robots: ["kpis"] },
            { section: "DACI & Stakeholders",                  robots: ["daci-stakeholders"] },
        ];

        return sectionMap.map(({ section, robots }) => ({
            section,
            draftComplete: robots.some(r => !!outputs[r]),
            finalComplete: false, // PM marks this manually
        }));
    }
}

export default DaciStakeholdersRobot;
