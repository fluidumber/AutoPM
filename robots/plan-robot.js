// plan-robot.js — Full Rewrite
class PlanRobot {
    constructor() {
        this.name = "Plan Robot 🗺️";
        this.job = "Product roadmap — phased 18-month plan with milestones, dependencies, success metrics";
        this.successCount = 0;
    }

    async analyze(enrichedContext) {
        process.stderr.write(`\n${this.name}: Preparing roadmap prompt...\n`);

        const context = typeof enrichedContext === "string"
            ? JSON.parse(enrichedContext)
            : enrichedContext;

        const timeline = context.answers?.timeline || "3-6 months";
        const stage = context.answers?.funding_stage || "early";
        const teamSize = context.answers?.team_size || "small";
        const techConstraints = context.answers?.tech_preferences || null;
        const revenueModel = context.answers?.revenue_model || "subscription";

        // Derive phase durations from stated timeline
        const phases = this._derivePhases(timeline, stage);

        const analysis = {
            productIdea: context.productIdea || context.summary,

            _claudeInstructions: {
                role: `You are Plan, a senior product strategist and engineering lead. Your job is to produce a realistic, stage-appropriate 18-month roadmap. You build from the feature list and context provided — deriving phase boundaries from the stated timeline and team constraints, not from a generic template.`,

                mandate: [
                    "Phase boundaries must reflect the ACTUAL stated timeline — if the PM said ASAP, Phase 1 is weeks not months",
                    "Features in each phase must come from the product context and pain points — not generic placeholders",
                    "Every phase must have a stated GOAL, a set of FEATURES, SUCCESS METRICS, and DEPENDENCIES",
                    "Account for team size and tech constraints when estimating phase duration",
                    "NEVER use placeholder features like 'Advanced features and integrations'",
                    "The roadmap must reflect the revenue model evolution — when does freemium convert to paid? When does the marketplace launch?",
                    "Flag risks to the plan: what could delay each phase and what is the mitigation?"
                ],

                buildContext: {
                    timeline: timeline,
                    stage: stage,
                    teamSize: teamSize,
                    techConstraints: techConstraints,
                    revenueModel: revenueModel,
                    derivedPhases: phases,
                    painPoint: context.answers?.pain_point,
                    differentiation: context.answers?.why_existing_fail,
                    segments: context.answers?.market_segment
                },

                requiredSections: {
                    phaseStructure: {
                        instructions: `Build ${phases.length} phases based on the derived timeline. For EACH phase:`,
                        perPhase: [
                            "Phase name and duration (in weeks/months — derived from context, not generic)",
                            "Strategic goal: what does this phase prove or achieve?",
                            "Feature list: specific features from the product context (not placeholders)",
                            "Success metrics: 2-3 measurable outcomes that define phase completion",
                            "Dependencies: what must be true before this phase can start?",
                            "Revenue milestone: what revenue model event happens in this phase?",
                            "Risk: the #1 thing that could delay this phase and the mitigation"
                        ],
                        phases: phases
                    },
                    criticalPath: {
                        instructions: "Identify the critical path across all phases — the sequence of decisions and builds that everything else depends on. What is the single highest-risk dependency in the entire plan?"
                    },
                    revenueModelTimeline: {
                        instructions: "Map the revenue model evolution onto the roadmap. When does each monetisation layer turn on?",
                        derivedFrom: revenueModel,
                        mustShow: [
                            "Freemium: when does it launch and what does it include?",
                            "First paid conversion: what triggers a user to upgrade?",
                            "Subscription: when is this introduced and for whom?",
                            "Marketplace/expert layer: what must be true for this to launch?",
                            "GenAI/token products: what infrastructure must exist first?"
                        ]
                    },
                    teamAndInfrastructure: {
                        instructions: "Based on team size and tech constraints, call out what the team needs to have or build to execute the plan.",
                        mustAddress: [
                            "What can the current team build vs. what needs to be hired or outsourced?",
                            "What technical infrastructure decisions must be made in Phase 1 that affect all future phases?",
                            "Any compliance, data privacy, or regulatory considerations for the geography?"
                        ]
                    },
                    northStarMetric: {
                        instructions: "Define the single North Star metric for this product — the one number that best captures the value being created and that the whole roadmap should optimise for."
                    }
                }
            },

            productContext: {
                idea: context.productIdea,
                timeline: timeline,
                stage: stage,
                teamSize: teamSize,
                techConstraints: techConstraints,
                revenueModel: revenueModel,
                painPoint: context.answers?.pain_point,
                differentiation: context.answers?.why_existing_fail,
                segments: context.answers?.market_segment,
                fullSummary: context.summary
            },

            outputFormat: {
                style: "Phase-by-phase narrative with structured attributes per phase",
                tables: "Gantt-style summary table: Phase | Duration | Goal | Key Features | Success Metric | Revenue Event",
                length: "Detailed enough for an engineering lead to start sprint planning from"
            }
        };

        this.successCount++;
        return analysis;
    }

    _derivePhases(timeline, stage) {
        const lower = (timeline || "").toLowerCase();

        // ASAP / immediate priority
        if (lower.includes("asap") || lower.includes("immediate") || lower.includes("week")) {
            return [
                { name: "Sprint MVP", duration: "Weeks 1-6", goal: "Core feature live and converting" },
                { name: "Depth & Trust", duration: "Months 2-4", goal: "Retention and segment expansion" },
                { name: "Career OS Loop", duration: "Months 4-8", goal: "Longitudinal engagement and subscription" },
                { name: "GenAI & Scale", duration: "Months 8-18", goal: "Token economy and marketplace at scale" }
            ];
        }

        // 3 month timeline
        if (lower.includes("3 month") || lower.includes("quarter")) {
            return [
                { name: "MVP", duration: "Months 1-3", goal: "Core value proposition live" },
                { name: "Growth", duration: "Months 4-6", goal: "Acquisition and retention mechanics" },
                { name: "Scale", duration: "Months 7-12", goal: "Revenue model expansion" },
                { name: "Platform", duration: "Months 12-18", goal: "Ecosystem and GenAI layer" }
            ];
        }

        // Default 4-phase 18-month plan
        return [
            { name: "Foundation", duration: "Months 1-3", goal: "MVP with core value proposition" },
            { name: "Traction", duration: "Months 4-6", goal: "Retention and first paid conversions" },
            { name: "Expansion", duration: "Months 7-12", goal: "Multi-segment and revenue model depth" },
            { name: "Scale", duration: "Months 12-18", goal: "Platform effects and GenAI layer" }
        ];
    }
}

export default PlanRobot;