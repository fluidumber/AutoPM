// feature-robot.js — Full Rewrite
class FeatureRobot {
    constructor() {
        this.name = "Feature Robot 📝";
        this.job = "Feature breakdown — must-have, nice-to-have, future, with WHY and WHEN for each";
        this.successCount = 0;
    }

    async analyze(enrichedContext) {
        process.stderr.write(`\n${this.name}: Preparing feature breakdown prompt...\n`);

        const context = typeof enrichedContext === "string"
            ? JSON.parse(enrichedContext)
            : enrichedContext;

        const segments = this._deriveSegments(context.answers?.market_segment || "");
        const timeline = context.answers?.timeline || "3-6 months";
        const stage = context.answers?.funding_stage || "early";
        const painPoint = context.answers?.pain_point || "";
        const differentiation = context.answers?.why_existing_fail || "";

        const analysis = {
            productIdea: context.productIdea || context.summary,

            _claudeInstructions: {
                role: `You are Feature, a senior product manager with deep experience in feature scoping and MVP definition. Your job is to derive a specific, justified feature list from the product context. You reason from the pain points, segments, differentiation, and timeline provided. No web search needed — synthesise from context.`,

                mandate: [
                    "Generate 15-25 SPECIFIC features — not category labels or research questions",
                    "Each feature must have: a name, a 1-sentence description, WHY it matters (user value), and WHEN to build it (MVP / Growth / Scale)",
                    "NEVER list generic features like 'user authentication' or 'admin dashboard' unless they are genuinely differentiating for this product",
                    "Features must be derived from the pain points, differentiation, and segments in the context",
                    "Separate features by persona where the product serves multiple segments — some features serve parents, some serve institutes, some serve experts",
                    "The MVP feature set must be completable within the stated timeline",
                    "Flag features that are REQUIRED for the core value proposition vs. features that are ENHANCERS"
                ],

                productBuildingContext: {
                    painPoint: painPoint,
                    differentiation: differentiation,
                    segments: segments,
                    timeline: timeline,
                    stage: stage,
                    revenueModel: context.answers?.revenue_model,
                    techConstraints: context.answers?.tech_preferences
                },

                requiredSections: {
                    mustHaveFeatures: {
                        instructions: `Features required for MVP — the minimum set that delivers the core value proposition within the stated timeline (${timeline}). Without these, the product cannot launch.`,
                        featureStructure: {
                            name: "Specific feature name",
                            description: "One sentence: what it does",
                            whyItMatters: "User value: what problem does this solve for which persona?",
                            segment: "Which segment(s) this serves",
                            buildComplexity: "Low / Medium / High",
                            successMetric: "How will you know this feature is working?"
                        },
                        targetCount: "8-12 features"
                    },
                    niceToHaveFeatures: {
                        instructions: "Features that add depth and polish but are not required for launch. Build these in Phase 2.",
                        featureStructure: "Same as must-have",
                        targetCount: "5-8 features"
                    },
                    futureFeatures: {
                        instructions: "Features for Phase 3+ that require either scale data, GenAI infrastructure, or marketplace maturity to be meaningful.",
                        featureStructure: "Name + description + trigger condition (what needs to be true before this makes sense to build)",
                        targetCount: "4-6 features"
                    },
                    featuresBySegment: {
                        instructions: "For each distinct segment, identify the 2-3 features that are UNIQUE to their experience. These are the features that make the product feel purpose-built for each persona.",
                        segments: segments
                    },
                    mvpCriticalPath: {
                        instructions: "Given the must-have features, identify the critical path — what must be built before what? Which features have dependencies?",
                        output: "A simple ordered build sequence with dependency notes"
                    },
                    featureGapsVsCompetitors: {
                        instructions: "Based on the differentiation stated in context, identify 3-5 features that NO competitor currently offers well. These are the features that create the wedge.",
                        derivedFrom: differentiation
                    }
                }
            },

            productContext: {
                idea: context.productIdea,
                painPoint: painPoint,
                differentiation: differentiation,
                segments: segments,
                timeline: timeline,
                stage: stage,
                revenueModel: context.answers?.revenue_model,
                buyerVsUser: context.answers?.buyer_vs_user,
                fullSummary: context.summary
            },

            outputFormat: {
                style: "Structured feature cards grouped by phase, then by segment. Use rich HTML with inline styles for visual elements.",
                tables: "Summary table: use a rich HTML table with styled headers (background colors), alternating row shading, and complexity badges (Low=green, Medium=yellow, High=red) for: Feature | Phase | Segment | Complexity | Success Metric",
                length: "Complete — a PM should be able to hand this directly to engineering for scoping",
                htmlRequired: "Your output will be saved as both .md and .html files. Include raw HTML blocks with inline styles for: (1) feature card blocks with colored priority badges, (2) complexity and phase tag badges, (3) the summary table. Plain markdown is fine for narrative text, but all tables, feature badges, and groupings MUST be HTML with inline styles."
            }
        };

        this.successCount++;
        return analysis;
    }

    _deriveSegments(segmentAnswer) {
        const lower = segmentAnswer.toLowerCase();
        const segments = [];
        if (lower.includes("b2c")) segments.push("B2C (direct consumer)");
        if (lower.includes("b2b2c")) segments.push("B2B2C (expert/reseller)", "B2B2C (end user)");
        else if (lower.includes("b2b")) segments.push("B2B (institutional)");
        if (segments.length === 0) segments.push("Primary segment");
        return segments;
    }
}

export default FeatureRobot;