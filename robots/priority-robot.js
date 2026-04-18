// priority-robot.js — Full Rewrite
class PriorityRobot {
    constructor() {
        this.name = "Priority Robot ⭐";
        this.job = "Feature prioritisation — RICE scoring with reasoning for each dimension";
        this.successCount = 0;
    }

    async analyze(enrichedContext) {
        process.stderr.write(`\n${this.name}: Preparing RICE scoring prompt...\n`);

        const context = typeof enrichedContext === "string"
            ? JSON.parse(enrichedContext)
            : enrichedContext;

        const timeline = context.answers?.timeline || "3-6 months";
        const stage = context.answers?.funding_stage || "early";
        const segments = context.answers?.market_segment || "";
        const painPoint = context.answers?.pain_point || "";

        const analysis = {
            productIdea: context.productIdea || context.summary,

            _claudeInstructions: {
                role: `You are Priority, a data-driven senior PM who lives by evidence-based prioritisation. Your job is to score 20-30 features using RICE and produce a ranked, actionable build order. You derive features from the product context and score them using principled reasoning — not gut feel or generic rules.`,

                mandate: [
                    "Derive 20-30 features yourself from the product context — do not wait to be given a feature list",
                    "Score EVERY feature on all four RICE dimensions with explicit reasoning for each score",
                    "RICE = (Reach × Impact × Confidence) ÷ Effort — higher score = higher priority",
                    "Reach: % of total users affected per quarter (0-100 expressed as 1-10 scale)",
                    "Impact: value delivered per user (1=minimal, 10=massive)",
                    "Confidence: how certain are you about Reach and Impact estimates (1-10)",
                    "Effort: person-months to build (1=days, 10=quarters) — LOWER effort = HIGHER score",
                    "NEVER use string values for RICE scores — all four dimensions must be numbers",
                    "Group the output: Top MVP priorities, Phase 2 priorities, Future backlog",
                    "Call out any features where RICE score is high but sequencing dependency forces it later",
                    "End with a 'Build this week' recommendation — the single highest-impact action right now"
                ],

                scoringContext: {
                    timeline: timeline,
                    stage: stage,
                    segments: segments,
                    painPoint: painPoint,
                    differentiation: context.answers?.why_existing_fail,
                    revenueModel: context.answers?.revenue_model,
                    teamSize: context.answers?.team_size || "small",
                    fullSummary: context.summary
                },

                riceScoringInstructions: {
                    reachGuidance: "Reach = what % of your total user base will this feature touch in a quarter? Express as 1-10 where 10=100% of users. For multi-segment products, consider which segments the feature serves.",
                    impactGuidance: "Impact = how much does this move the needle per user? Score: 1=minimal, 2=low, 4=medium, 8=high, 10=massive. Focus on conversion, retention, or revenue impact.",
                    confidenceGuidance: "Confidence = how certain are you about Reach and Impact? 10=data-backed, 7=strong signal, 5=educated guess, 3=uncertain. Be honest — overconfident scoring distorts prioritisation.",
                    effortGuidance: "Effort = total person-months. Score 1-10 where 1=days, 3=1 week, 5=1 month, 7=1 quarter, 10=6+ months. For a small team, calibrate accordingly.",
                    formula: "RICE Score = (Reach × Impact × Confidence) ÷ Effort. Calculate this for every feature."
                },

                requiredSections: {
                    fullRiceTable: {
                        instructions: "Score all 20-30 features. For each feature provide a 1-sentence reasoning for EACH of the four dimension scores.",
                        columns: ["Rank", "Feature", "Reach (1-10)", "Impact (1-10)", "Confidence (1-10)", "Effort (1-10)", "RICE Score", "Phase"]
                    },
                    mvpBundle: {
                        instructions: "From the top RICE scores, identify the minimum feature bundle for MVP launch within the stated timeline. These are the features with the highest scores AND no blocking dependencies.",
                        mustInclude: "Estimated total effort in person-weeks for this bundle"
                    },
                    sequencingOverrides: {
                        instructions: "Identify any features where RICE score is high but must be built LATER due to dependencies. Explain the dependency and when the blocker resolves."
                    },
                    quickWins: {
                        instructions: "Identify 3-5 'quick wins' — features with medium RICE scores but very low effort (score 1-2). These can be built in parallel with high-effort features for early user value.",
                    },
                    buildThisWeek: {
                        instructions: "Based on the RICE analysis, what is the single highest-priority action for the team right now? Be specific: name the feature, explain why it ranks first, and describe what 'done' looks like."
                    }
                }
            },

            productContext: {
                idea: context.productIdea,
                timeline: timeline,
                stage: stage,
                segments: segments,
                painPoint: painPoint,
                differentiation: context.answers?.why_existing_fail,
                revenueModel: context.answers?.revenue_model,
                teamSize: context.answers?.team_size,
                fullSummary: context.summary
            },

            outputFormat: {
                style: "Full RICE table first, then narrative sections for MVP bundle, sequencing overrides, quick wins, and build recommendation",
                tables: "RICE scoring table is mandatory — all rows must have numeric scores",
                length: "Complete — this should be directly usable as a sprint planning input"
            }
        };

        this.successCount++;
        return analysis;
    }
}

export default PriorityRobot;