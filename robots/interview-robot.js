// Interview Robot - Stateful, one-question-at-a-time PM interview
//
// Design: Each call to `nextQuestion()` returns exactly ONE question.
// The caller passes back the user's answer, and the robot decides
// whether to skip ahead, dig deeper, or move to the next question.

class InterviewRobot {
    constructor() {
        this.name = "Interview Robot 🎤";
        this.job = "Gather product context before analysis";

        // Active interview sessions: sessionId -> InterviewState
        this.sessions = new Map();
    }

    // ── Question Bank ────────────────────────────────────────────────

    _buildQuestionBank() {
        return [
            // ── Market & Geography ──────────────────────────────
            {
                id: "target_geo",
                category: "Market & Geography",
                question:
                    "Is this for a global market or a specific geography?",
                why: "TAM/SAM/SOM and GTM strategy change entirely based on geo.",
                required: true,
                default: "Global",
                examples: ["Global", "US only", "India first, then SEA", "EU + UK"],
                coversIds: [],
                followUps: [
                    {
                        condition: "vague_or_global",
                        question:
                            "Any specific region to start with for launch? Starting everywhere is hard — where would you land first?",
                    },
                ],
            },
            {
                id: "market_segment",
                category: "Market & Geography",
                question:
                    "Which market segment are you targeting? B2B, B2C, or B2B2C?",
                why: "Drives pricing model, sales cycle, and distribution strategy.",
                required: true,
                default: "B2C",
                examples: ["B2B SaaS", "B2C mobile", "B2B2C platform"],
                coversIds: [],
                followUps: [],
            },
            {
                id: "market_size_known",
                category: "Market & Geography",
                question:
                    "Do you have an estimate of the market size, or should we research it?",
                why: "If the user already has data, we skip redundant analysis.",
                required: false,
                default: "Research it",
                examples: ["$50B globally per Gartner", "Research it", "Similar to Notion's market"],
                coversIds: [],
                followUps: [],
            },

            // ── Target Customer ─────────────────────────────────
            {
                id: "buyer_vs_user",
                category: "Target Customer",
                question:
                    "Who is the buyer and who is the end user? Are they the same person?",
                why: "In B2B, the buyer (VP of Eng) is often different from the user (developer).",
                required: true,
                default: "Same person",
                examples: [
                    "Same person — individual consumer",
                    "Buyer: HR director, User: employees",
                    "Buyer: parent, User: student",
                ],
                coversIds: [],
                followUps: [],
            },
            {
                id: "pain_point",
                category: "Target Customer",
                question:
                    "What is the #1 pain point this product solves? How do they solve it today?",
                why: "If there's no clear pain point, there's no product.",
                required: true,
                default: null,
                examples: [
                    "Manual data entry taking 4 hours/week — they use spreadsheets today",
                    "Students can't get 1:1 tutoring — they watch YouTube videos",
                ],
                coversIds: [],
                followUps: [
                    {
                        condition: "shallow",
                        question:
                            "Can you quantify the impact? How much time/money does this pain point cost them?",
                    },
                ],
            },
            {
                id: "willingness_to_pay",
                category: "Target Customer",
                question:
                    "What do you think users would pay for this? Or what do they pay for current solutions?",
                why: "Helps set pricing anchors and validates financial viability.",
                required: false,
                default: "Research competitor pricing",
                examples: ["$10-20/month", "Enterprise: $50k/year", "They pay $0 today (free tools)"],
                coversIds: [],
                followUps: [],
            },

            // ── Competition ─────────────────────────────────────
            {
                id: "known_competitors",
                category: "Competition",
                question:
                    "Do you know of any competitors? List names or websites.",
                why: "Direct competitor intel makes the detective robot's analysis sharper.",
                required: false,
                default: "Research competitors",
                examples: [
                    "Notion, Coda, Confluence",
                    "No direct competitors yet",
                    "Check producthunt.com for recent launches",
                ],
                coversIds: [],
                followUps: [
                    {
                        condition: "names_given",
                        question:
                            "What's the #1 thing they get wrong? Why would someone switch from them to you?",
                    },
                ],
            },
            {
                id: "why_existing_fail",
                category: "Competition",
                question:
                    "Why do existing solutions fail or fall short?",
                why: "This becomes the core differentiator and positioning statement.",
                required: true,
                default: null,
                examples: [
                    "Too complex for non-technical users",
                    "No mobile experience",
                    "Expensive for SMBs",
                ],
                coversIds: [],
                followUps: [],
            },

            // ── Business Model ──────────────────────────────────
            {
                id: "revenue_model",
                category: "Business Model",
                question:
                    "What revenue model are you considering? (subscription, freemium, marketplace, one-time, etc.)",
                why: "Determines unit economics, CAC targets, and growth strategy.",
                required: false,
                default: "Subscription (SaaS)",
                examples: ["Freemium with paid tiers", "Commission per transaction", "Enterprise licenses"],
                coversIds: ["willingness_to_pay"],
                followUps: [],
            },
            {
                id: "funding_stage",
                category: "Business Model",
                question:
                    "What stage is this at? (idea, pre-seed, seed, Series A, bootstrapped, side project)",
                why: "Shapes the roadmap ambition and financial assumptions.",
                required: false,
                default: "Idea stage",
                examples: ["Just an idea", "Pre-seed, raising $500k", "Bootstrapped with 100 users"],
                coversIds: [],
                followUps: [],
            },

            // ── Constraints ─────────────────────────────────────
            {
                id: "timeline",
                category: "Constraints & Resources",
                question:
                    "What is your target timeline for MVP launch?",
                why: "Constrains scope and phasing of the roadmap.",
                required: false,
                default: "3-6 months",
                examples: ["3 months", "Launch by Q3 2026", "No fixed deadline"],
                coversIds: [],
                followUps: [],
            },
            {
                id: "team_size",
                category: "Constraints & Resources",
                question:
                    "How big is the team? (or is this a solo founder?)",
                why: "Affects development velocity and phasing assumptions.",
                required: false,
                default: "Solo founder / small team",
                examples: ["Solo founder", "3 engineers + 1 designer", "Building the team"],
                coversIds: [],
                followUps: [],
            },
            {
                id: "tech_preferences",
                category: "Constraints & Resources",
                question:
                    "Any technology preferences or constraints? (mobile-first, web, AI/ML, etc.)",
                why: "Impacts feature feasibility and timeline.",
                required: false,
                default: "No constraints",
                examples: ["React Native mobile app", "Must use Python for ML backend", "Web-first"],
                coversIds: [],
                followUps: [],
            },

            // ── Sources ─────────────────────────────────────────
            {
                id: "reference_companies",
                category: "Reference Sources",
                question:
                    "Any companies or products you want us to specifically benchmark against?",
                why: "Grounds the analysis in real-world comparisons the user cares about.",
                required: false,
                default: "We'll find relevant benchmarks",
                examples: [
                    "Benchmark against Slack and Discord",
                    "Look at how Figma disrupted Adobe",
                    "Reference Duolingo's growth model",
                ],
                coversIds: ["known_competitors"],
                followUps: [],
            },
            {
                id: "data_sources",
                category: "Reference Sources",
                question:
                    "Any specific reports, websites, or data sources you want us to reference?",
                why: "Ensures analysis uses trusted sources.",
                required: false,
                default: "Use public data and industry reports",
                examples: [
                    "Gartner 2025 report on EdTech",
                    "Check Crunchbase for funding data",
                    "Use G2 reviews for competitor analysis",
                ],
                coversIds: [],
                followUps: [],
            },
        ];
    }

