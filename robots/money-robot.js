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
                    "End with the ONE financial metric that matters most right now given the stage",
                    "CRITICAL: You MUST FIRST call the 'save-robot-output' tool with the complete markdown analysis. This is non-negotiable for Phase 2 progression.",
                    "AFTER saving the markdown, you MUST generate the editable Excel workbook (.xlsx) by using your Python environment to write a script with openpyxl/pandas that compiles the assumptions, scenarios, and unit economics, then call the 'save-artifact' tool with the base64-encoded content named 'YYYY-MM-DD-money-model.xlsx'."
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
                        instructions: "Derive unit economics per segment. If multiple segments, do this per segment. Produce a markdown table.",
                        perSegment: [
                            "Average Revenue Per User/Account (ARPU/ARPA) — derive from pricing data",
                            "Customer Acquisition Cost (CAC) — estimate from channel and stage, cite benchmark source",
                            "Payback period (months to recover CAC)",
                            "Lifetime Value (LTV) — based on churn/retention assumption, state it explicitly",
                            "LTV:CAC ratio — flag if < 3x (warning) or > 5x (healthy)",
                            "Gross margin % and the primary drivers",
                            "Gross Profit in Year 1 (revenue × gross margin)"
                        ]
                    },
                    saasHealthMetrics: {
                        instructions: "Produce the SaaS health dashboard for this product. All metrics per scenario (conservative / base / optimistic). Produce a markdown table.",
                        metrics: [
                            "ARR (Annual Recurring Revenue) at end of Year 1, 2, 3",
                            "NRR (Net Revenue Retention) — expansion + contraction + churn, target > 100%",
                            "GRR (Gross Revenue Retention) — churn only, target > 85%",
                            "Gross Profit margin % at Year 1 and Year 3",
                            "EBITDA margin % at Year 3 (state burn-rate assumption)"
                        ]
                    },
                    threeScenarioModel: {
                        instructions: "Build conservative / base / optimistic projections for Year 1, 2, 3. Produce a summary table then narrative per scenario.",
                        structure: {
                            conservative: "Slow acquisition, lower conversion, single segment focus",
                            base: "Expected trajectory based on context provided",
                            optimistic: "Multiple segments firing, strong word-of-mouth, network effects"
                        },
                        metricsPerScenario: [
                            "Number of customers/accounts per segment",
                            "ARR at end of Year 1, 2, 3",
                            "NRR at Year 2 and Year 3",
                            "GRR at Year 2 and Year 3",
                            "Gross Profit at Year 1 and Year 3",
                            "EBITDA at Year 3",
                            "Burn rate assumption (bootstrapped = near zero)",
                            "Break-even point (month)"
                        ]
                    },
                    advancedProjections: {
                        instructions: "Stage-appropriate advanced projections. Omit any metric that is not meaningful at the current funding stage — explain why.",
                        metrics: [
                            "NPV (Net Present Value) of 3-year cashflow — use 10% discount rate, state assumption",
                            "IRR (Internal Rate of Return) — relevant if external capital is deployed",
                            "CAC Payback Period trend (Year 1 → Year 3)",
                            "LTV:CAC trend (Year 1 → Year 3) — flag if deteriorating"
                        ]
                    },
                    keyFeatureImpact: {
                        instructions: "Identify the single most revenue-critical feature from the product context and model its financial impact.",
                        mustQuantify: [
                            "Estimated conversion rate lift — state assumption",
                            "Estimated revenue increase from this feature alone",
                            "Reduction in churn or support cost, if applicable",
                            "Combined revenue impact in Year 1"
                        ]
                    },
                    keyMetricToWatch: {
                        instructions: "Given the stage, identify the ONE metric that matters most right now.",
                        reasoning: "At bootstrapped early-user stage, vanity metrics don't matter. What is the leading indicator of product-market fit for this specific business?"
                    },
                    chartSpecifications: {
                        instructions: "After completing all tables, produce TWO Vega-Lite 5 JSON chart specifications. Each spec must be wrapped in a ```json code block. Both charts must use data.values arrays populated with the actual numbers from your analysis above — never use placeholder values.",
                        charts: [
                            {
                                id: "arr-growth-chart",
                                type: "Multi-series line chart",
                                title: "ARR Growth — 3 Scenarios (Year 1–3)",
                                requiredFields: "$schema (vega-lite v5), title, mark: line, encoding.x (year), encoding.y (ARR value), encoding.color (scenario), data.values with conservative/base/optimistic rows"
                            },
                            {
                                id: "unit-economics-chart",
                                type: "Grouped bar chart",
                                title: "Unit Economics: LTV vs CAC by Segment",
                                requiredFields: "$schema (vega-lite v5), title, mark: bar, encoding.x (segment), encoding.y (value), encoding.color (metric: LTV or CAC), data.values with actual LTV and CAC per segment"
                            }
                        ],
                        vegaLiteSchemaUrl: "https://vega.github.io/schema/vega-lite/v5.json"
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
                style: "Structured narrative with explicit assumption callouts, then tables for numbers, then Vega-Lite chart specs. Use rich HTML with inline styles for visual elements.",
                currency: geography.toLowerCase().includes("india") ? "INR" : "USD",
                tables: "Use rich HTML tables with styled headers (background colors for column groups), alternating row shading, and bold cells for: TAM/SAM/SOM, unit economics, SaaS health metrics, 3-scenario ARR projection, advanced projections, and feature impact",
                assumptions: "Box or callout every assumption clearly — use a styled HTML div card with a left border color matching the scenario (e.g., green for Optimistic, amber for Base, red for Conservative) and inline CSS",
                charts: "After all tables, produce exactly 2 Vega-Lite 5 JSON specs in ```json code blocks: (1) ARR growth line chart, (2) LTV vs CAC bar chart. Use actual numbers from the analysis — never placeholders.",
                length: "Comprehensive — financial models require depth. Do not truncate tables or omit scenarios.",
                htmlRequired: "Your output will be saved as both .md and .html files. Include raw HTML blocks with inline styles for: (1) metric highlight cards at the top (ARR, LTV:CAC, payback period), (2) scenario assumption cards with colored borders, (3) all tables. Plain markdown is fine for narrative text, but all tables, metrics highlights, and callouts MUST be HTML with inline styles.",
                excelRequired: "You MUST FIRST use the 'save-robot-output' tool to save the markdown analysis. Then, you MUST use your Python environment to programmatically build a real multi-tab Excel workbook named 'YYYY-MM-DD-money-model.xlsx' containing assumptions, projections, and formulas, then save it to the product's assets using the 'save-artifact' tool with base64 encoding."
            }
        };

        this.successCount++;
        return analysis;
    }
}

export default MoneyRobot;