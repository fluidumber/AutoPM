import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import TeamLeader, { ROBOT_ORDER } from "../leader/team-leader.js";
import { generatePresentation } from "../utils/presentation-generator.js";

// Redirect console.log to stderr — MCP uses stdio for JSON-RPC
console.log = (...args) => process.stderr.write(args.join(" ") + "\n");

// ── Bootstrap ────────────────────────────────────────────────────────
const teamLeader = new TeamLeader();

const server = new McpServer({
    name: "productflow",
    version: "2.0.0",
});

// ═════════════════════════════════════════════════════════════════════
// Tool 1: INTERVIEW — get PM questions for context gathering
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "interview",
    `Interactive PM-style interview — ONE question at a time.

FIRST CALL: Pass only 'businessIdea' to start the interview. Returns the first question.
SUBSEQUENT CALLS: Pass 'interviewSessionId' + 'answer' (the user's reply). Returns the next question.
SKIP: Pass 'interviewSessionId' + 'action' = 'skip' to use the default answer.

The interview robot ANALYSES each answer:
- If the answer covers a future question, that question is AUTO-SKIPPED
- If the answer is too vague/shallow, a FOLLOW-UP question is asked
- Progress dynamically updates as questions are skipped or covered

When all questions are done, returns type="complete" with the enriched context to pass to 'run-robot'.

WORKFLOW:
1. Call with just businessIdea → get first question
2. Show the question to the user, wait for their reply
3. Call again with interviewSessionId + answer → get next question
4. Repeat until type="complete"
5. Use the enrichedContext from the completion response to call 'run-robot'`,
    {
        businessIdea: z
            .string()
            .optional()
            .describe("The raw business idea. Required on FIRST call only."),
        interviewSessionId: z
            .string()
            .optional()
            .describe(
                "Session ID returned from previous call. Required on SUBSEQUENT calls."
            ),
        answer: z
            .string()
            .optional()
            .describe("The user's answer to the current question."),
        action: z
            .enum(["answer", "skip"])
            .optional()
            .describe(
                "Set to 'skip' to use the default answer and move on. Defaults to 'answer'."
            ),
    },
    async ({ businessIdea, interviewSessionId, answer, action }) => {
        let result;

        if (!interviewSessionId && businessIdea) {
            // First call — start interview
            result = teamLeader.startInterview(businessIdea);
        } else if (interviewSessionId && action === "skip") {
            // Skip current question
            result = teamLeader.skipInterviewQuestion(interviewSessionId);
        } else if (interviewSessionId && answer) {
            // Process answer
            result = teamLeader.answerInterviewQuestion(
                interviewSessionId,
                answer
            );
        } else {
            result = {
                error: "Provide either 'businessIdea' to start, or 'interviewSessionId' + 'answer' to continue.",
            };
        }

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 2: RUN-ROBOT — run one robot at a time
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "run-robot",
    `Run a SINGLE analysis robot and return its results. Call this one robot at a time so the user can review and give feedback before moving to the next.

Available robots (in recommended order):
1. scout     — Market demand (TAM/SAM/SOM, growth, demand signals)
2. detective — Competitive landscape (competitors, gaps, moat)
3. people    — User personas (segments, pain points, behaviors)
4. money     — Financial projections (unit economics, revenue models)
5. feature   — Feature breakdown (must-have, nice-to-have, future)
6. plan      — Product roadmap (phased 12-18 month plan)
7. priority  — Feature prioritization (RICE scoring)

IMPORTANT: After showing the user this robot's output, ask them to rate it 1-5 and suggest improvements. Then call the 'feedback' tool before running the next robot.`,
    {
        analysisId: z
            .string()
            .optional()
            .describe(
                "Analysis session ID. If not provided, a new session is created automatically."
            ),
        robotName: z
            .enum(["scout", "detective", "people", "money", "feature", "plan", "priority"])
            .describe("Which robot to run"),
        enrichedContext: z
            .string()
            .describe(
                "JSON string of enriched context from user interview answers. Must include at minimum: {\"productIdea\": \"...\", \"answers\": {...}, \"summary\": \"...\"}"
            ),
    },
    async ({ analysisId, robotName, enrichedContext }) => {
        // Parse context
        let context;
        try {
            context = JSON.parse(enrichedContext);
        } catch {
            context = {
                productIdea: enrichedContext,
                answers: {},
                summary: enrichedContext,
            };
        }

        // Start or reuse session
        let sessionId = analysisId;
        if (!sessionId) {
            sessionId = teamLeader.startAnalysis(context);
        } else if (!teamLeader.sessions.has(sessionId)) {
            // Re-create session if not found (server may have restarted)
            sessionId = teamLeader.startAnalysis(context);
        }

        // Run the robot
        const result = await teamLeader.runSingleRobot(sessionId, robotName);

        // Get session state
        const state = teamLeader.getAnalysisState(sessionId);

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(
                        {
                            analysisId: sessionId,
                            robotName,
                            result,
                            progress: {
                                completed: state.completedRobots,
                                remaining: state.remainingRobots,
                                nextRobot: teamLeader.getNextRobot(sessionId),
                            },
                        },
                        null,
                        2
                    ),
                },
            ],
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 3: FEEDBACK — capture user rating for a robot's output
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "feedback",
    `Save user feedback for a robot's analysis output. Call this after showing the user each robot's results and asking them to rate it.

The feedback is stored and used to improve future analyses:
- Ratings 4-5: recorded as successful patterns
- Ratings 1-3: recorded as areas to improve

The learning engine will show improvement hints to robots on future runs.`,
    {
        analysisId: z.string().describe("The analysis session ID"),
        robotName: z
            .enum(["scout", "detective", "people", "money", "feature", "plan", "priority"])
            .describe("Which robot to rate"),
        rating: z
            .number()
            .min(1)
            .max(5)
            .describe("User rating 1-5 (1=poor, 5=excellent)"),
        notes: z
            .string()
            .optional()
            .describe(
                "User's improvement suggestions or comments, e.g. 'Add more specific TAM numbers' or 'Great competitive analysis'"
            ),
    },
    async ({ analysisId, robotName, rating, notes }) => {
        await teamLeader.saveFeedback(
            analysisId,
            robotName,
            rating,
            notes || ""
        );

        const nextRobot = teamLeader.getNextRobot(analysisId);

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        saved: true,
                        robotName,
                        rating,
                        notes: notes || "",
                        nextRobot,
                        message: nextRobot
                            ? `Feedback saved! Next up: ${nextRobot} robot.`
                            : "Feedback saved! All robots are done. Call 'generate-presentation' to create the final deliverable.",
                    }),
                },
            ],
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 4: GENERATE-PRESENTATION — prompt Claude to build HTML
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "generate-presentation",
    `Begin the presentation generation process.
This tool does NOT immediately create the file! 
If the user's design preferences (logo, fonts, theme) are missing from the database, this tool returns an instruction telling you to ask the user for them.
If the preferences exist, it returns all the analysis data + design preferences + instructions on how YOU (Claude) should generate the final HTML code.`,
    {
        analysisId: z
            .string()
            .describe("The analysis session ID to generate a presentation for"),
    },
    async ({ analysisId }) => {
        const data = teamLeader.getFullResults(analysisId);
        if (!data) {
            return {
                content: [{ type: "text", text: `Analysis session '${analysisId}' not found.` }],
            };
        }

        const prefs = teamLeader.database.getDesignPreferences();
        
        if (!prefs) {
            return {
                content: [{ type: "text", text: JSON.stringify({
                    actionRequired: "ask_user_for_preferences",
                    instructions: "The user has not set their presentation design preferences. Ask them for their preferred logo URL (or skip if none), font families, primary/accent colors, and overall visual theme (e.g., dark mode, corporate, playful). Wait for their reply, then call 'save-design-preferences'. Afterward, call 'generate-presentation' again."
                }, null, 2) }]
            };
        }

        // Also save analysis data to DB like the old flow
        await teamLeader.database.saveAnalysis(data.productIdea, data.results);

        const prompt = {
            _claudeInstructions: {
                role: "You are a world-class Web Designer and Presentation expert.",
                mandate: [
                    "You are generating the final deliverable. Output a completely self-contained HTML document with inline CSS.",
                    "Use the design preferences provided to style the presentation (fonts, colors, theme, logo).",
                    "Do NOT use markdown outside of the final file. Just return the raw HTML file or use a markdown codeblock.",
                    "Take all the analysis data provided and format it into a stunning, responsive, web-based presentation.",
                    "Include a title slide, one gorgeous slide for each robot's output, and a final summary slide.",
                    "Once you have generated the HTML, call the 'save-presentation-file' tool to write it to disk."
                ]
            },
            designPreferences: prefs,
            analysisData: data
        };

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(prompt, null, 2),
                },
            ],
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 4.1: SAVE-DESIGN-PREFERENCES
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "save-design-preferences",
    "Save the user's presentation design preferences to the database.",
    {
        themeStyle: z.string().describe("e.g. 'Dark and Modern', 'Corporate Minimalist', 'Playful'"),
        primaryColor: z.string().describe("e.g. '#6c63ff', 'blue', etc."),
        fontFamily: z.string().describe("e.g. 'Inter', 'Roboto', 'serif'"),
        logoUrl: z.string().optional().describe("URL to a logo image, if provided"),
    },
    async ({ themeStyle, primaryColor, fontFamily, logoUrl }) => {
        const prefs = { themeStyle, primaryColor, fontFamily, logoUrl };
        await teamLeader.database.saveDesignPreferences(prefs);
        return {
            content: [{ type: "text", text: `Design preferences saved successfully! Now call generate-presentation.` }]
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 4.2: SAVE-PRESENTATION-FILE
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "save-presentation-file",
    "Save the raw HTML string generated by Claude into an actual HTML file in the plans directory.",
    {
        filename: z.string().describe("The name of the file, e.g. 'my-product-presentation.html'"),
        htmlContent: z.string().describe("The full HTML source code for the presentation"),
    },
    async ({ filename, htmlContent }) => {
        const fs = await import("fs/promises");
        const path = await import("path");
        const PLANS_DIR = "./plans";
        await fs.mkdir(PLANS_DIR, { recursive: true });
        
        const safeName = filename.endsWith(".html") ? filename : `${filename}.html`;
        const filepath = path.join(PLANS_DIR, safeName);
        
        await fs.writeFile(filepath, htmlContent, "utf-8");
        return {
            content: [{ type: "text", text: `Success! Presentation beautifully rendered and saved to ${filepath}` }]
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 5: ROBOTS-LIST — list available robots
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "robots-list",
    "List all available ProductFlow analysis robots, their capabilities, and average user ratings from past feedback.",
    {},
    async () => {
        const robots = [
            { name: "Scout Robot", key: "scout", type: "market-demand", description: "Analyzes market demand and size (TAM/SAM/SOM)" },
            { name: "Detective Robot", key: "detective", type: "competitive-analysis", description: "Analyzes competitors, market gaps, and competitive moat" },
            { name: "People Robot", key: "people", type: "personas", description: "Creates detailed user personas with pain points and motivations" },
            { name: "Money Robot", key: "money", type: "financial", description: "Calculates financial projections and unit economics" },
            { name: "Feature Robot", key: "feature", type: "features", description: "Generates prioritized feature list (must-have, nice-to-have, future)" },
            { name: "Plan Robot", key: "plan", type: "roadmap", description: "Creates phased product roadmap (12-18 months)" },
            { name: "Priority Robot", key: "priority", type: "prioritization", description: "Prioritizes features using RICE scoring" },
        ];

        // Add average ratings from past feedback
        for (const robot of robots) {
            robot.averageRating = teamLeader.database.getRobotAverageRating(robot.key);
        }

        return {
            content: [
                { type: "text", text: JSON.stringify({ robots }, null, 2) },
            ],
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 6: HISTORY — past analyses
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "history",
    "Retrieve the history of past product analyses stored in the brain database.",
    {},
    async () => {
        const analyses = teamLeader.database.getAllAnalyses();
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(
                        { total: analyses.length, recent: analyses.slice(-5) },
                        null,
                        2
                    ),
                },
            ],
        };
    }
);

// ═════════════════════════════════════════════════════════════════════
// Tool 7: RESET — clear all data
// ═════════════════════════════════════════════════════════════════════
server.tool(
    "reset",
    "Clear all saved analysis data and feedback from the brain database.",
    {},
    async () => {
        await teamLeader.database.clearAll();
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: "All data and feedback cleared.",
                    }),
                },
            ],
        };
    }
);

// ── Start ────────────────────────────────────────────────────────────
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("🚀 ProductFlow MCP Server v2.0 running on stdio");
}

main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
});