    // ── Session Management ───────────────────────────────────────────

    /**
     * Start a new interview session. Returns the first question.
     *
     * @param {string} rawIdea
     * @param {object} [opts]
     * @param {Record<string,string>} [opts.preFilledAnswers] - prior answers
     *        to seed the session with. Questions whose id is in this map are
     *        treated as already answered and will be skipped in the interview
     *        loop (though still surfaced in the final enrichedContext).
     * @param {string[]} [opts.preFilledSources] - informational list of the
     *        question ids that were pre-filled (surfaced to the caller so the
     *        UI can show "N questions reused from prior research").
     */
    startInterview(rawIdea, { preFilledAnswers = {}, preFilledSources = [] } = {}) {
        const sessionId = `interview-${Date.now()}`;
        const questions = this._buildQuestionBank();

        // Only keep answers whose question id is in the current question bank
        const validQuestionIds = new Set(questions.map(q => q.id));
        const seededAnswers = {};
        for (const [qid, value] of Object.entries(preFilledAnswers || {})) {
            if (validQuestionIds.has(qid) && value != null && String(value).trim() !== "") {
                seededAnswers[qid] = String(value);
            }
        }

        this.sessions.set(sessionId, {
            rawIdea,
            questions,
            answers: seededAnswers,
            currentIndex: 0,
            skippedIds: new Set(),
            askedFollowUp: false,
            pendingFollowUp: null,
            completed: false,
            reusedAnswerIds: Object.keys(seededAnswers),
            preFilledSources: preFilledSources.filter(id => seededAnswers[id]),
        });

        return this._buildNextResponse(sessionId);
    }

