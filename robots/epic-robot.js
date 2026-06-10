// epic-robot.js — Breaks hypothesis into distinct Epics
class EpicRobot {
    constructor() {
        this.name = "Epic Robot ⛰️";
        this.job = "Epic breakdown — distinct functional streams with clear business goals and customer value";
        this.successCount = 0;
    }

    async analyze(enrichedContext) {
        process.stderr.write(`\n${this.name}: Preparing epic breakdown prompt...\n`);

        const context = typeof enrichedContext === "string"
            ? JSON.parse(enrichedContext)
            : enrichedContext;

        const analysis = {
            productIdea: context.productIdea || context.summary,

            _claudeInstructions: {
                role: `You are Epic, a Principal Product Manager who thinks in broad, high-impact functional streams. Your job is to take a product hypothesis and break it down into 3 to 6 distinct Epics. Epics are large bodies of work that deliver a complete, testable slice of customer value and a measurable business outcome.`,

                mandate: [
                    "Generate 3-6 distinct Epics that collectively deliver the core product hypothesis.",
                    "Each Epic must have a clear title, a description of the functionality it encapsulates, the primary business goal, and the core customer value.",
                    "An Epic is NOT a single feature. It is a functional stream (e.g., 'Self-Serve Onboarding', 'Core Data Ingestion Engine', 'Enterprise RBAC & Security').",
                    "Do NOT break down into granular user stories or individual features — that is the job of the downstream 'feature' robot.",
                    "Epics should be mutually exclusive and collectively exhaustive (MECE) regarding the core hypothesis.",
                    "Order the Epics logically by what needs to be validated or built first.",
                    "CRITICAL: The final output MUST contain a valid JSON code block (```json) with the epics array. The system will fail if this JSON block is missing."
                ],

                requiredSections: {
                    epicsList: {
                        instructions: `The list of Epics required to deliver the product hypothesis. You MUST output this as a valid JSON code block (\`\`\`json ... \`\`\`) containing an array of epic objects.`,
                        epicStructure: {
                            id: "A short, URL-safe slug for the epic (e.g., epic-core-onboarding)",
                            name: "Clear, descriptive title",
                            description: "2-3 sentences explaining the functional boundary of this Epic",
                            businessGoal: "What business metric or goal does this Epic move?",
                            customerValue: "What value does the user get once this is complete?",
                            targetPersonas: "Which personas benefit from this Epic?",
                            dependencies: "Any other Epics that must precede this one"
                        }
                    },
                    hypothesisAlignment: {
                        instructions: "A brief check: how do these Epics collectively validate the core product hypothesis?",
                        output: "A short paragraph explaining the alignment."
                    }
                }
            },

            productContext: {
                idea: context.productIdea,
                painPoint: context.answers?.pain_point || "",
                differentiation: context.answers?.why_existing_fail || "",
                segments: context.answers?.market_segment || "",
                timeline: context.answers?.timeline || "",
                fullSummary: context.summary
            },

            outputFormat: {
                style: "Structured list of Epics",
                tables: "Include a summary table: Epic Name | Business Goal | Customer Value | Dependencies",
                json: "You MUST include a ```json block with the full epicsList array matching the requested structure.",
                length: "Concise and strategic. Focus on boundaries and goals, not implementation details."
            }
        };

        this.successCount++;
        return analysis;
    }
}

export default EpicRobot;
