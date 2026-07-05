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
                    "End with a cross-persona insight: what do ALL personas share that the product must address?",
                    "ALWAYS open with an evidence disclosure: these personas are derived from PM interview answers only — they are hypotheses to validate, not validated research",
                    "For each persona, list the 2-3 cheapest validation actions (interviews, surveys, landing-page tests) that would confirm or kill it",
                    "End the output with a machine-readable JSON verdict block in a ```json fence — it must be the VERY LAST element of the output"
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
                    evidenceDisclosure: {
                        instructions: "FIRST section — a prominent one-paragraph disclosure that these personas are synthesized from PM interview answers, not primary user research. State what first-party evidence exists in the context (if any) and what does not. The Synthesizer discounts unvalidated persona claims — honesty here protects the investment decision.",
                        placement: "Must appear before the first persona card"
                    },
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
                    },
                    validationPlan: {
                        instructions: "For each persona, list the 2-3 cheapest validation actions that would confirm or kill it (e.g. 5 problem interviews, a 50-response survey, a landing-page smoke test). For each action: what result confirms the persona, what result kills it, and roughly how long it takes."
                    },
                    machineReadableVerdict: {
                        instructions: "The VERY LAST element of your output must be a machine-readable verdict block in a ```json fence. The Synthesizer parses this block to build the investment decision — the analysis is incomplete without it.",
                        schema: {
                            robot: "people",
                            verdict: "RESONANT | PLAUSIBLE | SPECULATIVE",
                            userRelevanceScore: { low: "number 0-100", base: "number 0-100", high: "number 0-100" },
                            evidenceMaturityScore: { low: "number 0-100", base: "number 0-100", high: "number 0-100" },
                            evidenceTier: "pm-interview-derived",
                            personaCount: "number",
                            sharedMetaNeed: "string — the cross-persona insight",
                            topReasons: ["exactly 3 strings"],
                            biggestAssumption: "string — the persona assumption most likely to be wrong"
                        },
                        rules: [
                            "All scores must be JSON numbers, not strings",
                            "evidenceMaturityScore.base must NOT exceed 40 unless the context contains first-party user research (interviews, surveys, usage data) — interview-derived personas are hypotheses",
                            "Values must match the narrative exactly — no divergence between prose and JSON",
                            "The block must be the final element of the output so downstream parsers can find it"
                        ]
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
                htmlRequired: "IMPORTANT: You MUST generate your response as rich HTML in this chat window using white/light backgrounds (DO NOT use dark mode). Include HTML blocks with inline styles for all visual components. Plain markdown headings and bullets are fine for text content, but cards, badges, journey maps, and summary tables MUST be HTML with inline styles. RENDERING RULE: wrap EVERY multi-line HTML block and EVERY <script> block in a ```html fence — never emit multi-line raw HTML outside a fence, or the saved HTML file will break scripts. When you are done and call the 'save-robot-output' tool, you MUST pass this HTML into the 'htmlText' parameter, AND convert the content to pure, tag-free Markdown and pass it into the 'cleanMarkdown' parameter (but ALWAYS keep the final ```json verdict block in BOTH parameters).",
                audienceViews: {
                    instructions: "Structure the output in three audience layers, in this order. Same facts at different altitude — the layers must never contradict each other.",
                    executiveBriefing: "FIRST: a 60-second C-suite view — evidence disclosure, persona count, the shared meta-need in one sentence, and the summary table. No persona narratives.",
                    pmWorkingLayer: "MIDDLE: the full persona cards, buyer/user delta, journey map.",
                    analystAppendix: "LAST (before the JSON verdict block): the validation plan per persona and the assumptions each persona rests on."
                }
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