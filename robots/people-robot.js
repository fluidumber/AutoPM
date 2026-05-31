// people-robot.js — Full Rewrite
class PeopleRobot {
    constructor() {
        this.name = "People Robot 👥";
        this.job = "User personas — segments, pain points, motivations, buying triggers";
        this.successCount = 0;
    }

    async analyze(enrichedContext) {
        process.stderr.write(`\n${this.name}: Preparing persona synthesis prompt...\n`);

        const context = typeof enrichedContext === "string"
            ? JSON.parse(enrichedContext)
            : enrichedContext;

        const segmentCount = context.robotHints?.people?.segmentCount || 1;
        const segments = this._deriveSegments(context.answers?.market_segment || "");

        const analysis = {
            productIdea: context.productIdea || context.summary,

            _claudeInstructions: {
                role: `You are People, a principal user researcher. Your job is to build vivid, specific, actionable user personas from the product context provided. You do NOT need to do web research — synthesise directly from the context. Your personas must feel like real people, not demographic abstractions.`,

                mandate: [
                    "Build ONE persona per distinct segment — do not merge different buyers into one persona",
                    "Each persona must have a name, a specific life situation, and a narrative — not just a list of attributes",
                    "Pain points must be derived from the context provided — not generic category complaints",
                    "NEVER use placeholder names like 'Research actual user type'",
                    "Every persona must include: what triggers them to seek a solution, what makes them hesitate, and what makes them commit",
                    "The buyer/user split (when different people) must be reflected — build personas for both where relevant",
                    "End with a cross-persona insight: what do ALL personas share that the product must address?"
                ],

                segmentsToAddress: segments,

                perPersonaStructure: {
                    header: "Name (fictional but realistic), age, city, occupation",
                    situation: "2-3 sentence narrative of their life situation that creates the need for this product",
                    painPoints: [
                        "Primary pain: the core problem they face (derived from interview context)",
                        "Secondary pain: the friction they hit trying to solve it today",
                        "Emotional pain: how this problem makes them feel (frustrated, embarrassed, anxious?)"
                    ],
                    currentBehavior: "What do they do TODAY to cope with this problem? Be specific.",
                    motivations: "What does success look like for them? What would make them feel good about this purchase?",
                    buyingTrigger: "The specific moment or event that makes them start looking for a solution",
                    hesitations: "Top 2 objections they would have before buying",
                    commitmentFactor: "The ONE thing that would make them say yes",
                    quote: "A single fictional but realistic quote this persona might say about the problem"
                },

                additionalSections: {
                    buyerUserDelta: {
                        instructions: "Where the buyer and end user are different people, analyse the tension between their needs. What does the buyer care about that the user doesn't? What does the user need that the buyer undervalues?",
                        applyWhen: context.answers?.buyer_vs_user?.toLowerCase().includes("different") || segmentCount > 1
                    },
                    crossPersonaInsight: {
                        instructions: "After all personas, identify what they all share — the meta-need the product must address regardless of segment. This becomes the product's core value proposition.",
                        mustBeSpecific: true
                    },
                    personaJourneyMap: {
                        instructions: "For the PRIMARY persona, sketch a simple 5-stage journey: Trigger → Awareness → Consideration → Decision → Post-purchase. At each stage: what are they thinking, feeling, and doing?"
                    }
                }
            },

            productContext: {
                idea: context.productIdea,
                segments: context.answers?.market_segment,
                buyerVsUser: context.answers?.buyer_vs_user,
                painPoint: context.answers?.pain_point,
                willingnessToPay: context.answers?.willingness_to_pay,
                geography: context.answers?.target_geo,
                whyExistingFail: context.answers?.why_existing_fail,
                revenueModel: context.answers?.revenue_model,
                stage: context.answers?.funding_stage,
                fullSummary: context.summary
            },

            outputFormat: {
                style: "Rich HTML persona cards. Each persona MUST be wrapped in a styled <div> card with: (1) a circular avatar badge showing initials (colored background, white text), (2) name and demographics in a flex header, (3) colored role/monetisation badges as inline <span> tags, (4) a styled blockquote for the persona quote. Journey map MUST be a horizontal flow of styled stage cards with colored headers (Trigger=red, Awareness=yellow, Consideration=green, Decision=blue, Post-purchase=purple). Use inline CSS styles on all elements — no external classes.",
                length: "One full persona card per segment — rich enough to use in a design sprint",
                tables: "Use a rich HTML summary table at the end with alternating row colors: Persona | Primary Pain | Buying Trigger | Key Objection | Commitment Factor | Monetisation Role",
                htmlRequired: "Your output will be saved as both .md and .html files. Include raw HTML blocks with inline styles for all visual components. Plain markdown headings and bullets are fine for text content, but cards, badges, journey maps, and summary tables MUST be HTML with inline styles."
            }
        };

        this.successCount++;
        return analysis;
    }

    _deriveSegments(segmentAnswer) {
        const lower = segmentAnswer.toLowerCase();
        const segments = [];
        if (lower.includes("b2c")) segments.push({ type: "B2C", description: "Direct consumer buyer" });
        if (lower.includes("b2b2c")) segments.push(
            { type: "B2B2C Reseller", description: "Expert/intermediary who resells or recommends" },
            { type: "B2B2C End User", description: "The consumer the expert serves" }
        );
        else if (lower.includes("b2b")) segments.push({ type: "B2B", description: "Institutional/business buyer" });
        if (segments.length === 0) segments.push({ type: "Primary", description: "Main user segment" });
        return segments;
    }
}

export default PeopleRobot;