    /**
     * Process the user's answer and return the next question.
     * This is the core loop:
     *   1. Store the answer
     *   2. Analyse what the answer covers (may skip future questions)
     *   3. Decide if a follow-up is needed
     *   4. Return the next question (or completion)
     */
    processAnswer(sessionId, answer) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return { error: `Session ${sessionId} not found.` };
        }
        if (session.completed) {
            return this._buildCompletionResponse(session);
        }

        // ── Handle follow-up answer ─────────────────────────────
        if (session.pendingFollowUp) {
            const q = session.questions[session.currentIndex];
            // Merge follow-up answer into the main answer
            session.answers[q.id] =
                (session.answers[q.id] || "") + " | Follow-up: " + answer;
            session.pendingFollowUp = null;
            session.askedFollowUp = false;
            session.currentIndex++;
            return this._buildNextResponse(sessionId);
        }

        // ── Store answer for current question ───────────────────
        const currentQ = session.questions[session.currentIndex];
        session.answers[currentQ.id] = answer;

        // ── Analyse the answer ──────────────────────────────────
        const analysis = this._analyseAnswer(currentQ, answer, session);

        // If the answer also covers other questions, skip them
        for (const coveredId of analysis.coveredQuestionIds) {
            session.skippedIds.add(coveredId);
        }

        // Check if a follow-up is warranted
        if (analysis.needsFollowUp && currentQ.followUps?.length > 0) {
            const followUp = this._pickFollowUp(currentQ, analysis);
            if (followUp) {
                session.pendingFollowUp = followUp;
                session.askedFollowUp = true;
                return {
                    sessionId,
                    type: "follow_up",
                    followUpQuestion: followUp.question,
                    why: "Your answer could be more specific — this helps make the analysis sharper.",
                    originalQuestionId: currentQ.id,
                    progress: this._getProgress(session),
                    canSkip: true,
                    skipInstruction: "If the user says 'skip' or 'next', move on without the follow-up.",
                };
            }
        }

        // Move to next question
        session.currentIndex++;
        return this._buildNextResponse(sessionId);
    }

    /**
     * Skip the current question (use the default answer).
     */
    skipQuestion(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return { error: `Session ${sessionId} not found.` };

        if (session.pendingFollowUp) {
            session.pendingFollowUp = null;
            session.askedFollowUp = false;
            session.currentIndex++;
            return this._buildNextResponse(sessionId);
        }

        const currentQ = session.questions[session.currentIndex];
        if (currentQ.default) {
            session.answers[currentQ.id] = currentQ.default;
        }
        session.currentIndex++;
        return this._buildNextResponse(sessionId);
    }

    // ── Answer Analysis ──────────────────────────────────────────────

    _analyseAnswer(question, answer, session) {
        const lower = answer.toLowerCase().trim();
        const result = {
            coveredQuestionIds: [],
            needsFollowUp: false,
            followUpType: null,
        };

        // 1. Check if the answer is too short / vague
        if (lower.length < 10 && question.required) {
            result.needsFollowUp = true;
            result.followUpType = "shallow";
        }

        // 2. Check for keywords that cover OTHER questions
        const allQuestions = session.questions;
        for (const q of allQuestions) {
            if (q.id === question.id) continue;
            if (session.answers[q.id]) continue; // already answered
            if (session.skippedIds.has(q.id)) continue;
            if (session.questions.indexOf(q) < session.currentIndex) continue;

            // Check if the current answer mentions content relevant to future questions
            if (this._answerCoversQuestion(lower, q)) {
                result.coveredQuestionIds.push(q.id);
                session.answers[q.id] = `[Covered in ${question.id}] ${answer}`;
            }
        }

        // 3. Check the question's own coversIds (structural links)
        if (question.coversIds) {
            for (const covId of question.coversIds) {
                if (!session.answers[covId] && !session.skippedIds.has(covId)) {
                    // Only auto-cover if the answer is substantive
                    if (lower.length > 20) {
                        result.coveredQuestionIds.push(covId);
                        session.answers[covId] = `[Inferred from ${question.id}] ${answer}`;
                    }
                }
            }
        }

        // 4. Follow-up triggers
        if (question.id === "target_geo" && (lower === "global" || lower.includes("everywhere"))) {
            result.needsFollowUp = true;
            result.followUpType = "vague_or_global";
        }

        if (question.id === "known_competitors" && lower !== "no" && lower !== "none" && lower.length > 5) {
            result.needsFollowUp = true;
            result.followUpType = "names_given";
        }

        if (question.id === "pain_point" && lower.length < 50) {
            result.needsFollowUp = true;
            result.followUpType = "shallow";
        }

        return result;
    }

    /**
     * Heuristic: does the user's answer contain keywords relevant to a future question?
     */
    _answerCoversQuestion(answerLower, question) {
        const keywordMap = {
            target_geo: ["global", "us", "india", "europe", "asia", "region", "country", "geography"],
            market_segment: ["b2b", "b2c", "enterprise", "consumer", "saas"],
            buyer_vs_user: ["buyer", "user", "customer", "end user", "decision maker"],
            pain_point: ["problem", "pain", "struggle", "frustrat", "waste time"],
            willingness_to_pay: ["price", "pay", "cost", "subscription", "$/month", "per month", "freemium"],
            known_competitors: ["competitor", "compete", "rival", "alternative"],
            why_existing_fail: ["fail", "missing", "lack", "poor", "bad", "broken"],
            revenue_model: ["subscription", "freemium", "commission", "revenue", "monetiz"],
            funding_stage: ["seed", "series", "bootstrap", "raised", "funding", "pre-seed", "idea stage"],
            timeline: ["month", "quarter", "q1", "q2", "q3", "q4", "launch by", "deadline"],
            team_size: ["solo founder", "team of", "co-founder", "just me",
                "two founders", "building the team", "no team yet"],
            tech_preferences: ["react native", "next.js", "python backend", "mobile first",
                "web first", "must use", "built on", "llm integration",
                "genai", "ml model", "rest api", "graphql"],
            reference_companies: ["benchmark", "like uber", "like slack", "inspired by"],
            data_sources: ["gartner", "report", "crunchbase", "g2", "capterra"],
        };

        const keywords = keywordMap[question.id] || [];
        return keywords.some((kw) => answerLower.includes(kw));
    }

    _pickFollowUp(question, analysis) {
        if (!question.followUps || question.followUps.length === 0) return null;

        // Match by condition type
        const match = question.followUps.find(
            (fu) => fu.condition === analysis.followUpType
        );
        if (match) return match;

        // Fallback to the "shallow" follow-up, or first available
        return (
            question.followUps.find((fu) => fu.condition === "shallow") ||
            question.followUps[0]
        );
    }

    // ── Response Builders ────────────────────────────────────────────

    _buildNextResponse(sessionId) {
        const session = this.sessions.get(sessionId);

        // Find the next un-answered, un-skipped question
        while (session.currentIndex < session.questions.length) {
            const q = session.questions[session.currentIndex];
            if (session.skippedIds.has(q.id) || session.answers[q.id]) {
                session.currentIndex++;
                continue;
            }
            break;
        }

        // All questions done?
        if (session.currentIndex >= session.questions.length) {
            session.completed = true;
            return this._buildCompletionResponse(session);
        }

        const q = session.questions[session.currentIndex];
        const progress = this._getProgress(session);

        return {
            sessionId,
            type: "question",
            questionNumber: progress.answered + 1,
            totalRemaining: progress.remaining,
            category: q.category,
            question: q.question,
            questionId: q.id,
            why: q.why,
            required: q.required,
            default: q.default,
            examples: q.examples,
            progress,
            instructions:
                "Ask the user this ONE question. Wait for their answer. If they say 'skip', use the default. Then call this tool again with their answer.",
        };
    }

    _buildCompletionResponse(session) {
        const context = this._buildEnrichedContext(session);
        const reusedCount = (session.reusedAnswerIds || []).length;
        return {
            sessionId: null, // session complete
            type: "complete",
            message: reusedCount > 0
                ? `Interview complete! ${reusedCount} answers were reused from prior research. Use the enrichedContext below to call 'run-robot' for each robot.`
                : "Interview complete! Use the enrichedContext below to call 'run-robot' for each robot.",
            enrichedContext: context,
            answeredQuestions: Object.keys(session.answers).length,
            reusedAnswerIds: session.reusedAnswerIds || [],
            summary: context.summary,
        };
    }

    _buildEnrichedContext(session) {
        const answers = { ...session.answers };
        // Clean up [Covered in...] prefixes for the summary
        for (const [k, v] of Object.entries(answers)) {
            if (typeof v === "string" && v.startsWith("[")) {
                answers[k] = v.replace(/^\[.*?\]\s*/, "");
            }
        }

        const parts = [`Product: ${session.rawIdea}`];
        if (answers.target_geo) parts.push(`Geography: ${answers.target_geo}`);
        if (answers.market_segment) parts.push(`Segment: ${answers.market_segment}`);
        if (answers.pain_point) parts.push(`Core problem: ${answers.pain_point}`);
        if (answers.known_competitors) parts.push(`Competitors: ${answers.known_competitors}`);
        if (answers.revenue_model) parts.push(`Revenue model: ${answers.revenue_model}`);
        if (answers.timeline) parts.push(`Timeline: ${answers.timeline}`);

        return {
            productIdea: session.rawIdea,
            answers,
            generatedAt: new Date().toISOString(),
            summary: parts.join(" | "),
            brandTerms: this._extractBrandTerms(session.rawIdea),

            // Pre-packaged context hints for each robot
            robotHints: {
                scout: {
                    searchPriority: this._deriveSearchPriority(answers),
                    marketSizeKnown: !/^research/i.test(answers.market_size_known || ""),
                    knownMarketData: answers.market_size_known || null,
                },
                detective: {
                    knownCompetitors: this._extractCompetitorList(answers.known_competitors),
                    differentiators: answers.why_existing_fail || null,
                    benchmarkRequests: answers.reference_companies || null,
                },
                people: {
                    segmentCount: this._countSegments(answers.market_segment),
                    buyerUserSplit: answers.buyer_vs_user || null,
                    painPoint: answers.pain_point || null,
                },
                money: {
                    pricingData: answers.willingness_to_pay || null,
                    revenueModel: answers.revenue_model || null,
                    stage: answers.funding_stage || null,
                },
                plan: {
                    timeline: answers.timeline || "3-6 months",
                    teamSize: answers.team_size || "Solo/small",
                    techConstraints: answers.tech_preferences || null,
                }
            }
        };
    }

    _extractCompetitorList(competitorAnswer) {
        if (!competitorAnswer) return [];
        const cleaned = competitorAnswer.split("|")[0].trim();
        return cleaned
            .split(/,|;|\n/)
            .map(c => c.replace(/\[.*?\]/g, "").trim())
            .filter(c => c.length > 2 && !c.toLowerCase().startsWith("research"));
    }

    _countSegments(segmentAnswer) {
        if (!segmentAnswer) return 1;
        const lower = segmentAnswer.toLowerCase();
        let count = 0;
        if (lower.includes("b2c")) count++;
        if (lower.includes("b2b") && !lower.includes("b2b2c")) count++;
        if (lower.includes("b2b2c")) count += 2; // counts as 2 segments
        return Math.max(count, 1);
    }

    _deriveSearchPriority(answers) {
        // What should Scout search for first, based on what we know
        const geo = answers.target_geo || "global";
        const segment = answers.market_segment || "";
        return {
            geo: geo.split(",")[0].trim(),
            segment: segment.includes("B2C") ? "consumer" : segment.includes("B2B") ? "enterprise" : "mixed",
            hasCompetitors: !!(answers.known_competitors && answers.known_competitors.length > 10),
        };
    }

    _extractBrandTerms(rawIdea) {
        // Take the first 1-3 words of the raw idea — almost always the product/company name
        // e.g. "XpertIN AI is a career..." → ["xpertin", "ai"]
        // e.g. "Notion is a productivity..." → ["notion"]
        // e.g. "A career counselling platform..." → [] (no brand, starts with article)
        const words = rawIdea.split(/\s+/).slice(0, 3);
        return words
            .filter(w => w.length > 2)
            .filter(w => /^[A-Z]/.test(w))        // starts with capital
            .filter(w => !/^(A|An|The|This|We|Our|I)$/.test(w)) // not articles/pronouns
            .map(w => w.replace(/[^a-zA-Z0-9]/g, "").toLowerCase());
    }

    _getProgress(session) {
        const total = session.questions.length;
        const answered = Object.keys(session.answers).length;
        const skipped = session.skippedIds.size;
        const remaining = total - session.currentIndex;
        // Some remaining questions may already be covered
        let effectiveRemaining = 0;
        for (let i = session.currentIndex; i < total; i++) {
            const q = session.questions[i];
            if (!session.answers[q.id] && !session.skippedIds.has(q.id)) {
                effectiveRemaining++;
            }
        }
        return {
            answered,
            skipped,
            remaining: effectiveRemaining,
            total,
            percentComplete: Math.round(((answered + skipped) / total) * 100),
        };
    }
}

export default InterviewRobot;
