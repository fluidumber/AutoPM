// money-robot.js — Full Rewrite
class MoneyRobot {
    constructor() {
        this.name = "Money Robot 💰";
        this.job = "Financial projections — unit economics, revenue models, 3-scenario forecast";
        this.successCount = 0;
    }

    async analyze(enrichedContext) {
        process.stderr.write(`\n${this.name}: Preparing financial model prompt...\n`);

        const context = typeof enrichedContext === "string"
            ? JSON.parse(enrichedContext)
            : enrichedContext;

        const pricingData = context.answers?.willingness_to_pay || null;
        const revenueModel = context.answers?.revenue_model || "subscription";
        const stage = context.answers?.funding_stage || "early";
        const segments = context.answers?.market_segment || "B2C";
        const geography = context.answers?.target_geo || "India";

        const analysis = {
            productIdea: context.productIdea || context.summary,

            _claudeInstructions: {
                role: `You are Money, a Series A CFO and former VC analyst. Your job is to build a grounded, stage-appropriate financial model from the product context. You reason from first principles — using the pricing data, segments, and revenue model provided. Use web_search only if you need to validate CAC benchmarks or competitor pricing that wasn't provided.`,

                mandate: [
                    "Derive all numbers from the context provided — do not use generic SaaS benchmarks without justification",
                    "Build THREE scenarios: Conservative, Base, Optimistic — with different assumptions clearly stated for each",
                    "All currency in INR unless the product is explicitly targeting global markets",
                    "NEVER use placeholder values like '$X' or 'Calculate based on retention'",
                    "Call out your assumptions explicitly — a model is only as good as its assumptions",
                    "Stage-calibrate the model: a bootstrapped early-stage product has different CAC/LTV dynamics than a Series A company",
                    "End with the ONE financial metric that matters most right now given the stage"
                ],

                knownFinancialContext: {
                    pricingData: pricingData,
                    revenueModel: revenueModel,
                    stage: stage,
                    segments: segments,
                    geography: geography,
                    timeline: context.answers?.timeline || "3-6 months",
                    teamSize: context.answers?.team_size || "small"
                },

                requiredSections: {
                    revenueModelAnalysis: {
                        instructions: "Analyse the revenue model(s) stated in context. For each model type:",
                        mustInclude: [
                            "How this model works for this specific product",
                            "The right price point derived from willingness-to-pay data provided",
                            "The sequencing logic if multiple models coexist (which comes first and why)",
                            "Gross margin implication of each model"
                        ]
                    },
                    unitEconomics: {
                        instructions: "Derive unit economics per segment. If multiple segments, do this per segment.",
                        perSegment: [
                            "Average Revenue Per User/Account (ARPU/ARPA) — derive from pricing data",
                            "Customer Acquisition Cost (CAC) — estimate from channel and stage",
                            "Payback period (months to recover CAC)",
                            "Lifetime Value (LTV) — based on retention assumption, state the assumption",
                            "LTV:CAC ratio and what it signals",
                            "Gross margin % and what drives it"
                        ]
                    },
                    threeScenarioModel: {
                        instructions: "Build conservative / base / optimistic projections for Year 1, 2, 3.",
                        structure: {
                            conservative: "Slow acquisition, lower conversion, single segment focus",
                            base: "Expected trajectory based on context provided",
                            optimistic: "Multiple segments firing, strong word-of-mouth, expert marketplace scaling"
                        },
                        metricsPerScenario: [
                            "Number of customers/accounts per segment",
                            "ARR at end of Year 1, 2, 3",
                            "Burn rate assumption (bootstrapped = near zero)",
                            "Break-even point"
                        ]
                    },
                    recommenderFeatureImpact: {
                        instructions: "Specifically model the financial impact of the package recommender feature being built.",
                        mustQuantify: [
                            "Estimated conversion rate lift (browse to purchase) — state assumption",
                            "Estimated AOV increase from right-sized package selection",
                            "Reduction in support cost from decision clarity",
                            "Combined revenue impact in Year 1"
                        ]
                    },
                    keyMetricToWatch: {
                        instructions: "Given the stage, identify the ONE metric that matters most right now.",
                        reasoning: "At bootstrapped early-user stage, vanity metrics don't matter. What is the leading indicator of product-market fit for this specific business?"
                    }
                }
            },

            productContext: {
                idea: context.productIdea,
                pricingData: pricingData,
                revenueModel: revenueModel,
                stage: stage,
                segments: segments,
                geography: geography,
                timeline: context.answers?.timeline,
                teamSize: context.answers?.team_size,
                fullSummary: context.summary
            },

            outputFormat: {
                style: "Structured narrative with explicit assumption callouts, then tables for numbers",
                currency: geography.toLowerCase().includes("india") ? "INR" : "USD",
                tables: "Use tables for: unit economics per segment, 3-scenario ARR projection, recommender feature impact",
                assumptions: "Box or callout every assumption clearly — 'Assumption: 3% monthly churn based on [reason]'"
            }
        };

        this.successCount++;
        return analysis;
    }
}

export default MoneyRobot;